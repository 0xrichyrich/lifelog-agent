//
//  LifeLogWidget.swift
//  LifeLogWidget
//
//  Created by Joshua Rich on 2026-02-02.
//  Updated with interactive widgets, Lock Screen widgets, and widget suite
//

import WidgetKit
import SwiftUI
import AppIntents

// MARK: - Widget Entry
struct LifeLogEntry: TimelineEntry {
    let date: Date
    let focusMinutes: Int
    let goalsCompleted: Int
    let totalGoals: Int
    let maxStreak: Int
    let lastCheckIn: String?
    let todayCheckIns: Int
}

// MARK: - Timeline Provider
struct LifeLogProvider: TimelineProvider {
    func placeholder(in context: Context) -> LifeLogEntry {
        LifeLogEntry(
            date: Date(),
            focusMinutes: 120,
            goalsCompleted: 2,
            totalGoals: 3,
            maxStreak: 7,
            lastCheckIn: "Started focus session",
            todayCheckIns: 5
        )
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
        let lastCheckIn = defaults?.string(forKey: "lastCheckIn")
        let todayCheckIns = defaults?.integer(forKey: "todayCheckIns") ?? 0
        
        return LifeLogEntry(
            date: Date(),
            focusMinutes: focusMinutes,
            goalsCompleted: goalsCompleted,
            totalGoals: totalGoals,
            maxStreak: maxStreak,
            lastCheckIn: lastCheckIn,
            todayCheckIns: todayCheckIns
        )
    }
}

// MARK: - App Intents for Interactive Widgets

struct QuickFocusIntent: AppIntent {
    static let title: LocalizedStringResource = "Log Focus"
    static let description = IntentDescription("Quickly log a focus session")
    
    func perform() async throws -> some IntentResult {
        // Store in shared defaults for the main app to pick up
        let defaults = UserDefaults(suiteName: "group.com.skynet.lifelog")
        defaults?.set("Started focus session", forKey: "pendingQuickLog")
        defaults?.set(Date().timeIntervalSince1970, forKey: "pendingQuickLogTime")
        
        // Update widget
        WidgetCenter.shared.reloadTimelines(ofKind: "LifeLogWidget")
        WidgetCenter.shared.reloadTimelines(ofKind: "LifeLogQuickLogWidget")
        
        return .result()
    }
}

struct QuickMeetingIntent: AppIntent {
    static let title: LocalizedStringResource = "Log Meeting"
    static let description = IntentDescription("Quickly log a meeting")
    
    func perform() async throws -> some IntentResult {
        let defaults = UserDefaults(suiteName: "group.com.skynet.lifelog")
        defaults?.set("In a meeting", forKey: "pendingQuickLog")
        defaults?.set(Date().timeIntervalSince1970, forKey: "pendingQuickLogTime")
        
        WidgetCenter.shared.reloadTimelines(ofKind: "LifeLogWidget")
        WidgetCenter.shared.reloadTimelines(ofKind: "LifeLogQuickLogWidget")
        
        return .result()
    }
}

struct QuickBreakIntent: AppIntent {
    static let title: LocalizedStringResource = "Log Break"
    static let description = IntentDescription("Quickly log a break")
    
    func perform() async throws -> some IntentResult {
        let defaults = UserDefaults(suiteName: "group.com.skynet.lifelog")
        defaults?.set("Taking a break", forKey: "pendingQuickLog")
        defaults?.set(Date().timeIntervalSince1970, forKey: "pendingQuickLogTime")
        
        WidgetCenter.shared.reloadTimelines(ofKind: "LifeLogWidget")
        WidgetCenter.shared.reloadTimelines(ofKind: "LifeLogQuickLogWidget")
        
        return .result()
    }
}

struct QuickCoffeeIntent: AppIntent {
    static let title: LocalizedStringResource = "Log Coffee"
    static let description = IntentDescription("Quickly log a coffee break")
    
