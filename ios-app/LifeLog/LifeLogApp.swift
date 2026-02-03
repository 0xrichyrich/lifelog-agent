//
//  LifeLogApp.swift
//  LifeLog
//
//  Created by Joshua Rich on 2026-02-02.
//

import SwiftUI
import UserNotifications

@main
struct LifeLogApp: App {
    @State private var appState = AppState()
    
    init() {
        // Request notification permissions on first launch
        requestNotificationPermissions()
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(appState)
                .preferredColorScheme(.dark)
        }
    }
    
    private func requestNotificationPermissions() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            if granted {
                print("Notification permissions granted")
            } else if let error = error {
                print("Error requesting notifications: \(error)")
            }
        }
    }
}
