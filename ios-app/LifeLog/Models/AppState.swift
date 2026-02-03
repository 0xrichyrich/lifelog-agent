//
//  AppState.swift
//  LifeLog
//
//  Created by Joshua Rich on 2026-02-02.
//

import SwiftUI

@Observable
final class AppState {
    // Settings
    var apiEndpoint: String {
        didSet {
            UserDefaults.standard.set(apiEndpoint, forKey: "apiEndpoint")
        }
    }
    
    var notificationsEnabled: Bool {
        didSet {
            UserDefaults.standard.set(notificationsEnabled, forKey: "notificationsEnabled")
        }
    }
    
    var collectScreenshots: Bool {
        didSet {
            UserDefaults.standard.set(collectScreenshots, forKey: "collectScreenshots")
        }
    }
    
    var collectAudio: Bool {
        didSet {
            UserDefaults.standard.set(collectAudio, forKey: "collectAudio")
        }
    }
    
    var collectCamera: Bool {
        didSet {
            UserDefaults.standard.set(collectCamera, forKey: "collectCamera")
        }
    }
    
    // Cache
    var activities: [Activity] = []
    var goals: [Goal] = []
    var checkIns: [CheckIn] = []
    var isLoading = false
    var errorMessage: String?
    
    init() {
        self.apiEndpoint = UserDefaults.standard.string(forKey: "apiEndpoint") ?? "http://localhost:3000"
        self.notificationsEnabled = UserDefaults.standard.bool(forKey: "notificationsEnabled")
        self.collectScreenshots = UserDefaults.standard.object(forKey: "collectScreenshots") as? Bool ?? true
        self.collectAudio = UserDefaults.standard.object(forKey: "collectAudio") as? Bool ?? true
        self.collectCamera = UserDefaults.standard.bool(forKey: "collectCamera")
    }
}

// MARK: - App Group for Widgets
extension AppState {
    static let appGroup = "group.com.skynet.lifelog"
    
    static var sharedDefaults: UserDefaults? {
        UserDefaults(suiteName: appGroup)
    }
    
    func syncToSharedDefaults() {
        Self.sharedDefaults?.set(apiEndpoint, forKey: "apiEndpoint")
        Self.sharedDefaults?.set(goals.count, forKey: "goalsCount")
        Self.sharedDefaults?.set(goals.filter { $0.current >= $0.target }.count, forKey: "goalsCompleted")
        
        // Calculate max streak
        let maxStreak = goals.map(\.streak).max() ?? 0
        Self.sharedDefaults?.set(maxStreak, forKey: "maxStreak")
        
        // Calculate total focus minutes today
        let focusMinutes = activities
            .filter { $0.category == .focus }
            .reduce(0) { $0 + ($1.duration ?? 0) } / 60
        Self.sharedDefaults?.set(focusMinutes, forKey: "focusMinutes")
    }
}
