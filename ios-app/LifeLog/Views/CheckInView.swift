//
//  CheckInView.swift
//  LifeLog
//
//  Created by Joshua Rich on 2026-02-02.
//  Updated with competitive polish recommendations
//

import SwiftUI
import AVFoundation
import PhotosUI

struct CheckInView: View {
    @Environment(AppState.self) private var appState
    @EnvironmentObject private var privyService: PrivyService
    @State private var messageText = ""
    @State private var isRecording = false
    @State private var audioRecorder: AVAudioRecorder?
    @State private var audioURL: URL?
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var capturedImage: UIImage?
    @State private var isSubmitting = false
    @State private var showingError = false
    @State private var errorMessage = ""
    @State private var recentCheckIns: [CheckIn] = []
    @State private var isLoadingCheckIns = true
    @State private var showCompletionAnimation = false
    @State private var loadError: Error?
    @State private var xpNotification: XPNotification?
    
    private let apiClient = APIClient()
    @StateObject private var xpService = XPService()
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Quick Log Grid (2-tap flow)
                    QuickLogGrid { type in
                        await quickLog(type: type)
                    }
                    
                    // Divider with "or"
                    HStack {
                        Rectangle()
                            .fill(Color.gray.opacity(0.3))
                            .frame(height: 1)
                        
                        Text("or write something")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .padding(.horizontal, 12)
                        
                        Rectangle()
                            .fill(Color.gray.opacity(0.3))
                            .frame(height: 1)
                    }
                    
                    // Input Section
                    inputSection
                    
                    // Action Buttons
                    actionButtons
                    
                    // Submit Button
                    submitButton
                    