    func perform() async throws -> some IntentResult {
        let defaults = UserDefaults(suiteName: "group.com.skynet.lifelog")
        defaults?.set("Coffee break ☕️", forKey: "pendingQuickLog")
        defaults?.set(Date().timeIntervalSince1970, forKey: "pendingQuickLogTime")
        
        WidgetCenter.shared.reloadTimelines(ofKind: "LifeLogWidget")
        WidgetCenter.shared.reloadTimelines(ofKind: "LifeLogQuickLogWidget")
        
        return .result()
    }
}

// MARK: - Large Widget View (Interactive)
struct LifeLogWidgetLargeView: View {
    var entry: LifeLogEntry
    
    var body: some View {
        VStack(spacing: 16) {
            // Header with stats
            HStack(spacing: 16) {
                StatBubble(
                    icon: "brain.head.profile",
                    value: "\(entry.focusMinutes)",
                    label: "Focus",
                    color: Color(hex: "10b981")!
                )
                
                StatBubble(
                    icon: "target",
                    value: "\(entry.goalsCompleted)/\(entry.totalGoals)",
                    label: "Goals",
                    color: Color(hex: "3b82f6")!
                )
                
                StatBubble(
                    icon: "flame.fill",
                    value: "\(entry.maxStreak)",
                    label: "Streak",
                    color: Color(hex: "f59e0b")!
                )
            }
            
            Divider()
                .overlay(Color.gray.opacity(0.3))
            
            // Quick Log Buttons (Interactive)
            Text("Quick Log")
                .font(.caption)
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)
            
            HStack(spacing: 12) {
                QuickLogWidgetButton(
                    icon: "brain.head.profile",
                    label: "Focus",
                    color: Color(hex: "10b981")!,
                    intent: QuickFocusIntent()
                )
                
                QuickLogWidgetButton(
                    icon: "person.3.fill",
                    label: "Meeting",
                    color: Color(hex: "f59e0b")!,
                    intent: QuickMeetingIntent()
                )
                
                QuickLogWidgetButton(
                    icon: "cup.and.saucer.fill",
                    label: "Break",
                    color: Color(.systemGray),
                    intent: QuickBreakIntent()
                )
                
                QuickLogWidgetButton(
                    icon: "mug.fill",
                    label: "Coffee",
                    color: Color(hex: "8b5a2b")!,
                    intent: QuickCoffeeIntent()
                )
            }
            
            // Last check-in
            if let lastCheckIn = entry.lastCheckIn {
                HStack {
                    Image(systemName: "text.bubble")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    
                    Text(lastCheckIn)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                    
                    Spacer()
                }
                .padding(.top, 4)
            }
        }
        .padding()
        .containerBackground(for: .widget) {
            Color(hex: "1a1a1a")!
        }
    }
}

struct StatBubble: View {
    let icon: String
    let value: String
    let label: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(color)
            
            Text(value)
                .font(.headline)
                .fontWeight(.bold)
            
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

struct QuickLogWidgetButton<I: AppIntent>: View {
    let icon: String
    let label: String
    let color: Color
    let intent: I
    
