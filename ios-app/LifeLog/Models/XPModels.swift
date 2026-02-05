//
//  XPModels.swift
//  LifeLog
//
//  Created by Skynet on 2026-02-04.
//  XP gamification models for Nudge
//

import Foundation

// MARK: - XP Status
struct XPStatus: Codable {
    let userId: String
    let totalXP: Int
    let currentXP: Int
    let level: Int
    let nextLevelXP: Int
    let progressToNextLevel: Int
    let redemptionBoost: Int
    let streak: Int
    
    /// XP needed to reach the next level
    var xpToNextLevel: Int {
        nextLevelXP - totalXP
    }
    
    /// Current level's starting XP
    var currentLevelXP: Int {
        level * level * 100
    }
    
    /// Progress fraction (0.0 to 1.0)
    var progressFraction: Double {
        Double(progressToNextLevel) / 100.0
    }
}

// MARK: - XP Activity Types
enum XPActivity: String, Codable {
    case dailyCheckin = "DAILY_CHECKIN"
    case moodLog = "MOOD_LOG"
    case goalComplete = "GOAL_COMPLETE"
    case streak7Day = "STREAK_7DAY"
    case streak30Day = "STREAK_30DAY"
    case badgeEarned = "BADGE_EARNED"
    case agentInteraction = "AGENT_INTERACTION"
    
    var displayName: String {
        switch self {
        case .dailyCheckin: return "Daily Check-in"
        case .moodLog: return "Mood Log"
        case .goalComplete: return "Goal Complete"
        case .streak7Day: return "7-Day Streak"
        case .streak30Day: return "30-Day Streak"
        case .badgeEarned: return "Badge Earned"
        case .agentInteraction: return "Agent Chat"
        }
    }
    
    var xpReward: Int {
        switch self {
        case .dailyCheckin: return 10
        case .moodLog: return 5
        case .goalComplete: return 25
        case .streak7Day: return 50
        case .streak30Day: return 200
        case .badgeEarned: return 100
        case .agentInteraction: return 2
        }
    }
}

// MARK: - XP Transaction
struct XPTransaction: Codable, Identifiable {
    let id: Int
    let userId: String
    let amount: Int
    let activity: String
    let metadata: [String: String]?
    let createdAt: String
    
    var activityType: XPActivity? {
        XPActivity(rawValue: activity)
    }
    
    var formattedDate: String {
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: createdAt) else { return createdAt }
        
        let displayFormatter = DateFormatter()
        displayFormatter.dateStyle = .short
        displayFormatter.timeStyle = .short
        return displayFormatter.string(from: date)
    }
}

// MARK: - Leaderboard Entry
struct LeaderboardEntry: Codable, Identifiable {
    let userId: String
    let totalXP: Int
    let level: Int
    let rank: Int
    
    var id: String { "\(rank)-\(userId)" }
}

// MARK: - API Responses
struct XPStatusResponse: Codable {
    let success: Bool
    let data: XPStatus
}

struct XPHistoryResponse: Codable {
    let success: Bool
    let data: XPHistoryData
}

struct XPHistoryData: Codable {
    let history: [XPTransaction]
    let total: Int
}

struct LeaderboardResponse: Codable {
    let success: Bool
    let data: LeaderboardData
}

struct LeaderboardData: Codable {
    let leaderboard: [LeaderboardEntry]
    let updatedAt: String
}

struct XPAwardResponse: Codable {
    let success: Bool
    let data: XPAwardData
}

struct XPAwardData: Codable {
    let xpAwarded: Int
    let leveledUp: Bool
    let newLevel: Int?
    let user: XPUserData
}

struct XPUserData: Codable {
    let totalXP: Int
    let currentXP: Int
    let level: Int
}

// MARK: - XP Notification
struct XPNotification: Identifiable, Equatable {
    let id = UUID()
    let amount: Int
    let activity: XPActivity
    let leveledUp: Bool
    let newLevel: Int?
    let timestamp = Date()
    
    static func == (lhs: XPNotification, rhs: XPNotification) -> Bool {
        lhs.id == rhs.id
    }
}
