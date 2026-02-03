//
//  AppIntents.swift
//  LifeLog
//
//  Shortcuts support - "Log coffee", "Start focus session", Siri integration
//

import AppIntents
import SwiftUI

// MARK: - Log Activity Intent

struct LogActivityIntent: AppIntent {
    static let title: LocalizedStringResource = "Log Activity"
    static let description = IntentDescription("Log an activity to LifeLog")
    static let openAppWhenRun: Bool = false
    
    @Parameter(title: "Activity Type")
    var activityType: ActivityTypeEntity
    
    @Parameter(title: "Custom Message", default: "")
    var customMessage: String
    
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let message = customMessage.isEmpty ? activityType.message : customMessage
        
        // Save to pending logs for the app to process
        let defaults = UserDefaults(suiteName: "group.com.skynet.lifelog")
        defaults?.set(message, forKey: "pendingQuickLog")
        defaults?.set(Date().timeIntervalSince1970, forKey: "pendingQuickLogTime")
        defaults?.set(activityType.id, forKey: "pendingActivityType")
        
        // Trigger widget refresh
        // Note: In a real app, you'd also call the API here
        
        return .result(dialog: "Logged: \(message)")
    }
}

// MARK: - Activity Type Entity

struct ActivityTypeEntity: AppEntity {
    static let typeDisplayRepresentation: TypeDisplayRepresentation = "Activity Type"
    static let defaultQuery = ActivityTypeQuery()
    
    var id: String
    var name: String
    var message: String
    var icon: String
    
    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(
            title: "\(name)",
            subtitle: "\(message)",
            image: .init(systemName: icon)
        )
    }
    
    static let allTypes: [ActivityTypeEntity] = [
        ActivityTypeEntity(id: "focus", name: "Focus", message: "Started focus session", icon: "brain.head.profile"),
        ActivityTypeEntity(id: "meeting", name: "Meeting", message: "In a meeting", icon: "person.3.fill"),
        ActivityTypeEntity(id: "break", name: "Break", message: "Taking a break", icon: "cup.and.saucer.fill"),
        ActivityTypeEntity(id: "coffee", name: "Coffee", message: "Coffee break ☕️", icon: "mug.fill"),
        ActivityTypeEntity(id: "exercise", name: "Exercise", message: "Exercising 💪", icon: "figure.run"),
        ActivityTypeEntity(id: "reading", name: "Reading", message: "Reading session 📚", icon: "book.fill"),
        ActivityTypeEntity(id: "lunch", name: "Lunch", message: "Lunch break 🍽️", icon: "fork.knife"),
        ActivityTypeEntity(id: "walk", name: "Walk", message: "Going for a walk 🚶", icon: "figure.walk"),
        ActivityTypeEntity(id: "coding", name: "Coding", message: "Writing code 💻", icon: "chevron.left.forwardslash.chevron.right"),
        ActivityTypeEntity(id: "email", name: "Email", message: "Checking emails 📧", icon: "envelope.fill"),
    ]
}

struct ActivityTypeQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [ActivityTypeEntity] {
        ActivityTypeEntity.allTypes.filter { identifiers.contains($0.id) }
    }
    
    func suggestedEntities() async throws -> [ActivityTypeEntity] {
        ActivityTypeEntity.allTypes
    }
    
    func defaultResult() async -> ActivityTypeEntity? {
        ActivityTypeEntity.allTypes.first
    }
}

// MARK: - Quick Log Focus Intent

struct LogFocusIntent: AppIntent {
    static let title: LocalizedStringResource = "Log Focus Session"
    static let description = IntentDescription("Log a focus session to LifeLog")
    static let openAppWhenRun: Bool = false
    
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let defaults = UserDefaults(suiteName: "group.com.skynet.lifelog")
        defaults?.set("Started focus session", forKey: "pendingQuickLog")
        defaults?.set(Date().timeIntervalSince1970, forKey: "pendingQuickLogTime")
        
        return .result(dialog: "Logged: Started focus session 🧠")
    }
}

// MARK: - Quick Log Coffee Intent

struct LogCoffeeIntent: AppIntent {
    static let title: LocalizedStringResource = "Log Coffee Break"
    static let description = IntentDescription("Log a coffee break to LifeLog")
    static let openAppWhenRun: Bool = false
    
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let defaults = UserDefaults(suiteName: "group.com.skynet.lifelog")
        defaults?.set("Coffee break ☕️", forKey: "pendingQuickLog")
        defaults?.set(Date().timeIntervalSince1970, forKey: "pendingQuickLogTime")
        
        return .result(dialog: "Logged: Coffee break ☕️")
    }
}

// MARK: - Quick Log Meeting Intent

