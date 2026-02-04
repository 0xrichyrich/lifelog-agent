//
//  ScreenTimeService.swift
//  LifeLog
//
//  Screen Time tracking - COMING SOON
//  FamilyControls integration disabled pending App Store review
//
//  To re-enable:
//  1. Uncomment FamilyControls, DeviceActivity, ManagedSettings imports
//  2. Restore AuthorizationCenter calls
//  3. Add com.apple.developer.family-controls entitlement back
//  4. Set isComingSoon = false
//

import Foundation
import SwiftUI

// MARK: - Screen Time Service (Stubbed - Coming Soon)

@MainActor
final class ScreenTimeService: ObservableObject {
    static let shared = ScreenTimeService()
    
    /// Feature flag - set to false when FamilyControls is re-enabled
    let isComingSoon: Bool = true
    
    @Published var todayData: ScreenTimeData?
    @Published var weeklyData: [ScreenTimeData] = []
    @Published var isAuthorized: Bool = false
    @Published var authorizationError: String?
    @Published var lastSyncDate: Date?
    
    private let defaults = UserDefaults(suiteName: AppState.appGroup)
    
    private init() {
        // Don't load cached data or check auth when feature is disabled
        if !isComingSoon {
            loadCachedData()
        }
    }
    
    // MARK: - Authorization (Stubbed)
    
    /// Request authorization - returns false when feature is disabled
    func requestAuthorization() async -> Bool {
        if isComingSoon {
            authorizationError = "Screen Time Insights coming soon!"
            return false
        }
        
        // Original implementation would go here when re-enabled
        // try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
        return false
    }
    
    // MARK: - Data Fetching (Stubbed)
    
    /// Fetch today's screen time data - returns placeholder when disabled
    func fetchTodayScreenTime() async {
        if isComingSoon {
            // Return empty/placeholder data
            todayData = ScreenTimeData(
                date: Date(),
                totalMinutes: 0,
                socialMediaMinutes: 0,
                productivityMinutes: 0,
                entertainmentMinutes: 0,
                categories: [],
                isRealData: false
            )
            return
        }
        
        // Original implementation would go here
        lastSyncDate = Date()
        saveToCache()
        syncToSharedDefaults()
    }
    
    /// Fetch weekly screen time data
    func fetchWeeklyScreenTime() async {
        if isComingSoon {
            weeklyData = []
            return
        }
        
        // Original implementation would go here
    }
    
    // MARK: - Insights (Stubbed)
    
    func getSocialMediaInsight() -> String? {
        if isComingSoon { return nil }
        
        guard let data = todayData else { return nil }
        let hours = data.socialMediaHours
        
        if hours >= 3 {
            return "You've been scrolling for a bit - want to log a walk? 🌳"
        } else if hours >= 2 {
            return "Nice focus today! Maybe stretch your legs? 🚶"
        }
        
        return nil
    }
    
    func getProductivityInsight() -> String? {
        if isComingSoon { return nil }
        
        guard let today = todayData else { return nil }
        
        let weeklyAvg = weeklyData.isEmpty ? 0 :
            weeklyData.map(\.productivityMinutes).reduce(0, +) / weeklyData.count
        
        if today.productivityMinutes > Int(Double(weeklyAvg) * 1.2) {
            let increase = Int((Double(today.productivityMinutes) / Double(max(weeklyAvg, 1)) - 1) * 100)
            return "Your focus time is up \(increase)% today! 🎯"
        }
        
        return nil
    }
    
    func getWeeklyTrend() -> (direction: String, percentage: Int)? {
        if isComingSoon { return nil }
        
        guard weeklyData.count >= 7 else { return nil }
        
        let thisWeekTotal = weeklyData.prefix(3).map(\.socialMediaMinutes).reduce(0, +)
        let lastWeekTotal = weeklyData.suffix(4).map(\.socialMediaMinutes).reduce(0, +)
        
        guard lastWeekTotal > 0 else { return nil }
        
        let change = Double(thisWeekTotal - lastWeekTotal) / Double(lastWeekTotal)
        let percentage = abs(Int(change * 100))
        
        if change < -0.1 {
            return ("down", percentage)
        } else if change > 0.1 {
            return ("up", percentage)
        }
        
        return nil
    }
    
    // MARK: - Persistence
    
    private func loadCachedData() {
        if let data = defaults?.data(forKey: "screenTimeToday"),
           let decoded = try? JSONDecoder().decode(ScreenTimeData.self, from: data) {
            todayData = decoded
        }
    }
    
    private func saveToCache() {
        if let data = todayData,
           let encoded = try? JSONEncoder().encode(data) {
            defaults?.set(encoded, forKey: "screenTimeToday")
        }
    }
    
    private func syncToSharedDefaults() {
        guard let data = todayData else { return }
        
        defaults?.set(data.totalMinutes, forKey: "screenTimeTotal")
        defaults?.set(data.socialMediaMinutes, forKey: "screenTimeSocial")
        defaults?.set(data.productivityMinutes, forKey: "screenTimeProductivity")
        defaults?.set(Date().timeIntervalSince1970, forKey: "screenTimeLastSync")
        defaults?.set(isAuthorized, forKey: "screenTimeAuthorized")
    }
}

// MARK: - Screen Time Summary View Model

@MainActor
class ScreenTimeSummaryViewModel: ObservableObject {
    @Published var screenTimeData: ScreenTimeData?
    @Published var insights: [WellnessInsight] = []
    @Published var isLoading = true
    @Published var isAuthorized = false
    @Published var authorizationError: String?
    @Published var isComingSoon: Bool = true
    
    private let service = ScreenTimeService.shared
    
    func loadData() async {
        isLoading = true
        isComingSoon = service.isComingSoon
        
        if isComingSoon {
            isLoading = false
            return
        }
        
        // Check and update authorization status
        isAuthorized = service.isAuthorized
        authorizationError = service.authorizationError
        
        await service.fetchTodayScreenTime()
        await service.fetchWeeklyScreenTime()
        
        screenTimeData = service.todayData
        generateInsights()
        
        isLoading = false
    }
    
    func requestAuthorization() async -> Bool {
        if isComingSoon { return false }
        
        let result = await service.requestAuthorization()
        isAuthorized = service.isAuthorized
        authorizationError = service.authorizationError
        
        if result {
            await loadData()
        }
        
        return result
    }
    
    private func generateInsights() {
        var newInsights: [WellnessInsight] = []
        
        // Add data source indicator
        if let data = screenTimeData, !data.isRealData {
            newInsights.append(WellnessInsight(
                type: .info,
                message: "Using estimated data. Enable Screen Time access for accurate tracking.",
                emoji: "ℹ️",
                actionLabel: "Enable"
            ))
        }
        
        // Productivity insight
        if let insight = service.getProductivityInsight() {
            newInsights.append(WellnessInsight(
                type: .celebration,
                message: insight,
                emoji: "🎯"
            ))
        }
        
        // Weekly trend
        if let trend = service.getWeeklyTrend() {
            if trend.direction == "down" {
                newInsights.append(WellnessInsight(
                    type: .balanceWin,
                    message: "Social media down \(trend.percentage)% this week!",
                    emoji: "📉"
                ))
            }
        }
        
        // Gentle suggestion (if needed)
        if let suggestion = service.getSocialMediaInsight() {
            newInsights.append(WellnessInsight(
                type: .gentleSuggestion,
                message: suggestion,
                emoji: "🌳",
                actionLabel: "Log a walk"
            ))
        }
        
        insights = newInsights
    }
}
