//
//  WellnessModels.swift
//  LifeLog
//
//  Models for screen time tracking and wellness nudges
//

import Foundation
import SwiftUI

// MARK: - Screen Time Data

struct ScreenTimeData: Codable, Identifiable {
    let id: UUID
    let date: Date
    let totalMinutes: Int
    let socialMediaMinutes: Int
    let productivityMinutes: Int
    let entertainmentMinutes: Int
    let categories: [AppCategoryUsage]
    let isRealData: Bool // True when using actual Screen Time API data
    
    init(
        id: UUID = UUID(),
        date: Date = Date(),
        totalMinutes: Int = 0,
        socialMediaMinutes: Int = 0,
        productivityMinutes: Int = 0,
        entertainmentMinutes: Int = 0,
        categories: [AppCategoryUsage] = [],
        isRealData: Bool = false
    ) {
        self.id = id
        self.date = date
        self.totalMinutes = totalMinutes
        self.socialMediaMinutes = socialMediaMinutes
        self.productivityMinutes = productivityMinutes
        self.entertainmentMinutes = entertainmentMinutes
        self.categories = categories
        self.isRealData = isRealData
    }
    
    var socialMediaHours: Double {
        Double(socialMediaMinutes) / 60.0
    }
    
    var totalHours: Double {
        Double(totalMinutes) / 60.0
    }
}

struct AppCategoryUsage: Codable, Identifiable {
    let id: UUID
    let category: AppCategory
    let minutes: Int
    let topApps: [String]
    
    init(id: UUID = UUID(), category: AppCategory, minutes: Int, topApps: [String] = []) {
        self.id = id
        self.category = category
        self.minutes = minutes
        self.topApps = topApps
    }
}

enum AppCategory: String, Codable, CaseIterable {
    case socialMedia = "Social Media"
    case productivity = "Productivity"
    case entertainment = "Entertainment"
    case games = "Games"
    case communication = "Communication"
    case healthFitness = "Health & Fitness"
    case education = "Education"
    case creativity = "Creativity"
    case other = "Other"
    
    var icon: String {
        switch self {
        case .socialMedia: return "bubble.left.and.bubble.right.fill"
        case .productivity: return "hammer.fill"
        case .entertainment: return "tv.fill"
        case .games: return "gamecontroller.fill"
        case .communication: return "message.fill"
        case .healthFitness: return "heart.fill"
        case .education: return "book.fill"
        case .creativity: return "paintbrush.fill"
        case .other: return "square.grid.2x2.fill"
        }
    }
    
    var color: Color {
        switch self {
        case .socialMedia: return Color(hex: "e11d48")!
        case .productivity: return Color(hex: "10b981")!
        case .entertainment: return Color(hex: "8b5cf6")!
        case .games: return Color(hex: "f59e0b")!
        case .communication: return Color(hex: "3b82f6")!
        case .healthFitness: return Color(hex: "ec4899")!
        case .education: return Color(hex: "06b6d4")!
        case .creativity: return Color(hex: "f97316")!
        case .other: return Color(.systemGray)
        }
    }
}

// MARK: - Outdoor Activity

struct OutdoorSession: Codable, Identifiable {
    let id: UUID
    let startTime: Date
    let endTime: Date?
    let durationMinutes: Int
    let activityType: OutdoorActivityType
    let locationDescription: String?
    
    init(
        id: UUID = UUID(),
        startTime: Date = Date(),
        endTime: Date? = nil,
        durationMinutes: Int = 0,
        activityType: OutdoorActivityType = .walking,
        locationDescription: String? = nil
    ) {
        self.id = id
        self.startTime = startTime
        self.endTime = endTime
        self.durationMinutes = durationMinutes
        self.activityType = activityType
        self.locationDescription = locationDescription
    }
}

enum OutdoorActivityType: String, Codable, CaseIterable {
    case walking = "Walking"
    case running = "Running"
    case cycling = "Cycling"
    case hiking = "Hiking"
    case generalOutdoor = "Outside"
    
    var icon: String {
        switch self {
        case .walking: return "figure.walk"
        case .running: return "figure.run"
        case .cycling: return "bicycle"
        case .hiking: return "figure.hiking"
        case .generalOutdoor: return "sun.max.fill"
        }
    }
    
    var emoji: String {
        switch self {
        case .walking: return "🚶"
        case .running: return "🏃"
        case .cycling: return "🚴"
        case .hiking: return "🥾"
        case .generalOutdoor: return "☀️"
        }
    }
}

struct OutdoorStats: Codable {
    let todayMinutes: Int
    let weekMinutes: Int
    let streakDays: Int
    let lastOutdoorDate: Date?
    let sessions: [OutdoorSession]
    
    init(
        todayMinutes: Int = 0,
        weekMinutes: Int = 0,
        streakDays: Int = 0,
        lastOutdoorDate: Date? = nil,
        sessions: [OutdoorSession] = []
    ) {
        self.todayMinutes = todayMinutes
        self.weekMinutes = weekMinutes
        self.streakDays = streakDays
        self.lastOutdoorDate = lastOutdoorDate
        self.sessions = sessions
    }
    
    var todayHours: Double {
        Double(todayMinutes) / 60.0
    }
    