    var body: some View {
        Button(intent: intent) {
            VStack(spacing: 4) {
                ZStack {
                    Circle()
                        .fill(color.opacity(0.2))
                        .frame(width: 40, height: 40)
                    
                    Image(systemName: icon)
                        .font(.system(size: 18))
                        .foregroundStyle(color)
                }
                
                Text(label)
                    .font(.caption2)
                    .foregroundStyle(.primary)
            }
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.plain)
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

// MARK: - Lock Screen Widgets

// Circular - Streak
struct LifeLogLockScreenCircularView: View {
    var entry: LifeLogEntry
    
    var body: some View {
        ZStack {
            AccessoryWidgetBackground()
            
            VStack(spacing: 0) {
                Text("🔥")
                    .font(.system(size: 16))
                Text("\(entry.maxStreak)")
                    .font(.system(size: 18, weight: .bold))
            }
        }
    }
}

// Circular - Focus Minutes
struct LifeLogFocusCircularView: View {
    var entry: LifeLogEntry
    
    var body: some View {
        Gauge(value: Double(min(entry.focusMinutes, 240)), in: 0...240) {
            Image(systemName: "brain.head.profile")
        } currentValueLabel: {
            Text("\(entry.focusMinutes)")
                .font(.system(size: 14, weight: .bold))
        }
        .gaugeStyle(.accessoryCircular)
    }
}

// Rectangular - Quick Stats
struct LifeLogLockScreenRectangularView: View {
    var entry: LifeLogEntry
    
    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text("LifeLog")
                    .font(.headline)
                
                HStack(spacing: 8) {
                    Label("\(entry.focusMinutes)m", systemImage: "brain.head.profile")
                    Label("\(entry.maxStreak)d", systemImage: "flame.fill")
                }
                .font(.caption)
            }
            
            Spacer()
            
            VStack(alignment: .trailing) {
                Text("\(entry.goalsCompleted)/\(entry.totalGoals)")
                    .font(.title3)
                    .fontWeight(.bold)
                Text("goals")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

// Inline - Simple stats
struct LifeLogLockScreenInlineView: View {
    var entry: LifeLogEntry
    
    var body: some View {
        Label {
            Text("🔥 \(entry.maxStreak) • \(entry.goalsCompleted)/\(entry.totalGoals) goals")
        } icon: {
            Image(systemName: "checkmark.circle.fill")
        }
    }
}

// MARK: - Interactive Quick Log Widget
struct LifeLogQuickLogWidgetView: View {
    var entry: LifeLogEntry
    
    var body: some View {
        VStack(spacing: 12) {
            Text("Quick Log")
                .font(.headline)
            
            HStack(spacing: 8) {
                Button(intent: QuickFocusIntent()) {
                    VStack {
                        Image(systemName: "brain.head.profile")
                            .font(.title2)
                        Text("Focus")
                            .font(.caption2)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(Color(hex: "10b981")!.opacity(0.2))
                    .cornerRadius(8)
                }
                .buttonStyle(.plain)
                
                Button(intent: QuickMeetingIntent()) {
                    VStack {
                        Image(systemName: "person.3.fill")
                            .font(.title2)
                        Text("Meeting")
                            .font(.caption2)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(Color(hex: "f59e0b")!.opacity(0.2))
                    .cornerRadius(8)
                }
                .buttonStyle(.plain)
            }
            
            HStack(spacing: 8) {
                Button(intent: QuickBreakIntent()) {
                    VStack {
                        Image(systemName: "cup.and.saucer.fill")
                            .font(.title2)
                        Text("Break")
                            .font(.caption2)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(Color.gray.opacity(0.2))
                    .cornerRadius(8)
                }
                .buttonStyle(.plain)
                
                Button(intent: QuickCoffeeIntent()) {
                    VStack {
                        Image(systemName: "mug.fill")
                            .font(.title2)
                        Text("Coffee")
                            .font(.caption2)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(Color(hex: "8b5a2b")!.opacity(0.2))
                    .cornerRadius(8)
                }
                .buttonStyle(.plain)
            }
        }
        .padding()
        .containerBackground(for: .widget) {
            Color(hex: "1a1a1a")!
        }
    }
}

// MARK: - Main Progress Widget
struct LifeLogWidget: Widget {
    let kind: String = "LifeLogWidget"
    
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: LifeLogProvider()) { entry in
            LifeLogWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("LifeLog Progress")
        .description("Track your daily focus time, goals, and streaks.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        .contentMarginsDisabled()
    }
}

// MARK: - Widget Entry View (Size-Aware)
struct LifeLogWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    var entry: LifeLogEntry
    
    var body: some View {
        switch family {
        case .systemSmall:
            LifeLogWidgetSmallView(entry: entry)
        case .systemMedium:
            LifeLogWidgetMediumView(entry: entry)
        case .systemLarge:
            LifeLogWidgetLargeView(entry: entry)
        default:
            LifeLogWidgetMediumView(entry: entry)
        }
    }
}

// MARK: - Streak Lock Screen Widget
struct LifeLogStreakWidget: Widget {
    let kind: String = "LifeLogStreakWidget"
    
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: LifeLogProvider()) { entry in
            LifeLogLockScreenCircularView(entry: entry)
        }
        .configurationDisplayName("Streak Counter")
        .description("See your current streak on the lock screen.")
        .supportedFamilies([.accessoryCircular])
    }
}

// MARK: - Focus Lock Screen Widget
struct LifeLogFocusWidget: Widget {
    let kind: String = "LifeLogFocusWidget"
    
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: LifeLogProvider()) { entry in
            LifeLogFocusCircularView(entry: entry)
        }
        .configurationDisplayName("Focus Time")
        .description("Track your focus time on the lock screen.")
        .supportedFamilies([.accessoryCircular])
    }
}

// MARK: - Rectangular Stats Widget
struct LifeLogStatsWidget: Widget {
    let kind: String = "LifeLogStatsWidget"
    
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: LifeLogProvider()) { entry in
            LifeLogLockScreenRectangularView(entry: entry)
        }
        .configurationDisplayName("Quick Stats")
        .description("See your stats at a glance.")
        .supportedFamilies([.accessoryRectangular])
    }
}

// MARK: - Inline Widget
struct LifeLogInlineWidget: Widget {
    let kind: String = "LifeLogInlineWidget"
    
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: LifeLogProvider()) { entry in
            LifeLogLockScreenInlineView(entry: entry)
        }
        .configurationDisplayName("LifeLog Status")
        .description("See your streak and goals inline.")
        .supportedFamilies([.accessoryInline])
    }
}