                    // Recent Check-ins
                    recentSection
                }
                .padding()
            }
            .background(Color.background)
            .navigationTitle("Check In")
            .navigationBarTitleDisplayMode(.large)
            .refreshable {
                await loadCheckIns()
            }
            .onAppear {
                Task {
                    await loadCheckIns()
                }
            }
            .alert("Error", isPresented: $showingError) {
                Button("OK") { }
            } message: {
                Text(errorMessage)
            }
            .overlay {
                if showCompletionAnimation {
                    Color.black.opacity(0.3)
                        .ignoresSafeArea()
                        .transition(.opacity)
                    
                    CompletionAnimation(isAnimating: $showCompletionAnimation, color: .success)
                        .transition(.scale)
                }
            }
            .xpNotification($xpNotification)
        }
    }
    
    // MARK: - Input Section
    private var inputSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("What's on your mind?")
                .font(.headline)
                .foregroundStyle(Color.textPrimary)
            
            TextEditor(text: $messageText)
                .frame(minHeight: 100)
                .padding()
                .background(Color.cardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.brandAccent.opacity(0.3), lineWidth: 1)
                )
                .scrollContentBackground(.hidden)
                .foregroundStyle(Color.textPrimary)
            
            // Voice recording indicator
            if isRecording {
                HStack(spacing: 8) {
                    Circle()
                        .fill(Color.danger)
                        .frame(width: 12, height: 12)
                        .pulseAnimation(isAnimating: true)
                    
                    Text("Recording...")
                        .foregroundStyle(Color.danger)
                        .font(.caption)
                }
                .padding(.horizontal)
                .transition(.scale.combined(with: .opacity))
            }
            
            // Captured image preview
            if let image = capturedImage {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFit()
                    .frame(maxHeight: 200)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .overlay(alignment: .topTrailing) {
                        Button {
                            withAnimation(.quickBounce) {
                                capturedImage = nil
                            }
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .font(.title2)
                                .foregroundStyle(.white)
                                .background(Circle().fill(.black.opacity(0.5)))
                        }
                        .padding(8)
                    }
                    .transition(.scale.combined(with: .opacity))
            }
        }
        .animation(.smoothBounce, value: isRecording)
        .animation(.smoothBounce, value: capturedImage != nil)
    }
    
    // MARK: - Action Buttons
    private var actionButtons: some View {
        HStack(spacing: 16) {
            // Voice Button
            Button {
                toggleRecording()
            } label: {
                VStack(spacing: 8) {
                    ZStack {
                        Circle()
                            .fill(isRecording ? Color.danger.opacity(0.2) : Color.brandAccent.opacity(0.2))
                            .frame(width: 56, height: 56)
                        
                        Image(systemName: isRecording ? "stop.circle.fill" : "mic.circle.fill")
                            .font(.system(size: 32))
                            .foregroundStyle(isRecording ? Color.danger : Color.brandAccent)
                    }
                    
                    Text(isRecording ? "Stop" : "Voice")
                        .font(.caption)
                        .foregroundStyle(Color.textPrimary)
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.cardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .sensoryFeedback(.impact(weight: .medium), trigger: isRecording)
            
            // Camera Button
            PhotosPicker(selection: $selectedPhoto, matching: .images) {
                VStack(spacing: 8) {
                    ZStack {
                        Circle()
                            .fill(Color.brandAccent.opacity(0.2))
                            .frame(width: 56, height: 56)
                        
                        Image(systemName: "camera.circle.fill")
                            .font(.system(size: 32))
                            .foregroundStyle(Color.brandAccent)
                    }
                    
                    Text("Photo")
                        .font(.caption)
                        .foregroundStyle(Color.textPrimary)
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.cardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .onChange(of: selectedPhoto) { _, newValue in
                Task {
                    if let data = try? await newValue?.loadTransferable(type: Data.self),
                       let image = UIImage(data: data) {
                        withAnimation(.smoothBounce) {
                            capturedImage = image
                        }
                        UINotificationFeedbackGenerator().notificationOccurred(.success)
                    }
                }
            }
        }
    }
    
    // MARK: - Submit Button
    private var submitButton: some View {
        Button {
            Task {
                await submitCheckIn()
            }
        } label: {
            HStack(spacing: 8) {
                if isSubmitting {
                    ProgressView()
                        .tint(.white)
                } else {
                    Image(systemName: "paperplane.fill")
                    Text("Log It")
                        .fontWeight(.semibold)
                }
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(messageText.isEmpty ? Color.brandAccent.opacity(0.5) : Color.brandAccent)
            .foregroundStyle(.white)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .scaleEffect(isSubmitting ? 0.98 : 1.0)
            .animation(.quickBounce, value: isSubmitting)
        }
        .disabled(messageText.isEmpty || isSubmitting)
        .sensoryFeedback(.impact(weight: .medium), trigger: isSubmitting)
    }
    
    // MARK: - Recent Section
    private var recentSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Recent Check-ins")
                .font(.headline)
                .foregroundStyle(Color.textPrimary)
            
            if isLoadingCheckIns {
                VStack(spacing: 12) {
                    ForEach(0..<3, id: \.self) { _ in
                        SkeletonCard(height: 70)
                    }
                }
            } else if let error = loadError {
                NetworkErrorView(retryAction: {
                    Task { await loadCheckIns() }
                }, onOfflineMode: {
                    loadError = nil
                })
            } else if recentCheckIns.isEmpty {
                EmptyCheckInsView()
            } else {
                LazyVStack(spacing: 12) {
                    ForEach(Array(recentCheckIns.enumerated()), id: \.element.id) { index, checkIn in
                        CheckInCard(checkIn: checkIn)
                            .transition(.asymmetric(
                                insertion: .push(from: .top).combined(with: .opacity),
                                removal: .push(from: .bottom).combined(with: .opacity)
                            ))
                            .animation(.smoothBounce.delay(Double(index) * 0.05), value: recentCheckIns.count)
                    }
                }
            }
        }
    }
    
    // MARK: - Quick Log Action
    private func quickLog(type: QuickLogType) async {
        do {
            await apiClient.updateBaseURL(appState.apiEndpoint)
            let newCheckIn = try await apiClient.createCheckIn(message: type.message)
            
            await MainActor.run {
                withAnimation(.smoothBounce) {
                    recentCheckIns.insert(newCheckIn, at: 0)
                }
            }
            
            // Award XP for quick log
            await awardXPForCheckIn()
            
        } catch {
            await MainActor.run {
                errorMessage = "Failed to log: \(error.localizedDescription)"
                showingError = true
                UINotificationFeedbackGenerator().notificationOccurred(.error)
            }
        }
    }
    
    // MARK: - Actions
    private func toggleRecording() {
        if isRecording {
            stopRecording()
        } else {
            startRecording()
        }
    }
    
    private func startRecording() {
        let audioSession = AVAudioSession.sharedInstance()
        
        do {
            try audioSession.setCategory(.playAndRecord, mode: .default)
            try audioSession.setActive(true)
            
            let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            let audioFilename = documentsPath.appendingPathComponent("recording-\(Date().timeIntervalSince1970).m4a")
            
            let settings: [String: Any] = [
                AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
                AVSampleRateKey: 44100,
                AVNumberOfChannelsKey: 1,
                AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue
            ]
            
            audioRecorder = try AVAudioRecorder(url: audioFilename, settings: settings)
            audioRecorder?.record()
            audioURL = audioFilename
            
            withAnimation(.quickBounce) {
                isRecording = true
            }
            
        } catch {
            errorMessage = "Failed to start recording: \(error.localizedDescription)"
            showingError = true
            UINotificationFeedbackGenerator().notificationOccurred(.error)
        }
    }
    
    private func stopRecording() {
        audioRecorder?.stop()
        
        withAnimation(.quickBounce) {
            isRecording = false
        }
        
        // TODO: Transcribe audio with Whisper API
        if let url = audioURL {
            messageText += "\n[Voice note recorded: \(url.lastPathComponent)]"
        }
        
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }
    
    private func submitCheckIn() async {
        guard !messageText.isEmpty else { return }
        
        isSubmitting = true
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        
        do {
            await apiClient.updateBaseURL(appState.apiEndpoint)
            let newCheckIn = try await apiClient.createCheckIn(message: messageText)
            
            await MainActor.run {
                // Show completion animation
                withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                    showCompletionAnimation = true
                }
                
                UINotificationFeedbackGenerator().notificationOccurred(.success)
                
                // Add to list after short delay
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    withAnimation(.smoothBounce) {
                        recentCheckIns.insert(newCheckIn, at: 0)
                        messageText = ""
                        capturedImage = nil
                    }
                }
                
                // Hide animation
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                    withAnimation(.easeOut(duration: 0.2)) {
                        showCompletionAnimation = false
                    }
                }
            }
            
            // Award XP for check-in
            await awardXPForCheckIn()
            
        } catch {
            await MainActor.run {
                errorMessage = error.localizedDescription
                showingError = true
                UINotificationFeedbackGenerator().notificationOccurred(.error)
            }
        }
        
        await MainActor.run {
            isSubmitting = false
        }
    }
    
    private func awardXPForCheckIn() async {
        // Use wallet address as userId if available (matches SettingsView)
        let walletAddr = privyService.walletAddress
        let deviceId = UIDevice.current.identifierForVendor?.uuidString
        let userId = walletAddr ?? deviceId ?? "anonymous"
        
        print("🎮 XP Award - wallet: \(walletAddr ?? "nil"), device: \(deviceId ?? "nil"), using: \(userId)")
        
        xpService.updateConfig(baseURL: appState.apiEndpoint, apiKey: appState.apiKey)
        
        if let notification = await xpService.awardXP(userId: userId, activity: .dailyCheckin) {
            print("🎮 XP Award success: +\(notification.amount) XP")
            await MainActor.run {
                // Show XP notification after completion animation
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.8) {
                    self.xpNotification = notification
                }
            }
        } else {
            print("🎮 XP Award returned nil notification")
        }
    }
    
    private func loadCheckIns() async {
        isLoadingCheckIns = true
        loadError = nil
        
        do {
            await apiClient.updateBaseURL(appState.apiEndpoint)
            let checkIns = try await apiClient.fetchCheckIns(limit: 10)
            
            await MainActor.run {
                recentCheckIns = checkIns
            }
        } catch {
            await MainActor.run {
                loadError = error
            }
            print("Failed to load check-ins: \(error)")
        }
        
        await MainActor.run {
            isLoadingCheckIns = false
        }
    }
}

// MARK: - CheckIn Card
struct CheckInCard: View {
    let checkIn: CheckIn
    @State private var appeared = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(checkIn.message)
                .foregroundStyle(Color.textPrimary)
                .multilineTextAlignment(.leading)
            
            HStack {
                Image(systemName: "clock")
                    .font(.caption2)
                Text(checkIn.formattedTime)
                    .font(.caption)
            }
            .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .scaleEffect(appeared ? 1.0 : 0.95)
        .opacity(appeared ? 1.0 : 0)
        .onAppear {
            withAnimation(.smoothBounce) {
                appeared = true
            }
        }
    }
}

#Preview {
    CheckInView()
        .environment(AppState())
}
