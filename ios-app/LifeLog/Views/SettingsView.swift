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
    @State private var showingExportSheet = false
    @State private var showingAboutSheet = false
    @State private var notificationStatus: UNAuthorizationStatus = .notDetermined
    @State private var healthAuthorized = false
    @State private var showingHealthAlert = false
    @StateObject private var healthService = HealthKitService()
    
    var body: some View {
        @Bindable var state = appState
        
        NavigationStack {
            List {
                // API Configuration
                Section {
                    HStack {
                        Image(systemName: "server.rack")
                            .foregroundStyle(Color.brandAccent)
                        TextField("API Endpoint", text: $state.apiEndpoint)
                            .textContentType(.URL)
                            .autocapitalization(.none)
                            .keyboardType(.URL)
                    }
                    
                    HStack {
                        Image(systemName: "key.fill")
                            .foregroundStyle(Color.brandAccent)
                        SecureField("API Key", text: $state.apiKey)
                            .textContentType(.password)
                            .autocapitalization(.none)
                    }
                    
                    Button {
                        Task {
                            await testConnection()
                        }
                    } label: {
                        HStack {
                            Image(systemName: "antenna.radiowaves.left.and.right")
                            Text("Test Connection")
                        }
                    }
                } header: {
                    Text("API Configuration")
                } footer: {
                    Text("API key is stored securely in your device's Keychain.")
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
            }
            .sheet(isPresented: $showingExportSheet) {
                ExportSheet()
            }
            .sheet(isPresented: $showingAboutSheet) {
                AboutSheet()
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
    
    // MARK: - Actions
    private func connectHealth() {
        Task {
            do {
                try await healthService.requestAuthorization()
                try await healthService.fetchTodayData()
                UINotificationFeedbackGenerator().notificationOccurred(.success)
            } catch {
                await MainActor.run {
                    showingHealthAlert = true
                    UINotificationFeedbackGenerator().notificationOccurred(.error)
                }
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
    
    private func testConnection() async {
        guard let url = URL(string: "\(appState.apiEndpoint)/api/goals") else {
            return
        }
        
        do {
            let (_, response) = try await URLSession.shared.data(from: url)
            if let httpResponse = response as? HTTPURLResponse,
               httpResponse.statusCode == 200 {
                await MainActor.run {
                    UINotificationFeedbackGenerator().notificationOccurred(.success)
                }
            } else {
                await MainActor.run {
                    UINotificationFeedbackGenerator().notificationOccurred(.error)
                }
            }
        } catch {
            await MainActor.run {
                UINotificationFeedbackGenerator().notificationOccurred(.error)
            }
        }
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
                    Image(systemName: "brain.fill")
                        .font(.system(size: 80))
                        .foregroundStyle(Color.brandAccent)
                    
                    Text("Nudge")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                    
                    Text("Sometimes you need a little nudge")
                        .foregroundStyle(.secondary)
                    
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
                    
                    Text("Built with ❤️ for the Moltiverse Hackathon")
                        .font(.caption)
                        .foregroundStyle(.secondary)
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
                Text(description)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

#Preview {
    SettingsView()
        .environment(AppState())
}