// MARK: - Quick Log Interactive Widget
struct LifeLogQuickLogWidget: Widget {
    let kind: String = "LifeLogQuickLogWidget"
    
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: LifeLogProvider()) { entry in
            LifeLogQuickLogWidgetView(entry: entry)
        }
        .configurationDisplayName("Quick Log")
        .description("Log activities without opening the app.")
        .supportedFamilies([.systemMedium])
    }
}

// MARK: - Widget Bundle
@main
struct LifeLogWidgetBundle: WidgetBundle {
    var body: some Widget {
        LifeLogWidget()
        LifeLogQuickLogWidget()
        LifeLogStreakWidget()
        LifeLogFocusWidget()
        LifeLogStatsWidget()
        LifeLogInlineWidget()
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

#Preview("Large Widget", as: .systemLarge) {
    LifeLogWidget()
} timeline: {
    LifeLogEntry(date: Date(), focusMinutes: 180, goalsCompleted: 2, totalGoals: 3, maxStreak: 7, lastCheckIn: "Started focus session", todayCheckIns: 5)
}

#Preview("Medium Widget", as: .systemMedium) {
    LifeLogWidget()
} timeline: {
    LifeLogEntry(date: Date(), focusMinutes: 180, goalsCompleted: 2, totalGoals: 3, maxStreak: 7, lastCheckIn: nil, todayCheckIns: 5)
}

#Preview("Quick Log Widget", as: .systemMedium) {
    LifeLogQuickLogWidget()
} timeline: {
    LifeLogEntry(date: Date(), focusMinutes: 180, goalsCompleted: 2, totalGoals: 3, maxStreak: 7, lastCheckIn: nil, todayCheckIns: 5)
}

#Preview("Small Widget", as: .systemSmall) {
    LifeLogWidget()
} timeline: {
    LifeLogEntry(date: Date(), focusMinutes: 180, goalsCompleted: 2, totalGoals: 3, maxStreak: 7, lastCheckIn: nil, todayCheckIns: 5)
}
