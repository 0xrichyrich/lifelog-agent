//
//  HealthKitService.swift
//  LifeLog
//
//  Apple Health integration - Read step count, sleep data for automatic logging
//

import Foundation
import HealthKit

@MainActor
final class HealthKitService: ObservableObject {
    private let healthStore = HKHealthStore()
    
    @Published var isAuthorized = false
    @Published var todaySteps: Int = 0
    @Published var todaySleepHours: Double = 0
    @Published var todayActiveMinutes: Int = 0
    @Published var lastSyncDate: Date?
    
    // Types we want to read
    private let readTypes: Set<HKObjectType> = {
        var types: Set<HKObjectType> = []
        
        if let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) {
            types.insert(stepType)
        }
        if let sleepType = HKCategoryType.categoryType(forIdentifier: .sleepAnalysis) {
            types.insert(sleepType)
        }
        if let activeEnergyType = HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned) {
            types.insert(activeEnergyType)
        }
        if let exerciseTimeType = HKQuantityType.quantityType(forIdentifier: .appleExerciseTime) {
            types.insert(exerciseTimeType)
        }
        if let standTimeType = HKQuantityType.quantityType(forIdentifier: .appleStandTime) {
            types.insert(standTimeType)
        }
        
        return types
    }()
    
    var isHealthKitAvailable: Bool {
        HKHealthStore.isHealthDataAvailable()
    }
    
    // MARK: - Authorization
    
    func requestAuthorization() async throws {
        guard isHealthKitAvailable else {
            throw HealthKitError.notAvailable
        }
        
        // Always request authorization - iOS will show the dialog if needed
        // Note: For read-only access, iOS doesn't report denial status for privacy
        try await healthStore.requestAuthorization(toShare: [], read: readTypes)
        
        // After requesting, try to fetch data to verify access works
        // If user granted at least some access, this will succeed
        isAuthorized = true
    }
    
    func checkAuthorizationStatus() {
        guard isHealthKitAvailable else {
            isAuthorized = false
            return
        }
        
        // For read-only HealthKit access, authorizationStatus only tells us about WRITE permissions
        // iOS intentionally hides read permission status for privacy (so apps can't tell if user denied)
        // We check UserDefaults to remember if user previously completed authorization flow
        isAuthorized = UserDefaults.standard.bool(forKey: "healthKitAuthorizationCompleted")
    }
    
    func markAuthorizationCompleted() {
        UserDefaults.standard.set(true, forKey: "healthKitAuthorizationCompleted")
        isAuthorized = true
    }
    
    // MARK: - Fetch Data
    
    func fetchTodayData() async throws {
        async let steps = fetchTodaySteps()
        async let sleep = fetchLastNightSleep()
        async let exercise = fetchTodayExerciseMinutes()
        
        let (stepsResult, sleepResult, exerciseResult) = try await (steps, sleep, exercise)
        
        todaySteps = stepsResult
        todaySleepHours = sleepResult
        todayActiveMinutes = exerciseResult
        lastSyncDate = Date()
        
        // Save to shared defaults for widgets
        saveToSharedDefaults()
    }
    
    // MARK: - Steps
    
    func fetchTodaySteps() async throws -> Int {
        guard let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) else {
            throw HealthKitError.typeNotAvailable
        }
        
        let now = Date()
        let startOfDay = Calendar.current.startOfDay(for: now)
        let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: now, options: .strictStartDate)
        
        return try await withCheckedThrowingContinuation { continuation in
            let query = HKStatisticsQuery(
                quantityType: stepType,
                quantitySamplePredicate: predicate,
                options: .cumulativeSum
            ) { _, result, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                
                let steps = result?.sumQuantity()?.doubleValue(for: .count()) ?? 0
                continuation.resume(returning: Int(steps))
            }
            
            healthStore.execute(query)
        }
    }
    
    // MARK: - Sleep
    
    func fetchLastNightSleep() async throws -> Double {
        guard let sleepType = HKCategoryType.categoryType(forIdentifier: .sleepAnalysis) else {
            throw HealthKitError.typeNotAvailable
        }
        
        let now = Date()
        let startOfYesterday = Calendar.current.date(byAdding: .day, value: -1, to: Calendar.current.startOfDay(for: now))!
        let predicate = HKQuery.predicateForSamples(withStart: startOfYesterday, end: now, options: .strictStartDate)
        
        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: sleepType,
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)]
            ) { _, samples, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                
                guard let sleepSamples = samples as? [HKCategorySample] else {
                    continuation.resume(returning: 0)
                    return
                }
                
                // Calculate total sleep time (in bed + asleep)
                var totalSeconds: Double = 0
                for sample in sleepSamples {
                    let value = sample.value
                    // Include asleep stages (0 = inBed, 1 = asleepUnspecified, 2-4 = asleep stages)
                    if value >= 1 {
                        totalSeconds += sample.endDate.timeIntervalSince(sample.startDate)
                    }
                }
                
                let hours = totalSeconds / 3600
                continuation.resume(returning: hours)
            }
            
            healthStore.execute(query)
        }
    }
    
    // MARK: - Exercise
    
    func fetchTodayExerciseMinutes() async throws -> Int {
        guard let exerciseType = HKQuantityType.quantityType(forIdentifier: .appleExerciseTime) else {
            throw HealthKitError.typeNotAvailable
        }
        
        let now = Date()
        let startOfDay = Calendar.current.startOfDay(for: now)
        let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: now, options: .strictStartDate)
        
        return try await withCheckedThrowingContinuation { continuation in
            let query = HKStatisticsQuery(
                quantityType: exerciseType,
                quantitySamplePredicate: predicate,
                options: .cumulativeSum
            ) { _, result, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                
                let minutes = result?.sumQuantity()?.doubleValue(for: .minute()) ?? 0
                continuation.resume(returning: Int(minutes))
            }
            
            healthStore.execute(query)
        }
    }
    
    // MARK: - Shared Defaults
    
    private func saveToSharedDefaults() {
        let defaults = UserDefaults(suiteName: "group.com.skynet.lifelog")
        defaults?.set(todaySteps, forKey: "healthSteps")
        defaults?.set(todaySleepHours, forKey: "healthSleep")
        defaults?.set(todayActiveMinutes, forKey: "healthExercise")
        defaults?.set(Date().timeIntervalSince1970, forKey: "healthLastSync")
    }
    
    // MARK: - Generate Activity Suggestion
    
    func generateActivitySuggestion() -> String? {
        // Suggest activities based on health data
        if todaySteps < 2000 && Calendar.current.component(.hour, from: Date()) > 12 {
            return "You've taken \(todaySteps) steps today. Consider a short walk?"
        }
        
        if todaySleepHours < 6 {
            return "You slept \(String(format: "%.1f", todaySleepHours))h last night. Maybe take it easy today?"
        }
        
        if todayActiveMinutes >= 30 {
            return "Great job! \(todayActiveMinutes) minutes of activity today! 💪"
        }
        
        return nil
    }
}

// MARK: - Errors

enum HealthKitError: LocalizedError {
    case notAvailable
    case typeNotAvailable
    case notAuthorized
    
    var errorDescription: String? {
        switch self {
        case .notAvailable:
            return "HealthKit is not available on this device"
        case .typeNotAvailable:
            return "The requested health data type is not available"
        case .notAuthorized:
            return "Health data access not authorized"
        }
    }
}

// MARK: - Health Data Summary
struct HealthDataSummary: Identifiable {
    let id = UUID()
    let steps: Int
    let sleepHours: Double
    let activeMinutes: Int
    let syncDate: Date
    
    var stepsGoalProgress: Double {
        min(Double(steps) / 10000, 1.0) // 10k steps goal
    }
    
    var sleepGoalProgress: Double {
        min(sleepHours / 8.0, 1.0) // 8h sleep goal
    }
    
    var exerciseGoalProgress: Double {
        min(Double(activeMinutes) / 30.0, 1.0) // 30min exercise goal
    }
}
