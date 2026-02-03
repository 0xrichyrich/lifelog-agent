//
//  CheckInView.swift
//  LifeLog
//
//  Created by Joshua Rich on 2026-02-02.
//

import SwiftUI
import AVFoundation
import PhotosUI

struct CheckInView: View {
    @Environment(AppState.self) private var appState
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
    
    private let apiClient = APIClient()
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
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
        }
    }
    
    // MARK: - Input Section
    private var inputSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("What's on your mind?")
                .font(.headline)
                .foregroundStyle(Color.textPrimary)
            
            TextEditor(text: $messageText)
                .frame(minHeight: 120)
                .padding()
                .background(Color.cardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.accent.opacity(0.3), lineWidth: 1)
                )
                .scrollContentBackground(.hidden)
                .foregroundStyle(Color.textPrimary)
            
            // Voice recording indicator
            if isRecording {
                HStack {
                    Circle()
                        .fill(Color.danger)
                        .frame(width: 12, height: 12)
                    Text("Recording...")
                        .foregroundStyle(Color.danger)
                        .font(.caption)
                }
                .padding(.horizontal)
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
                            capturedImage = nil
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .font(.title2)
                                .foregroundStyle(.white)
                                .background(Circle().fill(.black.opacity(0.5)))
                        }
                        .padding(8)
                    }
            }
        }
    }
    
    // MARK: - Action Buttons
    private var actionButtons: some View {
        HStack(spacing: 16) {
            // Voice Button
            Button {
                toggleRecording()
            } label: {
                VStack(spacing: 8) {
                    Image(systemName: isRecording ? "stop.circle.fill" : "mic.circle.fill")
                        .font(.system(size: 40))
                        .foregroundStyle(isRecording ? Color.danger : Color.accent)
                    Text(isRecording ? "Stop" : "Voice")
                        .font(.caption)
                        .foregroundStyle(Color.textPrimary)
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.cardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .sensoryFeedback(.impact, trigger: isRecording)
            
            // Camera Button
            PhotosPicker(selection: $selectedPhoto, matching: .images) {
                VStack(spacing: 8) {
                    Image(systemName: "camera.circle.fill")
                        .font(.system(size: 40))
                        .foregroundStyle(Color.accent)
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
                        capturedImage = image
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
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
            HStack {
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
            .background(messageText.isEmpty ? Color.accent.opacity(0.5) : Color.accent)
            .foregroundStyle(.white)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .disabled(messageText.isEmpty || isSubmitting)
        .sensoryFeedback(.success, trigger: !isSubmitting && !messageText.isEmpty)
    }
    
    // MARK: - Recent Section
    private var recentSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Recent Check-ins")
                .font(.headline)
                .foregroundStyle(Color.textPrimary)
            
            if isLoadingCheckIns {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .padding()
            } else if recentCheckIns.isEmpty {
                Text("No check-ins yet. Start logging!")
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity)
                    .padding()
            } else {
                LazyVStack(spacing: 12) {
                    ForEach(recentCheckIns) { checkIn in
                        CheckInCard(checkIn: checkIn)
                    }
                }
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
            isRecording = true
            
        } catch {
            errorMessage = "Failed to start recording: \(error.localizedDescription)"
            showingError = true
        }
    }
    
    private func stopRecording() {
        audioRecorder?.stop()
        isRecording = false
        
        // TODO: Transcribe audio with Whisper API
        // For now, just indicate that audio was recorded
        if let url = audioURL {
            messageText += "\n[Voice note recorded: \(url.lastPathComponent)]"
        }
    }
    
    private func submitCheckIn() async {
        guard !messageText.isEmpty else { return }
        
        isSubmitting = true
        
        do {
            await apiClient.updateBaseURL(appState.apiEndpoint)
            let newCheckIn = try await apiClient.createCheckIn(message: messageText)
            
            await MainActor.run {
                recentCheckIns.insert(newCheckIn, at: 0)
                messageText = ""
                capturedImage = nil
                UIImpactFeedbackGenerator(style: .success).impactOccurred()
            }
        } catch {
            await MainActor.run {
                errorMessage = error.localizedDescription
                showingError = true
            }
        }
        
        await MainActor.run {
            isSubmitting = false
        }
    }
    
    private func loadCheckIns() async {
        isLoadingCheckIns = true
        
        do {
            await apiClient.updateBaseURL(appState.apiEndpoint)
            let checkIns = try await apiClient.fetchCheckIns(limit: 10)
            
            await MainActor.run {
                recentCheckIns = checkIns
            }
        } catch {
            // Silently fail - offline mode
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
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(checkIn.message)
                .foregroundStyle(Color.textPrimary)
                .multilineTextAlignment(.leading)
            
            Text(checkIn.formattedTime)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

#Preview {
    CheckInView()
        .environment(AppState())
}
