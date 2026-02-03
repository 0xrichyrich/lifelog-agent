//
//  OutdoorActivityService.swift
//  LifeLog
//
//  Detects outdoor activity using GPS, motion, and Health data
//  Celebrates "touching grass" with streaks and positive reinforcement
//

import Foundation
import CoreLocation
import CoreMotion
import HealthKit
import SwiftUI

@MainActor
final class OutdoorActivityService: NSObject, ObservableObject {
    static let shared = OutdoorActivityService()
    
    @Published var todayStats: OutdoorStats = OutdoorStats()
    @Published var currentSession: OutdoorSession?
    @Published var isOutdoorNow: Bool = false
    @Published var lastLocation: CLLocation?
    @Published var isAuthorized: Bool = false
    
    private let locationManager = CLLocationManager()
    private let motionManager = CMMotionActivityManager()
    private let healthStore = HKHealthStore()
    private let defaults = UserDefaults(suiteName: AppState.appGroup)
    
    private var sessionStartTime: Date?
    
    override private init() {
        super.init()
        locationManager.delegate = self
        loadCachedStats()
    }
    
    // MARK: - Authorization
    
    func requestAuthorization() async {
        // Location authorization
        locationManager.requestWhenInUseAuthorization()
        
        // Motion authorization is automatic on first use
        
        // HealthKit authorization for workouts
        if HKHealthStore.isHealthDataAvailable() {
            let workoutType = HKObjectType.workoutType()
            let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount)!
            
            try? await healthStore.requestAuthorization(
                toShare: [],
                read: [workoutType, stepType]
            )
        }
        
