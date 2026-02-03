//
//  WellnessNudgeService.swift
//  LifeLog
//
//  Generates positive, non-judgmental wellness insights and nudges
//  Focus on celebration and gentle suggestions, never guilt
//

import Foundation
import SwiftUI
import UserNotifications

@MainActor
final class WellnessNudgeService: ObservableObject {
    static let shared = WellnessNudgeService()
    
    @Published var currentInsights: [WellnessInsight] = []
    @Published var preferences: WellnessPreferences
    
    private let screenTimeService = ScreenTimeService.shared
    private let outdoorService = OutdoorActivityService.shared
    private let defaults = UserDefaults(suiteName: AppState.appGroup)
    
    private init() {
        // Load preferences
        if let data = defaults?.data(forKey: "wellnessPreferences"),
           let decoded = try? JSONDecoder().decode(WellnessPreferences.self, from: data) {
            preferences = decoded
        } else {
            preferences = WellnessPreferences()
        }
    }
    
    // MARK: - Generate Insights
    
    func generateInsights() async -> [WellnessInsight] {
        var insights: [WellnessInsight] = []
        
        // Don't generate during quiet hours
        guard !preferences.isQuietHours || !preferences.nudgesEnabled else {
            return []
        }
        
        // 1. Morning greeting (8-10 AM)
        let hour = Calendar.current.component(.hour, from: Date())
        if hour >= 8 && hour <= 10 && preferences.morningInsightsEnabled {
            if let morning = generateMorningInsight() {
                insights.append(morning)
            }
        }
        
        // 2. Outdoor celebration
        if let outdoorInsight = outdoorService.getOutdoorInsight() {
            insights.append(outdoorInsight)
        }
        
        // 3. Productivity wins
        if let productivityInsight = screenTimeService.getProductivityInsight() {
            insights.append(WellnessInsight(
                type: .celebration,
                message: productivityInsight,
                emoji: "🎯"
            ))
        }
        
        // 4. Balance check (gentle, positive framing only)
        if let balanceInsight = generateBalanceInsight() {
            insights.append(balanceInsight)
        }
        
        // 5. Gentle suggestion (if screen time high but outdoor low)
        if let suggestion = generateGentleSuggestion() {
            insights.append(suggestion)
        }
        
        // 6. Evening summary (6-9 PM)
        if hour >= 18 && hour <= 21 && preferences.eveningSummaryEnabled {
            if let evening = generateEveningSummary() {
                insights.append(evening)
            }
        }
        
        currentInsights = insights
        return insights
    }
    
    // MARK: - Morning Insight
    
    private func generateMorningInsight() -> WellnessInsight? {
        let messages = [
            ("Good morning! Ready to make today great? ☀️", "🌅"),
            ("New day, fresh start! What's your focus? 🎯", "✨"),
            ("Rise and shine! Your goals are waiting 💪", "🌞"),
        ]
        
        let (message, emoji) = messages.randomElement()!
        
        // Add yesterday's wins if available
        var detail: String? = nil
        if outdoorService.todayStats.streakDays > 0 {
            detail = "You're on a \(outdoorService.todayStats.streakDays)-day outdoor streak!"
        }
        
        return WellnessInsight(
            type: .morningGreeting,
            message: message,
            detail: detail,
            emoji: emoji
        )
    }
    
    // MARK: - Balance Insight
    
    private func generateBalanceInsight() -> WellnessInsight? {
        let screenMinutes = screenTimeService.todayData?.totalMinutes ?? 0
        let outdoorMinutes = outdoorService.todayStats.todayMinutes
        let focusMinutes = screenTimeService.todayData?.productivityMinutes ?? 0
        
        let balance = DailyBalance(
            screenMinutes: screenMinutes,
            outdoorMinutes: outdoorMinutes,
            focusMinutes: focusMinutes
        )
        
        // Only show positive balance insights
        if balance.balanceScore >= 0.5 {
            return WellnessInsight(
                type: .balanceWin,
                message: "\(balance.balanceEmoji) \(balance.balanceMessage)",
                detail: outdoorMinutes > 0 ? "\(outdoorMinutes)min outside + \(focusMinutes)min focused" : nil,
                emoji: balance.balanceEmoji
            )
        }
        
        return nil
    }
    
    // MARK: - Gentle Suggestion
    
