//
//  SettingsView.swift
//  LifeLog
//
//  Created by Joshua Rich on 2026-02-02.
//

import SwiftUI
import UserNotifications

struct SettingsView: View {
    @Environment(AppState.self) private var appState
    @State private var showingExportSheet = false
    @State private var showingAboutSheet = false
    @State private var notificationStatus: UNAuthorizationStatus = .notDetermined
    
    var body: some View {
        @Bindable var state = appState
        
        NavigationStack {
            List {
                // API Configuration
                Section("API Configuration") {
                    HStack {
                        Image(systemName: "server.rack")
                            .foregroundStyle(Color.accent)
                        TextField("API Endpoint", text: $state.apiEndpoint)
                            .textContentType(.URL)
                            .autocapitalization(.none)
                            .keyboardType(.URL)
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
                }
                
                // Notifications
                Section("Notifications") {
                    Toggle(isOn: $state.notificationsEnabled) {
                        HStack {
                            Image(systemName: "bell.badge")
                                .foregroundStyle(Color.accent)
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
                Section("Privacy & Data Collection") {
                    Toggle(isOn: $state.collectScreenshots) {
                        HStack {
                            Image(systemName: "camera.metering.spot")
                                .foregroundStyle(Color.accent)
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
                                .foregroundStyle(Color.accent)
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
                                .foregroundStyle(Color.accent)
                            VStack(alignment: .leading) {
                                Text("Camera Snapshots")
                                Text("Periodic workspace photos")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
                
                // Data
                Section("Data") {
                    Button {
                        showingExportSheet = true
                    } label: {
                        HStack {
                            Image(systemName: "square.and.arrow.up")
                                .foregroundStyle(Color.accent)
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
                                .foregroundStyle(Color.accent)
                            Text("About LifeLog")
                        }
                    }
                    
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("1.0.0")
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.large)
            .onAppear {
                checkNotificationStatus()
            }
            .sheet(isPresented: $showingExportSheet) {
                ExportSheet()
            }
            .sheet(isPresented: $showingAboutSheet) {
                AboutSheet()
            }
        }
    }
    
    // MARK: - Actions
    private func testConnection() async {
        // Simple connectivity test
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
            DispatchQueue.main.async {
                notificationStatus = settings.authorizationStatus
            }
        }
    }
    
    private func openSettings() {
        if let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
        }
    }
    
    private func clearLocalCache() {
        // Clear UserDefaults cache (except settings)
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
                    .foregroundStyle(Color.accent)
                
                Text("Export Your Data")
                    .font(.title2)
                    .fontWeight(.semibold)
                
                Text("Download all your LifeLog data in JSON format.")
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
                        .background(Color.accent)
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
            "message": "Export from LifeLog iOS app"
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
                        .foregroundStyle(Color.accent)
                    
                    Text("LifeLog")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                    
                    Text("Your personal life logging companion")
                        .foregroundStyle(.secondary)
                    
                    VStack(alignment: .leading, spacing: 16) {
                        FeatureRow(icon: "square.and.pencil", title: "Quick Check-ins", description: "Log thoughts instantly with voice or text")
                        FeatureRow(icon: "calendar.day.timeline.left", title: "Visual Timeline", description: "See your day at a glance")
                        FeatureRow(icon: "target", title: "Goal Tracking", description: "Build streaks and hit your targets")
                        FeatureRow(icon: "bell.badge", title: "Smart Nudges", description: "Get coached to stay on track")
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
                .foregroundStyle(Color.accent)
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