        isAuthorized = true
    }
    
    // MARK: - Outdoor Detection
    
    func startMonitoring() {
        // Significant location changes (battery efficient)
        locationManager.startMonitoringSignificantLocationChanges()
        
        // Motion activity for walking/running detection
        if CMMotionActivityManager.isActivityAvailable() {
            startMotionUpdates()
        }
    }
    
    func stopMonitoring() {
        locationManager.stopMonitoringSignificantLocationChanges()
        motionManager.stopActivityUpdates()
    }
    
    private func startMotionUpdates() {
        motionManager.startActivityUpdates(to: .main) { [weak self] activity in
            guard let activity = activity, let self = self else { return }
            
            Task { @MainActor in
                self.handleMotionActivity(activity)
            }
        }
    }
    
    private func handleMotionActivity(_ activity: CMMotionActivity) {
        let isActive = activity.walking || activity.running || activity.cycling
        
        if isActive && !isOutdoorNow {
            // Potential outdoor activity started
            startOutdoorSession(type: activityTypeFrom(activity))
        } else if !isActive && isOutdoorNow {
            // Activity stopped - check if session should end
            if let start = sessionStartTime,
               Date().timeIntervalSince(start) > 60 { // At least 1 min
                endOutdoorSession()
            }
        }
    }
    
    private func activityTypeFrom(_ activity: CMMotionActivity) -> OutdoorActivityType {
        if activity.running { return .running }
        if activity.cycling { return .cycling }
        if activity.walking { return .walking }
        return .generalOutdoor
    }
    
    // MARK: - Session Management
    
    func startOutdoorSession(type: OutdoorActivityType = .generalOutdoor) {
        sessionStartTime = Date()
        isOutdoorNow = true
        
        currentSession = OutdoorSession(
            startTime: Date(),
            activityType: type,
            locationDescription: nil
        )
        
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }
    
    func endOutdoorSession() {
        guard let startTime = sessionStartTime else { return }
        
        let duration = Int(Date().timeIntervalSince(startTime) / 60)
        
        // Only count sessions > 10 minutes
        if duration >= 10 {
            let session = OutdoorSession(
                startTime: startTime,
                endTime: Date(),
                durationMinutes: duration,
                activityType: currentSession?.activityType ?? .generalOutdoor,
                locationDescription: lastLocation != nil ? "Near current location" : nil
            )
            
            // Update stats
            var updatedStats = todayStats
            updatedStats = OutdoorStats(
                todayMinutes: todayStats.todayMinutes + duration,
                weekMinutes: todayStats.weekMinutes + duration,
                streakDays: calculateStreak(),
                lastOutdoorDate: Date(),
                sessions: todayStats.sessions + [session]
            )
            
            todayStats = updatedStats
            saveStats()
            syncToSharedDefaults()
            
            // Haptic for completion
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        }
        
        currentSession = nil
        sessionStartTime = nil
        isOutdoorNow = false
    }
    
    // MARK: - Manual Logging
    
    func logOutdoorTime(minutes: Int, type: OutdoorActivityType = .generalOutdoor) {
        let session = OutdoorSession(
            startTime: Date().addingTimeInterval(-Double(minutes * 60)),
            endTime: Date(),
            durationMinutes: minutes,
            activityType: type
        )
        
        todayStats = OutdoorStats(
            todayMinutes: todayStats.todayMinutes + minutes,
            weekMinutes: todayStats.weekMinutes + minutes,
            streakDays: calculateStreak(),
            lastOutdoorDate: Date(),
            sessions: todayStats.sessions + [session]
        )
        
        saveStats()
        syncToSharedDefaults()
        
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }
    
    // MARK: - Health Data Integration
    
    func fetchTodayFromHealth() async {
        guard HKHealthStore.isHealthDataAvailable() else { return }
        
        // Fetch workouts
        let workoutType = HKObjectType.workoutType()
        let today = Calendar.current.startOfDay(for: Date())
        let predicate = HKQuery.predicateForSamples(withStart: today, end: Date())
        
        do {
            let workouts = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<[HKWorkout], Error>) in
                let query = HKSampleQuery(
                    sampleType: workoutType,
                    predicate: predicate,
                    limit: HKObjectQueryNoLimit,
                    sortDescriptors: nil
                ) { _, samples, error in
                    if let error = error {
                        continuation.resume(throwing: error)
                    } else {
                        continuation.resume(returning: samples as? [HKWorkout] ?? [])
                    }
                }
                healthStore.execute(query)
            }
            
            // Convert outdoor workouts to our format
            let outdoorTypes: Set<HKWorkoutActivityType> = [
                .walking, .running, .cycling, .hiking,
                .crossCountrySkiing, .snowboarding, .skatingSports
            ]
            
            var totalOutdoorMinutes = 0
            
            for workout in workouts {
                if outdoorTypes.contains(workout.workoutActivityType) {
                    totalOutdoorMinutes += Int(workout.duration / 60)
                }
            }
            
            // Update stats if Health has more data
            if totalOutdoorMinutes > todayStats.todayMinutes {
                todayStats = OutdoorStats(
                    todayMinutes: totalOutdoorMinutes,
                    weekMinutes: todayStats.weekMinutes + (totalOutdoorMinutes - todayStats.todayMinutes),
                    streakDays: calculateStreak(),
                    lastOutdoorDate: Date(),
                    sessions: todayStats.sessions
                )
                saveStats()
                syncToSharedDefaults()
            }
            
        } catch {
            print("Failed to fetch Health workouts: \(error)")
        }
    }
    
    // MARK: - Streak Calculation
    
    private func calculateStreak() -> Int {
        guard let lastDate = todayStats.lastOutdoorDate else {
            return todayStats.todayMinutes >= 30 ? 1 : 0
        }
        
        let calendar = Calendar.current
        
        // Check if last outdoor was yesterday or today
        if calendar.isDateInToday(lastDate) {
            return todayStats.streakDays
        } else if calendar.isDateInYesterday(lastDate) {
            // Continuing streak
            return todayStats.todayMinutes >= 30 ? todayStats.streakDays + 1 : 0
        } else {
            // Streak broken
            return todayStats.todayMinutes >= 30 ? 1 : 0
        }
    }
    
    // MARK: - Insights
    
    func getOutdoorInsight() -> WellnessInsight? {
        let minutes = todayStats.todayMinutes
        let streak = todayStats.streakDays
        
        // Celebrate outdoor time
        if minutes >= 120 {
            return WellnessInsight(
                type: .celebration,
                message: "2+ hours outside today - amazing! ☀️",
                detail: "You're really getting out there!",
                emoji: "🌟"
            )
        } else if minutes >= 60 {
            return WellnessInsight(
                type: .celebration,
                message: "1 hour outside - nice! ☀️",
                emoji: "✨"
            )
        } else if minutes >= 30 {
            return WellnessInsight(
                type: .celebration,
                message: "\(minutes) min outside today 🌳",
                emoji: "💪"
            )
        }
        
        // Streak celebration
        if streak >= 7 {
            return WellnessInsight(
                type: .streak,
                message: "🔥 \(streak) day outdoor streak!",
                detail: "You're on fire (but in a good, outside way)",
                emoji: "🔥"
            )
        } else if streak >= 3 {
            return WellnessInsight(
                type: .streak,
                message: "\(streak) days of touching grass! 🌱",
                emoji: "🌿"
            )
        }
        
        return nil
    }
    
    // MARK: - Persistence
    
    private func loadCachedStats() {
        if let data = defaults?.data(forKey: "outdoorStats"),
           let decoded = try? JSONDecoder().decode(OutdoorStats.self, from: data) {
            
            // Check if it's a new day
            if let lastDate = decoded.lastOutdoorDate,
               !Calendar.current.isDateInToday(lastDate) {
                // Reset daily stats, keep streak if yesterday
                let keepStreak = Calendar.current.isDateInYesterday(lastDate)
                todayStats = OutdoorStats(
                    todayMinutes: 0,
                    weekMinutes: decoded.weekMinutes,
                    streakDays: keepStreak ? decoded.streakDays : 0,
                    lastOutdoorDate: decoded.lastOutdoorDate,
                    sessions: []
                )
            } else {
                todayStats = decoded
            }
        }
    }
    
    private func saveStats() {
        if let encoded = try? JSONEncoder().encode(todayStats) {
            defaults?.set(encoded, forKey: "outdoorStats")
        }
    }
    
    private func syncToSharedDefaults() {
        defaults?.set(todayStats.todayMinutes, forKey: "outdoorMinutes")
        defaults?.set(todayStats.streakDays, forKey: "outdoorStreak")
        defaults?.set(Date().timeIntervalSince1970, forKey: "outdoorLastSync")
    }
}

// MARK: - CLLocationManagerDelegate

extension OutdoorActivityService: CLLocationManagerDelegate {
    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        
        Task { @MainActor in
            self.lastLocation = location
            
            // If we're outside and moving, we're likely outdoors
            if location.horizontalAccuracy < 100 && !self.isOutdoorNow {
                // Good GPS signal suggests outdoor
                // Could combine with other signals for better detection
            }
        }
    }
    
    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus
        Task { @MainActor in
            self.isAuthorized = status == .authorizedWhenInUse ||
                               status == .authorizedAlways
        }
    }
}