struct LogMeetingIntent: AppIntent {
    static let title: LocalizedStringResource = "Log Meeting"
    static let description = IntentDescription("Log a meeting to LifeLog")
    static let openAppWhenRun: Bool = false
    
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let defaults = UserDefaults(suiteName: "group.com.skynet.lifelog")
        defaults?.set("In a meeting", forKey: "pendingQuickLog")
        defaults?.set(Date().timeIntervalSince1970, forKey: "pendingQuickLogTime")
        
        return .result(dialog: "Logged: In a meeting 👥")
    }
}

// MARK: - Start Timer Intent

struct StartTimerIntent: AppIntent {
    static let title: LocalizedStringResource = "Start Focus Timer"
    static let description = IntentDescription("Start a focus timer in LifeLog")
    static let openAppWhenRun: Bool = false
    
    @Parameter(title: "Duration (minutes)", default: 25)
    var duration: Int
    
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let defaults = UserDefaults(suiteName: "group.com.skynet.lifelog")
        defaults?.set(true, forKey: "focusTimerActive")
        defaults?.set(Date().timeIntervalSince1970, forKey: "focusTimerStart")
        defaults?.set(duration * 60, forKey: "focusTimerDuration")
        
        return .result(dialog: "Started \(duration) minute focus timer ⏱️")
    }
}

// MARK: - Get Today Stats Intent

struct GetTodayStatsIntent: AppIntent {
    static let title: LocalizedStringResource = "Get Today's Stats"
    static let description = IntentDescription("Get your LifeLog stats for today")
    static let openAppWhenRun: Bool = false
    
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let defaults = UserDefaults(suiteName: "group.com.skynet.lifelog")
        
        let focusMinutes = defaults?.integer(forKey: "focusMinutes") ?? 0
        let goalsCompleted = defaults?.integer(forKey: "goalsCompleted") ?? 0
        let totalGoals = defaults?.integer(forKey: "goalsCount") ?? 0
        let maxStreak = defaults?.integer(forKey: "maxStreak") ?? 0
        
        let hours = focusMinutes / 60
        let mins = focusMinutes % 60
        let focusString = hours > 0 ? "\(hours)h \(mins)m" : "\(mins) minutes"
        
        return .result(dialog: "Today: \(focusString) focused, \(goalsCompleted)/\(totalGoals) goals completed, \(maxStreak) day streak 🔥")
    }
}

// MARK: - Log Custom Message Intent

struct LogCustomIntent: AppIntent {
    static let title: LocalizedStringResource = "Log Custom Note"
    static let description = IntentDescription("Log a custom note to LifeLog")
    static let openAppWhenRun: Bool = false
    
    @Parameter(title: "Message")
    var message: String
    
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let defaults = UserDefaults(suiteName: "group.com.skynet.lifelog")
        defaults?.set(message, forKey: "pendingQuickLog")
        defaults?.set(Date().timeIntervalSince1970, forKey: "pendingQuickLogTime")
        
        return .result(dialog: "Logged: \(message)")
    }
}

// MARK: - App Shortcuts Provider

struct LifeLogShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: LogFocusIntent(),
            phrases: [
                "Log focus in \(.applicationName)",
                "Start focus session in \(.applicationName)",
                "Log focus with \(.applicationName)"
            ],
            shortTitle: "Log Focus",
            systemImageName: "brain.head.profile"
        )
        
        AppShortcut(
            intent: LogCoffeeIntent(),
            phrases: [
                "Log coffee in \(.applicationName)",
                "Log coffee break in \(.applicationName)",
                "Coffee break with \(.applicationName)"
            ],
            shortTitle: "Log Coffee",
            systemImageName: "mug.fill"
        )
        
        AppShortcut(
            intent: LogMeetingIntent(),
            phrases: [
                "Log meeting in \(.applicationName)",
                "Start meeting in \(.applicationName)",
                "Log meeting with \(.applicationName)"
            ],
            shortTitle: "Log Meeting",
            systemImageName: "person.3.fill"
        )
        
        AppShortcut(
            intent: GetTodayStatsIntent(),
            phrases: [
                "Get my \(.applicationName) stats",
                "How's my day in \(.applicationName)",
                "Show today's stats in \(.applicationName)"
            ],
            shortTitle: "Today's Stats",
            systemImageName: "chart.bar.fill"
        )
        
        AppShortcut(
            intent: StartTimerIntent(),
            phrases: [
                "Start focus timer in \(.applicationName)",
                "Start pomodoro in \(.applicationName)"
            ],
            shortTitle: "Focus Timer",
            systemImageName: "timer"
        )
        
        AppShortcut(
            intent: LogActivityIntent(),
            phrases: [
                "Log activity in \(.applicationName)",
                "Log \(\.$activityType) in \(.applicationName)"
            ],
            shortTitle: "Log Activity",
            systemImageName: "square.and.pencil"
        )
    }
}
