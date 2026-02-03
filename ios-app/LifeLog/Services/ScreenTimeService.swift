//
//  ScreenTimeService.swift
//  LifeLog
//
//  Screen Time tracking using DeviceActivity framework
//  Note: Requires Screen Time permission and Family Controls capability
//

import Foundation
import SwiftUI

// Note: DeviceActivity framework requires iOS 16+ and special entitlements
// For apps not in Family Controls, we use a combination of:
// - User-reported data
// - App usage patterns from our own tracking
// - Integration with Screen Time data when available

@MainActor
final class ScreenTimeService: ObservableObject {
    static let shared = ScreenTimeService()
    
    @Published var todayData: ScreenTimeData?
    @Published var weeklyData: [ScreenTimeData] = []
    @Published var isAuthorized: Bool = false
    @Published var lastSyncDate: Date?
    
    private let defaults = UserDefaults(suiteName: AppState.appGroup)
    
    private init() {
        loadCachedData()
    }
    
    // MARK: - Authorization
    
    func requestAuthorization() async -> Bool {
        // In a production app with Family Controls entitlement:
        // return await AuthorizationCenter.shared.requestAuthorization(for: .individual)
        
        // For now, we simulate authorization
        // Real implementation would use DeviceActivityReport
        isAuthorized = true
        return true
    }
    
    // MARK: - Data Fetching
    
    func fetchTodayScreenTime() async {
        // In production, this would use DeviceActivityReport
        // For demo, we generate realistic data based on time of day
        
        let hour = Calendar.current.component(.hour, from: Date())
        let baseMinutes = hour * 8 // Roughly 8 min per hour average
        
        let socialRatio = Double.random(in: 0.25...0.4)
        let productivityRatio = Double.random(in: 0.2...0.35)
        let entertainmentRatio = 1.0 - socialRatio - productivityRatio
        
        let data = ScreenTimeData(
            date: Date(),
            totalMinutes: baseMinutes + Int.random(in: -20...40),
            socialMediaMinutes: Int(Double(baseMinutes) * socialRatio),
            productivityMinutes: Int(Double(baseMinutes) * productivityRatio),
            entertainmentMinutes: Int(Double(baseMinutes) * entertainmentRatio),
            categories: generateCategoryBreakdown(totalMinutes: baseMinutes)
        )
        
        todayData = data
        lastSyncDate = Date()
        saveToCache()
        syncToSharedDefaults()
    }
    
    func fetchWeeklyScreenTime() async {
        var weekData: [ScreenTimeData] = []
        
        for dayOffset in 0..<7 {
            guard let date = Calendar.current.date(byAdding: .day, value: -dayOffset, to: Date()) else { continue }
            
            // Generate realistic daily data
            let totalMinutes = Int.random(in: 180...420) // 3-7 hours
            let socialRatio = Double.random(in: 0.2...0.45)
            let productivityRatio = Double.random(in: 0.15...0.35)
            let entertainmentRatio = 1.0 - socialRatio - productivityRatio
            
            let data = ScreenTimeData(
                date: date,
                totalMinutes: totalMinutes,
                socialMediaMinutes: Int(Double(totalMinutes) * socialRatio),
                productivityMinutes: Int(Double(totalMinutes) * productivityRatio),
                entertainmentMinutes: Int(Double(totalMinutes) * entertainmentRatio),
                categories: generateCategoryBreakdown(totalMinutes: totalMinutes)
            )
            
            weekData.append(data)
        }
        
        weeklyData = weekData
        saveToCache()
    }
    
    // MARK: - Category Breakdown
    
    private func generateCategoryBreakdown(totalMinutes: Int) -> [AppCategoryUsage] {
        let categories: [(AppCategory, Double, [String])] = [
            (.socialMedia, 0.30, ["Instagram", "TikTok", "X"]),
            (.entertainment, 0.25, ["YouTube", "Netflix", "Spotify"]),
            (.productivity, 0.20, ["Notes", "Calendar", "Mail"]),
            (.communication, 0.15, ["Messages", "WhatsApp", "Slack"]),
            (.games, 0.05, ["Games"]),
            (.other, 0.05, ["Other"])
        ]
        
        return categories.map { category, ratio, apps in
            let variance = Double.random(in: -0.05...0.05)
            let adjustedRatio = max(0, ratio + variance)
            return AppCategoryUsage(
                category: category,
                minutes: Int(Double(totalMinutes) * adjustedRatio),
                topApps: apps
            )
        }
    }
    
    // MARK: - Insights
    
    func getSocialMediaInsight() -> String? {
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
        guard let today = todayData else { return nil }
        
        // Compare to weekly average
        let weeklyAvg = weeklyData.isEmpty ? 0 :
            weeklyData.map(\.productivityMinutes).reduce(0, +) / weeklyData.count
        
        if today.productivityMinutes > Int(Double(weeklyAvg) * 1.2) {
            let increase = Int((Double(today.productivityMinutes) / Double(max(weeklyAvg, 1)) - 1) * 100)
            return "Your focus time is up \(increase)% today! 🎯"
        }
        
        return nil
    }
    
    func getWeeklyTrend() -> (direction: String, percentage: Int)? {
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
    }
}

// MARK: - Screen Time Summary View Model

@MainActor
class ScreenTimeSummaryViewModel: ObservableObject {
    @Published var screenTimeData: ScreenTimeData?
    @Published var insights: [WellnessInsight] = []
    @Published var isLoading = true
    
    private let service = ScreenTimeService.shared
    
    func loadData() async {
        isLoading = true
        
        await service.fetchTodayScreenTime()
        await service.fetchWeeklyScreenTime()
        
        screenTimeData = service.todayData
        generateInsights()
        
        isLoading = false
    }
    
    private func generateInsights() {
        var newInsights: [WellnessInsight] = []
        
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
