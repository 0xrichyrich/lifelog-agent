//
//  SettingsView.swift
//  LifeLog
//
//  Created by Joshua Rich on 2026-02-02.
//  Updated with Health integration and Shortcuts settings
//

import SwiftUI
import UserNotifications
import HealthKit

struct SettingsView: View {
    @Environment(AppState.self) private var appState
    @EnvironmentObject private var privyService: PrivyService
    @State private var showingExportSheet = false
    @State private var showingAboutSheet = false
    @State private var showingLeaderboard = false
    @State private var notificationStatus: UNAuthorizationStatus = .notDetermined
    @State private var healthAuthorized = false
    @State private var showingHealthAlert = false
    @StateObject private var healthService = HealthKitService()
    @StateObject private var xpService = XPService()
    
    var body: some View {
        @Bindable var state = appState
        
        NavigationStack {
            List {
                // XP Progress Section
                Section {
                    XPProgressView(
                        status: xpService.status,
                        isLoading: xpService.isLoading
                    ) {
                        showingLeaderboard = true
                    }
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
                } header: {
                    HStack {
                        Text("Your Progress")
                        Spacer()
                        if xpService.status != nil {
                            Button {
                                Task {
                                    await refreshXP()
                                }
                            } label: {
                                Image(systemName: "arrow.clockwise")
                                    .font(.caption)
                            }
                        }
                    }
                }
                
                // Wallet
                Section {
                    NavigationLink {
                        WalletView()
                            .environment(appState)
                            .environmentObject(privyService)
                    } label: {
                        HStack {
                            Image(systemName: "wallet.bifold.fill")
                                .foregroundStyle(Color.brandAccent)
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Wallet")
                                Text("Earn $NUDGE tokens for check-ins")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            if UserDefaults.standard.bool(forKey: NudgeConstants.UserDefaultsKeys.walletConnected) {
                                HStack(spacing: 4) {
                                    Circle()
                                        .fill(Color.success)
                                        .frame(width: 6, height: 6)
                                    Text("Connected")
                                        .font(.caption)
                                        .foregroundStyle(Color.success)
                                }
                            }
                        }
                    }
                } header: {
                    Text("Rewards")
                } footer: {
                    Text("Connect your wallet to earn $NUDGE tokens on Monad Testnet.")
                }
                
                // Integrations
                Section {
                    // Apple Health
                    HStack {
                        Image(systemName: "heart.fill")
                            .foregroundStyle(.red)
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Apple Health")
                            Text("Steps, sleep, and activity data")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        if healthService.isAuthorized {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(.green)
                        } else {
                            Button("Connect") {
                                connectHealth()
                            }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                        }
                    }
                    
                    // Siri & Shortcuts
                    Button {
                        openShortcutsSettings()
                    } label: {
                        HStack {
                            Image(systemName: "wand.and.stars")
                                .foregroundStyle(Color.brandAccent)
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Siri & Shortcuts")
                                Text("\"Hey Siri, log focus in Nudge\"")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .foregroundStyle(Color.textPrimary)
                } header: {
                    Text("Integrations")
                } footer: {
                    Text("Connect services to automatically track your activities.")
                }
                
                // Notifications
                Section("Notifications") {
                    Toggle(isOn: $state.notificationsEnabled) {
                        HStack {
                            Image(systemName: "bell.badge")
                                .foregroundStyle(Color.brandAccent)
                            Text("Enable Notifications")
                        }
                    }
                    .onChange(of: state.notificationsEnabled) { _, newValue in
                        if newValue {
                            requestNotifications()
                        }
                    }
                    
                    if notificationStatus == .denied {
                        Button {
                            openSettings()
                        } label: {
                            HStack {
                                Image(systemName: "gear")
                                Text("Open Settings to Enable")
                            }
                            .foregroundStyle(Color.warning)
                        }
                    }
                }
                
                // Privacy
                Section {
                    Toggle(isOn: $state.collectScreenshots) {
                        HStack {
                            Image(systemName: "camera.metering.spot")
                                .foregroundStyle(Color.brandAccent)
                            VStack(alignment: .leading) {
                                Text("Screenshot Collection")
                                Text("Capture workspace screenshots")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                    
                    Toggle(isOn: $state.collectAudio) {
                        HStack {
                            Image(systemName: "waveform")
                                .foregroundStyle(Color.brandAccent)
                            VStack(alignment: .leading) {
                                Text("Audio Recording")
                                Text("Record ambient audio")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                    
                    Toggle(isOn: $state.collectCamera) {
                        HStack {
                            Image(systemName: "camera")
                                .foregroundStyle(Color.brandAccent)
                            VStack(alignment: .leading) {
                                Text("Camera Snapshots")
                                Text("Periodic workspace photos")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                } header: {
                    Text("Privacy & Data Collection")
                } footer: {
                    Text("All data is processed locally. Nothing is shared without your consent.")
                }
                
                // Widgets
                Section {
                    Button {
                        openWidgetGallery()
                    } label: {
                        HStack {
                            Image(systemName: "square.grid.2x2")
                                .foregroundStyle(Color.brandAccent)
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Add Widgets")
                                Text("Home Screen & Lock Screen widgets")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .foregroundStyle(Color.textPrimary)
                } header: {
                    Text("Widgets")
                } footer: {
                    Text("Log activities and track progress without opening the app.")
                }
                
                // Data
                Section("Data") {
                    Button {
                        showingExportSheet = true
                    } label: {
                        HStack {
                            Image(systemName: "square.and.arrow.up")
                                .foregroundStyle(Color.brandAccent)
                            Text("Export Data")
                        }
                    }
                    
                    Button(role: .destructive) {
                        clearLocalCache()
                    } label: {
                        HStack {
                            Image(systemName: "trash")
                            Text("Clear Local Cache")
                        }
                    }
                }
                
                // About
                Section("About") {
                    Button {
                        showingAboutSheet = true
                    } label: {
                        HStack {
                            Image(systemName: "info.circle")
                                .foregroundStyle(Color.brandAccent)
                            Text("About Nudge")
                        }
                    }
                    
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("1.0.0")
                            .foregroundStyle(.secondary)
                    }
                    
                    Link(destination: URL(string: "https://github.com/0xrichyrich/lifelog-agent")!) {
                        HStack {
                            Image(systemName: "link")
                                .foregroundStyle(Color.brandAccent)
                            Text("GitHub Repository")
                            Spacer()
                            Image(systemName: "arrow.up.right")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .foregroundStyle(Color.textPrimary)
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.large)
            .onAppear {
                checkNotificationStatus()
                healthService.checkAuthorizationStatus()
                Task {
                    await refreshXP()
                }
            }
            .sheet(isPresented: $showingExportSheet) {
                ExportSheet()
            }
            .sheet(isPresented: $showingAboutSheet) {
                AboutSheet()
            }
            .sheet(isPresented: $showingLeaderboard) {
                LeaderboardSheet(xpService: xpService)
            }
            .alert("Apple Health", isPresented: $showingHealthAlert) {
                Button("Open Settings", role: .none) {
                    openSettings()
                }
                Button("OK", role: .cancel) {}
            } message: {
                Text("Health data access was denied. Please enable it in Settings > Privacy > Health.")
            }
        }
    }
    
    // MARK: - XP Actions
    private func refreshXP() async {
        // Use wallet address as userId if available, otherwise use device ID
        let userId = privyService.walletAddress ?? UIDevice.current.identifierForVendor?.uuidString ?? "anonymous"
        xpService.updateConfig(baseURL: appState.apiEndpoint, apiKey: appState.apiKey)
        await xpService.fetchStatus(userId: userId)
    }
    
    // MARK: - Actions
    private func connectHealth() {
        Task {
            do {
                // Request authorization - this shows the iOS HealthKit permission dialog
                try await healthService.requestAuthorization()
                
                // Mark that we've completed the authorization flow
                // (iOS doesn't tell us if user denied read access for privacy reasons)
                healthService.markAuthorizationCompleted()
                
                // Try to fetch data - if user granted access, this works
                try await healthService.fetchTodayData()
                UINotificationFeedbackGenerator().notificationOccurred(.success)
            } catch HealthKitError.notAvailable {
                // HealthKit not available on this device (e.g., iPad without HealthKit)
                await MainActor.run {
                    showingHealthAlert = true
                    UINotificationFeedbackGenerator().notificationOccurred(.error)
                }
            } catch {
                // Other errors - authorization completed but data fetch may have failed
                // Still mark as completed since the dialog was shown
                healthService.markAuthorizationCompleted()
                UINotificationFeedbackGenerator().notificationOccurred(.success)
            }
        }
    }
    
    private func openShortcutsSettings() {
        if let url = URL(string: "shortcuts://") {
            UIApplication.shared.open(url)
        }
    }
    
    private func openWidgetGallery() {
        // iOS doesn't have a direct URL to widget gallery, guide user
        // Show a tip instead
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }
    
    private func requestNotifications() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, _ in
            DispatchQueue.main.async {
                if !granted {
                    appState.notificationsEnabled = false
                }
                checkNotificationStatus()
            }
        }
    }
    
    private func checkNotificationStatus() {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            let status = settings.authorizationStatus
            DispatchQueue.main.async {
                notificationStatus = status
                // Sync toggle with actual system permission status
                let isAuthorized = (status == .authorized || status == .provisional)
                if appState.notificationsEnabled != isAuthorized {
                    appState.notificationsEnabled = isAuthorized
                }
            }
        }
    }
    
    private func openSettings() {
        if let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
        }
    }
    
    private func clearLocalCache() {
        appState.activities = []
        appState.goals = []
        appState.checkIns = []
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }
}

// MARK: - Export Sheet
struct ExportSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var isExporting = false
    @State private var exportData: String = ""
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Image(systemName: "square.and.arrow.up.circle.fill")
                    .font(.system(size: 64))
                    .foregroundStyle(Color.brandAccent)
                
                Text("Export Your Data")
                    .font(.title2)
                    .fontWeight(.semibold)
                
                Text("Download all your Nudge data in JSON format.")
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.secondary)
                
                if isExporting {
                    ProgressView()
                } else {
                    Button {
                        exportData = generateExportData()
                    } label: {
                        HStack {
                            Image(systemName: "arrow.down.doc")
                            Text("Generate Export")
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.brandAccent)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                }
                
                if !exportData.isEmpty {
                    ShareLink(item: exportData) {
                        HStack {
                            Image(systemName: "square.and.arrow.up")
                            Text("Share Export")
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.success)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                }
                
                Spacer()
            }
            .padding()
            .navigationTitle("Export Data")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
        .presentationDetents([.medium])
    }
    
    private func generateExportData() -> String {
        let export: [String: Any] = [
            "exportedAt": ISO8601DateFormatter().string(from: Date()),
            "version": "1.0.0",
            "message": "Export from Nudge iOS app"
        ]
        
        if let data = try? JSONSerialization.data(withJSONObject: export, options: .prettyPrinted),
           let string = String(data: data, encoding: .utf8) {
            return string
        }
        return "{}"
    }
}

// MARK: - About Sheet
struct AboutSheet: View {
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Mascot instead of brain icon
                    Image("MascotWave")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 120, height: 120)
                    
                    Text("Nudge")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .foregroundStyle(Color.textPrimary)
                    
                    Text("Sometimes you need a little nudge")
                        .foregroundStyle(Color.textSecondary)
                    
                    VStack(alignment: .leading, spacing: 16) {
                        FeatureRow(icon: "square.and.pencil", title: "Quick Check-ins", description: "Log thoughts instantly with voice or text")
                        FeatureRow(icon: "calendar.day.timeline.left", title: "Visual Timeline", description: "See your day at a glance")
                        FeatureRow(icon: "target", title: "Goal Tracking", description: "Build streaks and hit your targets")
                        FeatureRow(icon: "bell.badge", title: "Smart Nudges", description: "Get coached to stay on track")
                        FeatureRow(icon: "heart.fill", title: "Health Integration", description: "Sync with Apple Health")
                        FeatureRow(icon: "wand.and.stars", title: "Siri Shortcuts", description: "Log activities with your voice")
                    }
                    .padding()
                    .background(Color.cardBackground)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .shadow(color: .black.opacity(0.05), radius: 8, y: 2)
                    
                    Text("Built with ❤️ for the Moltiverse Hackathon")
                        .font(.caption)
                        .foregroundStyle(Color.textSecondary)
                }
                .padding()
            }
            .background(Color.background)
            .navigationTitle("About")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

// MARK: - Leaderboard Sheet
struct LeaderboardSheet: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var xpService: XPService
    
    var body: some View {
        NavigationStack {
            Group {
                if xpService.leaderboard.isEmpty {
                    VStack(spacing: 16) {
                        ProgressView()
                        Text("Loading leaderboard...")
                            .font(.caption)
                            .foregroundStyle(Color.textSecondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List {
                        ForEach(xpService.leaderboard) { entry in
                            LeaderboardRowView(entry: entry)
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .background(Color.background)
            .navigationTitle("Weekly Leaderboard")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
            .onAppear {
                Task {
                    await xpService.fetchLeaderboard()
                }
            }
        }
        .presentationDetents([.medium, .large])
    }
}

struct LeaderboardRowView: View {
    let entry: LeaderboardEntry
    
    var body: some View {
        HStack(spacing: 16) {
            // Rank
            ZStack {
                Circle()
                    .fill(rankColor)
                    .frame(width: 36, height: 36)
                
                if entry.rank <= 3 {
                    Image(systemName: rankIcon)
                        .font(.headline)
                        .foregroundStyle(.white)
                } else {
                    Text("\(entry.rank)")
                        .font(.headline)
                        .fontWeight(.bold)
                        .foregroundStyle(.white)
                }
            }
            
            // User info
            VStack(alignment: .leading, spacing: 2) {
                Text(entry.userId)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(Color.textPrimary)
                
                Text("Level \(entry.level)")
                    .font(.caption)
                    .foregroundStyle(Color.textSecondary)
            }
            
            Spacer()
            
            // XP
            VStack(alignment: .trailing, spacing: 2) {
                Text("\(entry.totalXP)")
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundStyle(Color.brandInteractive)
                
                Text("XP")
                    .font(.caption2)
                    .foregroundStyle(Color.textSecondary)
            }
        }
        .padding(.vertical, 4)
    }
    
    private var rankColor: Color {
        switch entry.rank {
        case 1: return Color(hex: "FFD700") ?? .yellow // Gold
        case 2: return Color(hex: "C0C0C0") ?? .gray // Silver
        case 3: return Color(hex: "CD7F32") ?? .orange // Bronze
        default: return Color.brandAccent
        }
    }
    
    private var rankIcon: String {
        switch entry.rank {
        case 1: return "crown.fill"
        case 2: return "medal.fill"
        case 3: return "star.fill"
        default: return ""
        }
    }
}

struct FeatureRow: View {
    let icon: String
    let title: String
    let description: String
    
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(Color.brandAccent)
                .frame(width: 40)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .fontWeight(.semibold)
                    .foregroundStyle(Color.textPrimary)
                Text(description)
                    .font(.caption)
                    .foregroundStyle(Color.textSecondary)
            }
        }
    }
}

#Preview {
    SettingsView()
        .environment(AppState())
}