    private func generateGentleSuggestion() -> WellnessInsight? {
        let socialMediaMinutes = screenTimeService.todayData?.socialMediaMinutes ?? 0
        let outdoorMinutes = outdoorService.todayStats.todayMinutes
        
        // Only suggest if:
        // 1. Social media > threshold
        // 2. Low outdoor time today
        // 3. It's a reasonable time for outdoor activity
        let hour = Calendar.current.component(.hour, from: Date())
        let isGoodTimeForOutdoor = hour >= 7 && hour <= 20
        
        if socialMediaMinutes >= preferences.socialMediaThresholdMinutes &&
           outdoorMinutes < 30 &&
           isGoodTimeForOutdoor {
            
            // Positive, opportunity-focused framing
            let suggestions = [
                ("You've been inside for a while - want to log a walk? 🌳", "Log walk"),
                ("Perfect time for some fresh air! 🌤️", "Go outside"),
                ("A quick walk could be nice right now 🚶", "Start walk"),
                ("How about stretching your legs outside? ☀️", "Get moving"),
            ]
            
            let (message, action) = suggestions.randomElement()!
            
            return WellnessInsight(
                type: .gentleSuggestion,
                message: message,
                emoji: "🌱",
                actionLabel: action
            )
        }
        
        return nil
    }
    
    // MARK: - Evening Summary
    
    private func generateEveningSummary() -> WellnessInsight? {
        let outdoorMinutes = outdoorService.todayStats.todayMinutes
        let focusMinutes = screenTimeService.todayData?.productivityMinutes ?? 0
        let streak = outdoorService.todayStats.streakDays
        
        var achievements: [String] = []
        
        if outdoorMinutes >= 30 {
            achievements.append("\(outdoorMinutes)min outside")
        }
        if focusMinutes >= 60 {
            achievements.append("\(focusMinutes)min focused")
        }
        if streak >= 2 {
            achievements.append("\(streak)-day streak")
        }
        
        if achievements.isEmpty {
            // Still positive, but acknowledge it was a chill day
            return WellnessInsight(
                type: .eveningSummary,
                message: "Rest days count too! 🌙",
                detail: "Tomorrow's a new opportunity",
                emoji: "😴"
            )
        }
        
        let achievementText = achievements.joined(separator: " • ")
        
        return WellnessInsight(
            type: .eveningSummary,
            message: "Great day! \(achievementText) 🌟",
            emoji: "🎉"
        )
    }
    
    // MARK: - Notifications
    
    func scheduleWellnessNotification(_ insight: WellnessInsight) {
        guard preferences.nudgesEnabled && !preferences.isQuietHours else { return }
        
        let content = UNMutableNotificationContent()
        content.title = "LifeLog"
        content.body = "\(insight.emoji) \(insight.message)"
        content.sound = .default
        
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
        let request = UNNotificationRequest(
            identifier: "wellness-\(insight.id)",
            content: content,
            trigger: trigger
        )
        
        UNUserNotificationCenter.current().add(request)
    }
    
    func scheduleDailyCheckIn() {
        // Morning check-in at 9 AM
        var morningComponents = DateComponents()
        morningComponents.hour = 9
        morningComponents.minute = 0
        
        let morningContent = UNMutableNotificationContent()
        morningContent.title = "Good morning! ☀️"
        morningContent.body = "Ready to make today great? Check in when you're ready."
        morningContent.sound = .default
        
        let morningTrigger = UNCalendarNotificationTrigger(dateMatching: morningComponents, repeats: true)
        let morningRequest = UNNotificationRequest(
            identifier: "morning-checkin",
            content: morningContent,
            trigger: morningTrigger
        )
        
        UNUserNotificationCenter.current().add(morningRequest)
        
        // Evening reflection at 8 PM
        var eveningComponents = DateComponents()
        eveningComponents.hour = 20
        eveningComponents.minute = 0
        
        let eveningContent = UNMutableNotificationContent()
        eveningContent.title = "How was today? 🌙"
        eveningContent.body = "Take a moment to reflect on your day."
        eveningContent.sound = .default
        
        let eveningTrigger = UNCalendarNotificationTrigger(dateMatching: eveningComponents, repeats: true)
        let eveningRequest = UNNotificationRequest(
            identifier: "evening-reflection",
            content: eveningContent,
            trigger: eveningTrigger
        )
        
        UNUserNotificationCenter.current().add(eveningRequest)
    }
    
    // MARK: - Preferences
    
    func savePreferences() {
        if let encoded = try? JSONEncoder().encode(preferences) {
            defaults?.set(encoded, forKey: "wellnessPreferences")
        }
    }
}

// MARK: - Insight Templates

extension WellnessNudgeService {
    /// Pre-defined positive messages for various situations
    static let celebrationMessages = [
        "You're crushing it today! 💪",
        "Look at you go! 🚀",
        "That's what I'm talking about! 🎯",
        "Amazing progress! ⭐",
        "You're on fire! 🔥",
    ]
    
    static let outdoorMessages = [
        "Nice! Fresh air for the win ☀️",
        "Getting those steps in! 🚶",
        "Nature time unlocked 🌳",
        "Sunshine activated ☀️",
        "Touch that grass! 🌱",
    ]
    
    static let gentleSuggestions = [
        "Perfect weather for a walk?",
        "Your future self will thank you for moving",
        "Even 10 minutes outside helps!",
        "A little fresh air goes a long way",
        "How about a quick stretch outside?",
    ]
}
