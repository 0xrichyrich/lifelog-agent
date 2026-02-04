//
//  Models.swift
//  LifeLog
//
//  Created by Joshua Rich on 2026-02-02.
//

import Foundation
import SwiftUI

// MARK: - Activity
struct Activity: Codable, Identifiable {
    let id: Int
    let timestamp: String
    let type: ActivityType
    let duration: Int?
    let metadataJson: String?
    
    enum CodingKeys: String, CodingKey {
        case id, timestamp, type, duration
        case metadataJson = "metadata_json"
    }
    
    var category: ActivityCategory {
        switch type {
        case .focus, .coding:
            return .focus
        case .meeting:
            return .collaboration
        case .socialMedia:
            return .distraction
        case .break_:
            return .break_
        case .email:
            return .collaboration
        default:
            return .break_
        }
    }
    
    var metadata: [String: Any]? {
        guard let json = metadataJson,
              let data = json.data(using: .utf8),
              let dict = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return nil
        }
        return dict
    }
    
    var formattedTime: String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        
        guard let date = formatter.date(from: timestamp) ?? ISO8601DateFormatter().date(from: timestamp) else {
            return timestamp
        }
        
        let timeFormatter = DateFormatter()
        timeFormatter.timeStyle = .short
        return timeFormatter.string(from: date)
    }
}

enum ActivityType: String, Codable {
    case screenRecord = "screen_record"
    case cameraSnap = "camera_snap"
    case audioRecord = "audio_record"
    case sessionStart = "session_start"
    case sessionStop = "session_stop"
    case coding
    case meeting
    case email
    case socialMedia = "social_media"
    case break_ = "break"
    case focus
}

enum ActivityCategory: String {
    case focus
    case collaboration
    case distraction
    case break_
    case idle
    
    var color: Color {
        switch self {
        case .focus:
            return .success
        case .collaboration:
            return .warning
        case .distraction:
            return .danger
        case .break_, .idle:
            return Color(.systemGray)
        }
    }
    
    var displayName: String {
        switch self {
        case .focus: return "Focus"
        case .collaboration: return "Collaboration"
        case .distraction: return "Distraction"
        case .break_: return "Break"
        case .idle: return "Idle"
        }
    }
}

// MARK: - Goal
struct Goal: Codable, Identifiable {
    let id: String
    let name: String
    let description: String
    let type: GoalType
    let target: Int
    let unit: String
    let current: Int
    let streak: Int
    let category: String
    let color: String
    let createdAt: String
    
    var progress: Double {
        guard target > 0 else { return 0 }
        return min(Double(current) / Double(target), 1.0)
    }
    
    var isComplete: Bool {
        current >= target
    }
    
    var swiftColor: Color {
        Color(hex: color) ?? .accent
    }
}

enum GoalType: String, Codable {
    case daily
    case weekly
    case monthly
}

// MARK: - CheckIn
struct CheckIn: Codable, Identifiable {
    let id: Int
    let timestamp: String
    let message: String
    let source: String?
    
    var formattedTime: String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        
        guard let date = formatter.date(from: timestamp) ?? ISO8601DateFormatter().date(from: timestamp) else {
            return timestamp
        }
        
        let timeFormatter = DateFormatter()
        timeFormatter.dateStyle = .short
        timeFormatter.timeStyle = .short
        return timeFormatter.string(from: date)
    }
    
    var date: Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.date(from: timestamp) ?? ISO8601DateFormatter().date(from: timestamp)
    }
}

// MARK: - TimeBlock
struct TimeBlock: Identifiable {
    let id = UUID()
    let hour: Int
    let activities: [Activity]
    let dominantCategory: ActivityCategory
    let totalMinutes: Int
    
    var hourLabel: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "ha"
        let date = Calendar.current.date(bySettingHour: hour, minute: 0, second: 0, of: Date()) ?? Date()
        return formatter.string(from: date).lowercased()
    }
}

// MARK: - API Responses
struct ActivitiesResponse: Codable {
    let date: String
    let activities: [Activity]
    let source: String
    let error: String?
}

struct GoalsResponse: Codable {
    let goals: [Goal]
    let source: String
    let error: String?
}

struct CheckInsResponse: Codable {
    let checkins: [CheckIn]
    let count: Int
    let error: String?
}

struct CreateCheckInResponse: Codable {
    let id: Int
    let message: String
    let timestamp: String
    let source: String?
}

// MARK: - Color Extension
extension Color {
    init?(hex: String) {
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")
        
        var rgb: UInt64 = 0
        guard Scanner(string: hexSanitized).scanHexInt64(&rgb) else { return nil }
        
        let red = Double((rgb & 0xFF0000) >> 16) / 255.0
        let green = Double((rgb & 0x00FF00) >> 8) / 255.0
        let blue = Double(rgb & 0x0000FF) / 255.0
        
        self.init(red: red, green: green, blue: blue)
    }
    
    // Theme colors - Light theme with mint green accent
    // Inspired by the kawaii mint green squircle mascot
    static let background = Color(hex: "F8FAFB")!          // Soft off-white background
    static let cardBackground = Color(hex: "FFFFFF")!      // Pure white cards
    static let textPrimary = Color(hex: "1F2937")!         // Dark gray for text
    static let textSecondary = Color(hex: "6B7280")!       // Medium gray for secondary text
    static let brandAccent = Color(hex: "A8E6CF")!         // Mint green (mascot color)
    static let brandAccentDark = Color(hex: "7DD3B0")!     // Darker mint for contrast
    static let brandInteractive = Color(hex: "1D7A5F")!    // Dark mint for buttons/links (WCAG AA compliant)
    static let success = Color(hex: "6FCF97")!             // Soft green (complementary)
    static let warning = Color(hex: "F2C94C")!             // Warm yellow
    static let danger = Color(hex: "EB5757")!              // Soft red
    static let mintLight = Color(hex: "E8F5F0")!           // Very light mint for backgrounds
    static let mintMedium = Color(hex: "B8EDD9")!          // Medium mint
    
    // Semantic colors for the light theme
    static let surfaceElevated = Color(hex: "FFFFFF")!     // Elevated surfaces (cards, modals)
    static let divider = Color(hex: "E5E7EB")!             // Subtle dividers
    static let inputBackground = Color(hex: "F3F4F6")!     // Input field backgrounds
}
