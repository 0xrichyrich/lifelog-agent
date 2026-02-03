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
    @State private var hasCompletedOnboarding = UserDefaults.standard.bool(forKey: "hasCompletedOnboarding")
    
    var body: some Scene {
        WindowGroup {
            if hasCompletedOnboarding {
                ContentView()
                    .environment(appState)
                    .preferredColorScheme(.dark)
            } else {
                OnboardingView(hasCompletedOnboarding: $hasCompletedOnboarding)
                    .environment(appState)
                    .preferredColorScheme(.dark)
            }
        }
    }
}
