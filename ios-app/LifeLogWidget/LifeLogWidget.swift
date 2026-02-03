//
//  LifeLogWidget.swift
//  LifeLogWidget
//
//  Created by Joshua Rich on 2026-02-02.
//

import WidgetKit
import SwiftUI

// MARK: - Widget Entry
struct LifeLogEntry: TimelineEntry {
    let date: Date
    let focusMinutes: Int
    let goalsCompleted: Int
    let totalGoals: Int
    let maxStreak: Int
}

// MARK: - Timeline Provider
struct LifeLogProvider: TimelineProvider {
    func placeholder(in context: Context) -> LifeLogEntry {
        LifeLogEntry(date: Date(), focusMinutes: 120, goalsCompleted: 2, totalGoals: 3, maxStreak: 7)
    }
    
    func getSnapshot(in context: Context, completion: @escaping (LifeLogEntry) -> Void) {
        let entry = loadEntry()
        completion(entry)
    }
    
    func getTimeline(in context: Context, completion: @escaping (Timeline<LifeLogEntry>) -> Void) {
        let entry = loadEntry()
        
        // Update every 15 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        
        completion(timeline)
    }
    
    private func loadEntry() -> LifeLogEntry {
        let defaults = UserDefaults(suiteName: "group.com.skynet.lifelog")
        
        let focusMinutes = defaults?.integer(forKey: "focusMinutes") ?? 0
        let goalsCompleted = defaults?.integer(forKey: "goalsCompleted") ?? 0
        let totalGoals = defaults?.integer(forKey: "goalsCount") ?? 0
        let maxStreak = defaults?.integer(forKey: "maxStreak") ?? 0
        
        return LifeLogEntry(
            date: Date(),
            focusMinutes: focusMinutes,
            goalsCompleted: goalsCompleted,
            totalGoals: totalGoals,
            maxStreak: maxStreak
        )
    }
}

// MARK: - Medium Widget View
struct LifeLogWidgetMediumView: View {
    var entry: LifeLogEntry
    
    var body: some View {
        HStack(spacing: 16) {
            // Focus Time
            VStack(spacing: 4) {
                Image(systemName: "brain.head.profile")
                    .font(.title)
                    .foregroundStyle(Color(hex: "10b981")!)
                
                Text("\(entry.focusMinutes)")
                    .font(.title2)
                    .fontWeight(.bold)
                
                Text("Focus min")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity)
            
            Divider()
            
            // Goals
            VStack(spacing: 4) {
                Image(systemName: "target")
                    .font(.title)
                    .foregroundStyle(Color(hex: "3b82f6")!)
                
                Text("\(entry.goalsCompleted)/\(entry.totalGoals)")
                    .font(.title2)
                    .fontWeight(.bold)
                
                Text("Goals")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity)
            
            Divider()
            
            // Streak
            VStack(spacing: 4) {
                Text("🔥")
                    .font(.title)
                
                Text("\(entry.maxStreak)")
                    .font(.title2)
                    .fontWeight(.bold)
                
                Text("Streak")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity)
        }
        .padding()
        .containerBackground(for: .widget) {
            Color(hex: "1a1a1a")!
        }
    }
}

// MARK: - Small Widget View
struct LifeLogWidgetSmallView: View {
    var entry: LifeLogEntry
    
    var body: some View {
        VStack(spacing: 8) {
            HStack {
                Text("🔥")
                Text("\(entry.maxStreak)")
                    .font(.title)
                    .fontWeight(.bold)
            }
            
            Text("day streak")
                .font(.caption)
                .foregroundStyle(.secondary)
            
            Spacer()
            
            Text("\(entry.goalsCompleted)/\(entry.totalGoals)")
                .font(.headline)
            Text("goals hit")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .padding()
        .containerBackground(for: .widget) {
            Color(hex: "1a1a1a")!
        }
    }
}

// MARK: - Lock Screen Widget (Circular)
struct LifeLogLockScreenView: View {
    var entry: LifeLogEntry
    
    var body: some View {
        ZStack {
            AccessoryWidgetBackground()
            
            VStack(spacing: 2) {
                Text("🔥")
                    .font(.title3)
                Text("\(entry.maxStreak)")
                    .font(.headline)
                    .fontWeight(.bold)
            }
        }
    }
}

// MARK: - Main Widget
struct LifeLogWidget: Widget {
    let kind: String = "LifeLogWidget"
    
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: LifeLogProvider()) { entry in
            if #available(iOS 17.0, *) {
                LifeLogWidgetMediumView(entry: entry)
            } else {
                LifeLogWidgetMediumView(entry: entry)
            }
        }
        .configurationDisplayName("LifeLog Progress")
        .description("Track your daily focus time, goals, and streaks.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Lock Screen Widget
struct LifeLogStreakWidget: Widget {
    let kind: String = "LifeLogStreakWidget"
    
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: LifeLogProvider()) { entry in
            LifeLogLockScreenView(entry: entry)
        }
        .configurationDisplayName("Streak Counter")
        .description("See your current streak on the lock screen.")
        .supportedFamilies([.accessoryCircular])
    }
}

// MARK: - Widget Bundle
@main
struct LifeLogWidgetBundle: WidgetBundle {
    var body: some Widget {
        LifeLogWidget()
        LifeLogStreakWidget()
    }
}

// MARK: - Color Extension for Widget
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
}

#Preview("Medium Widget", as: .systemMedium) {
    LifeLogWidget()
} timeline: {
    LifeLogEntry(date: Date(), focusMinutes: 180, goalsCompleted: 2, totalGoals: 3, maxStreak: 7)
}

#Preview("Small Widget", as: .systemSmall) {
    LifeLogWidget()
} timeline: {
    LifeLogEntry(date: Date(), focusMinutes: 180, goalsCompleted: 2, totalGoals: 3, maxStreak: 7)
}
