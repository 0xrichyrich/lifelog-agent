//
//  LifeLogApp.swift
//  LifeLog
//
//  Created by Joshua Rich on 2026-02-02.
//  Updated with widget/shortcuts integration and haptic feedback
//

import SwiftUI
import UserNotifications
import WidgetKit

@main
struct LifeLogApp: App {
    @State private var appState = AppState()
    private var privyService = PrivyService.shared
    @State private var hasCompletedOnboarding = UserDefaults.standard.bool(forKey: "hasCompletedOnboarding")
    @Environment(\.scenePhase) private var scenePhase
    
    private let apiClient = APIClient()
    
    var body: some Scene {
        WindowGroup {
            if hasCompletedOnboarding {
                ContentView()
                    .environment(appState)
                    .environmentObject(privyService)
                    .preferredColorScheme(.light)
                    .onAppear {
                        setupApp()
                    }
                    .onChange(of: scenePhase) { _, newPhase in
                        handleScenePhaseChange(newPhase)
                    }
            } else {
                OnboardingView(hasCompletedOnboarding: $hasCompletedOnboarding)
                    .environment(appState)
                    .environmentObject(privyService)
                    .preferredColorScheme(.light)
            }
        }
    }
    
    // MARK: - Setup
    
    private func setupApp() {
        // Register for remote notifications
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { _, _ in }
        
        // Process any pending quick logs from widgets/shortcuts
        processPendingQuickLogs()
        
        // Refresh widgets
        WidgetCenter.shared.reloadAllTimelines()
    }
    
    // MARK: - Scene Phase Handling
    
    private func handleScenePhaseChange(_ phase: ScenePhase) {
        switch phase {
        case .active:
            // App became active - check for pending quick logs
            processPendingQuickLogs()
            
            // Light haptic to acknowledge app becoming active
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            
        case .background:
            // App going to background - sync to widgets
            appState.syncToSharedDefaults()
            WidgetCenter.shared.reloadAllTimelines()
            
        case .inactive:
            break
            
        @unknown default:
            break
        }
    }
    
    // MARK: - Process Pending Quick Logs
    
    private func processPendingQuickLogs() {
        guard let defaults = UserDefaults(suiteName: AppState.appGroup) else { return }
        
        guard let pendingMessage = defaults.string(forKey: "pendingQuickLog"),
              let pendingTime = defaults.object(forKey: "pendingQuickLogTime") as? Double else {
            return
        }
        
        // Only process if it's recent (within last 5 minutes)
        let logTime = Date(timeIntervalSince1970: pendingTime)
        guard abs(logTime.timeIntervalSinceNow) < 300 else {
            // Clear stale pending log
            defaults.removeObject(forKey: "pendingQuickLog")
            defaults.removeObject(forKey: "pendingQuickLogTime")
            return
        }
        
        // Create the check-in
        Task {
            do {
                await apiClient.updateBaseURL(appState.apiEndpoint)
                _ = try await apiClient.createCheckIn(message: pendingMessage)
                
                // Clear the pending log
                await MainActor.run {
                    defaults.removeObject(forKey: "pendingQuickLog")
                    defaults.removeObject(forKey: "pendingQuickLogTime")
                    defaults.removeObject(forKey: "pendingActivityType")
                    
                    // Update last check-in for widgets
                    defaults.set(pendingMessage, forKey: "lastCheckIn")
                    let todayCheckIns = defaults.integer(forKey: "todayCheckIns") + 1
                    defaults.set(todayCheckIns, forKey: "todayCheckIns")
                    
                    // Haptic feedback for success
                    UINotificationFeedbackGenerator().notificationOccurred(.success)
                    
                    // Refresh widgets
                    WidgetCenter.shared.reloadAllTimelines()
                }
            } catch {
                print("Failed to process pending quick log: \(error)")
                // Don't clear on failure - will retry next time
            }
        }
    }
}

// MARK: - Reset Today's Stats (at midnight)
extension AppState {
    func resetDailyStatsIfNeeded() {
        let defaults = Self.sharedDefaults
        
        guard let lastResetDate = defaults?.object(forKey: "lastDailyReset") as? Date else {
            // First run - set the reset date
            defaults?.set(Date(), forKey: "lastDailyReset")
            return
        }
        
        // Check if it's a new day
        if !Calendar.current.isDateInToday(lastResetDate) {
            defaults?.set(0, forKey: "todayCheckIns")
            defaults?.set(0, forKey: "focusMinutes")
            defaults?.set(Date(), forKey: "lastDailyReset")
            defaults?.removeObject(forKey: "lastCheckIn")
        }
    }
}