    var hasOutdoorToday: Bool {
        todayMinutes >= 30 // 30 min threshold for "outdoor day"
    }
}

// MARK: - Wellness Insights

struct WellnessInsight: Identifiable {
    let id: UUID
    let type: InsightType
    let message: String
    let detail: String?
    let emoji: String
    let actionLabel: String?
    let action: (() -> Void)?
    let timestamp: Date
    
    init(
        id: UUID = UUID(),
        type: InsightType,
        message: String,
        detail: String? = nil,
        emoji: String,
        actionLabel: String? = nil,
        action: (() -> Void)? = nil,
        timestamp: Date = Date()
    ) {
        self.id = id
        self.type = type
        self.message = message
        self.detail = detail
        self.emoji = emoji
        self.actionLabel = actionLabel
        self.action = action
        self.timestamp = timestamp
    }
}

enum InsightType {
    case celebration       // Positive achievement
    case gentleSuggestion  // Soft nudge
    case streak            // Streak milestone
    case balanceWin        // Good balance
    case morningGreeting   // Start of day
    case eveningSummary    // End of day
    case info              // Informational message
    
    var backgroundColor: Color {
        switch self {
        case .celebration, .streak, .balanceWin:
            return Color.success.opacity(0.15)
        case .gentleSuggestion:
            return Color.brandAccent.opacity(0.15)
        case .morningGreeting:
            return Color.warning.opacity(0.15)
        case .eveningSummary:
            return Color(hex: "8b5cf6")!.opacity(0.15)
        case .info:
            return Color(.systemGray).opacity(0.15)
        }
    }
    
    var borderColor: Color {
        switch self {
        case .celebration, .streak, .balanceWin:
            return Color.success.opacity(0.3)
        case .gentleSuggestion:
            return Color.brandAccent.opacity(0.3)
        case .morningGreeting:
            return Color.warning.opacity(0.3)
        case .eveningSummary:
            return Color(hex: "8b5cf6")!.opacity(0.3)
        case .info:
            return Color(.systemGray).opacity(0.3)
        }
    }
}

// MARK: - Balance Data

struct DailyBalance: Identifiable {
    let id: UUID
    let date: Date
    let screenMinutes: Int
    let outdoorMinutes: Int
    let focusMinutes: Int
    
    init(
        id: UUID = UUID(),
        date: Date = Date(),
        screenMinutes: Int = 0,
        outdoorMinutes: Int = 0,
        focusMinutes: Int = 0
    ) {
        self.id = id
        self.date = date
        self.screenMinutes = screenMinutes
        self.outdoorMinutes = outdoorMinutes
        self.focusMinutes = focusMinutes
    }
    
    var balanceScore: Double {
        // Higher outdoor + focus relative to screen = better balance
        let screenHours = Double(screenMinutes) / 60.0
        let outdoorHours = Double(outdoorMinutes) / 60.0
        let focusHours = Double(focusMinutes) / 60.0
        
        guard screenHours > 0 else { return 1.0 }
        
        let positiveTime = outdoorHours + focusHours
        let ratio = positiveTime / screenHours
        
        return min(ratio, 1.0) // Cap at 1.0 (perfect balance)
    }
    
    var balanceEmoji: String {
        switch balanceScore {
        case 0.8...1.0: return "🌟"
        case 0.5..<0.8: return "✨"
        case 0.3..<0.5: return "💪"
        default: return "🌱"
        }
    }
    
    var balanceMessage: String {
        switch balanceScore {
        case 0.8...1.0: return "Amazing balance today!"
        case 0.5..<0.8: return "Good balance!"
        case 0.3..<0.5: return "You're doing great"
        default: return "Every step counts"
        }
    }
}

// MARK: - Wellness Preferences

struct WellnessPreferences: Codable {
    var nudgesEnabled: Bool
    var morningInsightsEnabled: Bool
    var eveningSummaryEnabled: Bool
    var outdoorGoalMinutes: Int
    var socialMediaThresholdMinutes: Int
    var quietHoursStart: Int // Hour of day (0-23)
    var quietHoursEnd: Int
    
    init(
        nudgesEnabled: Bool = true,
        morningInsightsEnabled: Bool = true,
        eveningSummaryEnabled: Bool = true,
        outdoorGoalMinutes: Int = 60,
        socialMediaThresholdMinutes: Int = 120,
        quietHoursStart: Int = 22,
        quietHoursEnd: Int = 8
    ) {
        self.nudgesEnabled = nudgesEnabled
        self.morningInsightsEnabled = morningInsightsEnabled
        self.eveningSummaryEnabled = eveningSummaryEnabled
        self.outdoorGoalMinutes = outdoorGoalMinutes
        self.socialMediaThresholdMinutes = socialMediaThresholdMinutes
        self.quietHoursStart = quietHoursStart
        self.quietHoursEnd = quietHoursEnd
    }
    
    var isQuietHours: Bool {
        let hour = Calendar.current.component(.hour, from: Date())
        if quietHoursStart > quietHoursEnd {
            // Spans midnight (e.g., 22:00 - 08:00)
            return hour >= quietHoursStart || hour < quietHoursEnd
        } else {
            return hour >= quietHoursStart && hour < quietHoursEnd
        }
    }
}
