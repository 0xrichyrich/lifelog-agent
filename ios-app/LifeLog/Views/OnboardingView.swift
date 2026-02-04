//
//  OnboardingView.swift
//  LifeLog
//
//  Created by Joshua Rich on 2026-02-02.
//
//  Onboarding flow for LifeLog - AI life coach with crypto rewards
//  Aha moment: First check-in → see timeline → get AI insight
//

import SwiftUI
import UserNotifications

struct OnboardingView: View {
    @Environment(AppState.self) private var appState
    @Binding var hasCompletedOnboarding: Bool
    
    @State private var currentPage = 0
    @State private var firstCheckInText = ""
    @State private var selectedGoalTemplate: GoalTemplate? = nil
    @State private var showCheckInSuccess = false
    @State private var isSubmittingCheckIn = false
    @State private var showWidgetStep = true  // Widget promo (Streaks benchmark)
    
    private var totalPages: Int { showWidgetStep ? 8 : 7 }
    
    var body: some View {
        ZStack {
            Color.background.ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Skip button
                HStack {
                    Spacer()
                    Button("Skip") {
                        completeOnboarding()
                    }
                    .foregroundStyle(Color.brandAccent)
                    .padding()
                }
                
                // Page content
                TabView(selection: $currentPage) {
                    WelcomeScreen()
                        .tag(0)
                    
                    HowItWorksScreen()
                        .tag(1)
                    
                    FirstCheckInScreen(
                        text: $firstCheckInText,
                        isSubmitting: $isSubmittingCheckIn,
                        showSuccess: $showCheckInSuccess,
                        onSubmit: submitFirstCheckIn
                    )
                    .tag(2)
                    
                    TimelinePreviewScreen(checkInText: firstCheckInText)
                        .tag(3)
                    
                    SetGoalScreen(selectedGoal: $selectedGoalTemplate)
                        .tag(4)
                    
                    EnableCoachingScreen(onEnableNotifications: requestNotifications)
                        .tag(5)
                    
                    if showWidgetStep {
                        WidgetPromoScreen()
                            .tag(6)
                        
                        AllSetScreen(
                            checkInText: firstCheckInText,
                            selectedGoal: selectedGoalTemplate,
                            onStart: completeOnboarding
                        )
                        .tag(7)
                    } else {
                        AllSetScreen(
                            checkInText: firstCheckInText,
                            selectedGoal: selectedGoalTemplate,
                            onStart: completeOnboarding
                        )
                        .tag(6)
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
                .animation(.spring(response: 0.4, dampingFraction: 0.8), value: currentPage)
                
                // Progress dots
                HStack(spacing: 8) {
                    ForEach(0..<totalPages, id: \.self) { index in
                        Circle()
                            .fill(index == currentPage ? Color.brandAccent : Color.gray.opacity(0.4))
                            .frame(width: 8, height: 8)
                            .animation(.easeInOut, value: currentPage)
                    }
                }
                .padding(.bottom, 20)
                
                // Navigation buttons
                HStack(spacing: 16) {
                    if currentPage > 0 {
                        Button {
                            withAnimation {
                                currentPage -= 1
                            }
                        } label: {
                            HStack {
                                Image(systemName: "chevron.left")
                                Text("Back")
                            }
                            .foregroundStyle(Color.brandAccent)
                            .padding()
                        }
                    }
                    
                    Spacer()
                    
                    if currentPage < totalPages - 1 {
                        Button {
                            advanceToNextPage()
                        } label: {
                            HStack {
                                Text(nextButtonText)
                                Image(systemName: "chevron.right")
                            }
                            .foregroundStyle(.white)
                            .padding(.horizontal, 24)
                            .padding(.vertical, 12)
                            .background(canAdvance ? Color.brandAccent : Color.brandAccent.opacity(0.5))
                            .clipShape(Capsule())
                        }
                        .disabled(!canAdvance)
                    }
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 32)
            }
        }
    }
    
    // MARK: - Navigation Logic
    
    private var nextButtonText: String {
        switch currentPage {
        case 0: return "Get Started"
        case 2: return showCheckInSuccess ? "See Your Timeline" : "Log It First"
        case 4: return selectedGoalTemplate != nil ? "Continue" : "Pick a Goal"
        case 5: return "Almost Done"
        default: return "Continue"
        }
    }
    
    private var canAdvance: Bool {
        switch currentPage {
        case 2: return showCheckInSuccess // Must complete check-in
        case 4: return selectedGoalTemplate != nil // Must select goal
        default: return true
        }
    }
    
    private func advanceToNextPage() {
        withAnimation {
            currentPage = min(currentPage + 1, totalPages - 1)
        }
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }
    
    private func submitFirstCheckIn() {
        guard !firstCheckInText.isEmpty else { return }
        
        isSubmittingCheckIn = true
        
        // Simulate API call (or call real API)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
            isSubmittingCheckIn = false
            showCheckInSuccess = true
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        }
    }
    
    private func requestNotifications() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, _ in
            DispatchQueue.main.async {
                appState.notificationsEnabled = granted
                if granted {
                    UINotificationFeedbackGenerator().notificationOccurred(.success)
                }
            }
        }
    }
    
    private func completeOnboarding() {
        UserDefaults.standard.set(true, forKey: "hasCompletedOnboarding")
        withAnimation {
            hasCompletedOnboarding = true
        }
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }
}

// MARK: - Screen 1: Welcome
// Things 3 inspiration: buttery smooth, premium feel with mint green mascot

struct WelcomeScreen: View {
    @State private var showMascot = false
    @State private var showTagline = false
    @State private var floatOffset: CGFloat = 0
    @State private var sparklePositions: [(CGFloat, CGFloat)] = (0..<6).map { _ in
        (CGFloat.random(in: -100...100), CGFloat.random(in: -100...100))
    }
    
    var body: some View {
        VStack(spacing: 32) {
            Spacer()
            
            // Hero visual - kawaii mint green squircle mascot
            ZStack {
                // Soft mint glow background
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [Color.mintLight, Color.clear],
                            center: .center,
                            startRadius: 0,
                            endRadius: 140
                        )
                    )
                    .frame(width: 280, height: 280)
                    .blur(radius: 40)
                
                // Floating sparkles
                ForEach(0..<6, id: \.self) { index in
                    Image(systemName: "sparkle")
                        .font(.system(size: CGFloat.random(in: 12...20)))
                        .foregroundStyle(index % 2 == 0 ? Color.brandAccent : Color.mintMedium)
                        .offset(x: sparklePositions[index].0, y: sparklePositions[index].1)
                        .opacity(showMascot ? Double.random(in: 0.5...1.0) : 0)
                        .scaleEffect(showMascot ? 1.0 : 0.5)
                }
                
                // Mascot character - waving hello
                Image("MascotWave")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 180, height: 180)
                    .scaleEffect(showMascot ? 1 : 0.5)
                    .opacity(showMascot ? 1 : 0)
                    .offset(y: floatOffset)
                    .shadow(color: Color.brandAccent.opacity(0.2), radius: 20, y: 10)
            }
            .onAppear {
                // Mascot entrance animation
                withAnimation(.spring(response: 0.6, dampingFraction: 0.7)) {
                    showMascot = true
                }
                
                // Gentle floating animation
                withAnimation(.easeInOut(duration: 2.5).repeatForever(autoreverses: true).delay(0.5)) {
                    floatOffset = -8
                }
                
                // Haptic on mascot appear
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                    UIImpactFeedbackGenerator(style: .soft).impactOccurred()
                }
            }
            
            VStack(spacing: 16) {
                Text("Nudge")
                    .font(.system(size: 44, weight: .bold, design: .rounded))
                    .foregroundStyle(Color.textPrimary)
                    .opacity(showMascot ? 1 : 0)
                    .offset(y: showMascot ? 0 : 20)
                    .animation(.spring(response: 0.5, dampingFraction: 0.8).delay(0.2), value: showMascot)
                
                Text("Sometimes you need\na little nudge")
                    .font(.title3)
                    .foregroundStyle(Color.textSecondary)
                    .multilineTextAlignment(.center)
                    .opacity(showTagline ? 1 : 0)
                    .offset(y: showTagline ? 0 : 10)
                    .onAppear {
                        withAnimation(.easeOut(duration: 0.5).delay(0.4)) {
                            showTagline = true
                        }
                    }
            }
            
            Spacer()
            Spacer()
        }
        .padding()
    }
}

// MARK: - Screen 2: How It Works

struct HowItWorksScreen: View {
    @State private var showMascot = false
    
    var body: some View {
        VStack(spacing: 32) {
            Spacer()
            
            // Small mascot giving a nudge gesture
            Image("MascotNudge")
                .resizable()
                .scaledToFit()
                .frame(width: 100, height: 100)
                .scaleEffect(showMascot ? 1 : 0.8)
                .opacity(showMascot ? 1 : 0)
                .onAppear {
                    withAnimation(.spring(response: 0.5, dampingFraction: 0.7)) {
                        showMascot = true
                    }
                }
            
            Text("How It Works")
                .font(.system(size: 32, weight: .bold, design: .rounded))
                .foregroundStyle(Color.textPrimary)
            
            VStack(spacing: 20) {
                HowItWorksRow(
                    icon: "square.and.pencil",
                    color: .brandAccent,
                    title: "Log Your Day",
                    description: "Quick check-ins, automatic timeline tracking"
                )
                
                HowItWorksRow(
                    icon: "brain",
                    color: .success,
                    title: "AI Analyzes Patterns",
                    description: "Discover what makes you productive & happy"
                )
                
                HowItWorksRow(
                    icon: "bitcoinsign.circle.fill",
                    color: .warning,
                    title: "Earn $LIFE Tokens",
                    description: "Get rewarded for hitting your goals"
                )
            }
            .padding(.horizontal, 24)
            
            Spacer()
            Spacer()
        }
    }
}

struct HowItWorksRow: View {
    let icon: String
    let color: Color
    let title: String
    let description: String
    
    var body: some View {
        HStack(spacing: 16) {
            ZStack {
                Circle()
                    .fill(color.opacity(0.2))
                    .frame(width: 56, height: 56)
                
                Image(systemName: icon)
                    .font(.system(size: 24))
                    .foregroundStyle(color)
            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)
                    .foregroundStyle(Color.textPrimary)
                
                Text(description)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            
            Spacer()
        }
        .padding()
        .background(Color.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

// MARK: - Screen 3: First Check-In (Interactive!)
// Inspired by Day One (create during onboarding) + Streaks (one-tap speed)

struct FirstCheckInScreen: View {
    @Binding var text: String
    @Binding var isSubmitting: Bool
    @Binding var showSuccess: Bool
    let onSubmit: () -> Void
    
    @FocusState private var isFocused: Bool
    @State private var checkmarkScale: CGFloat = 0
    @State private var showSuccessGlow = false
    
    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            
            // Header with animated transition
            ZStack {
                // Success state
                if showSuccess {
                    VStack(spacing: 16) {
                        ZStack {
                            // Glow effect (Things 3 style)
                            Circle()
                                .fill(Color.success.opacity(0.2))
                                .frame(width: 100, height: 100)
                                .blur(radius: 20)
                                .scaleEffect(showSuccessGlow ? 1.3 : 0.8)
                            
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 64))
                                .foregroundStyle(Color.success)
                                .scaleEffect(checkmarkScale)
                        }
                        
                        Text("Logged!")
                            .font(.system(size: 32, weight: .bold, design: .rounded))
                            .foregroundStyle(Color.textPrimary)
                    }
                    .transition(.scale.combined(with: .opacity))
                }
                
                // Input state
                if !showSuccess {
                    VStack(spacing: 12) {
                        Text("What's happening?")
                            .font(.system(size: 28, weight: .bold, design: .rounded))
                            .foregroundStyle(Color.textPrimary)
                        
                        Text("Tap a mood or type your own")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .transition(.scale.combined(with: .opacity))
                }
            }
            .animation(.spring(response: 0.4, dampingFraction: 0.7), value: showSuccess)
            
            if !showSuccess {
                VStack(spacing: 20) {
                    // ONE-TAP Quick Moods (Streaks-inspired: tap and DONE)
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                        OneTapMoodButton(emoji: "🎯", label: "Focused", color: .success) {
                            text = "Feeling focused and productive 🎯"
                            submitWithAnimation()
                        }
                        OneTapMoodButton(emoji: "☀️", label: "Fresh Start", color: .warning) {
                            text = "Starting my day fresh ☀️"
                            submitWithAnimation()
                        }
                        OneTapMoodButton(emoji: "💻", label: "Deep Work", color: .brandAccent) {
                            text = "Deep in work mode 💻"
                            submitWithAnimation()
                        }
                        OneTapMoodButton(emoji: "🧘", label: "Taking Break", color: Color(hex: "8b5cf6")!) {
                            text = "Taking a mindful break 🧘"
                            submitWithAnimation()
                        }
                    }
                    .padding(.horizontal, 24)
                    
                    // Divider
                    HStack {
                        Rectangle().fill(Color.gray.opacity(0.3)).frame(height: 1)
                        Text("or type")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Rectangle().fill(Color.gray.opacity(0.3)).frame(height: 1)
                    }
                    .padding(.horizontal, 32)
                    
                    // Custom input (compact)
                    HStack(spacing: 12) {
                        TextField("What's on your mind?", text: $text)
                            .textFieldStyle(.plain)
                            .padding()
                            .background(Color.cardBackground)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(isFocused ? Color.brandAccent : Color.clear, lineWidth: 1)
                            )
                            .foregroundStyle(Color.textPrimary)
                            .focused($isFocused)
                            .submitLabel(.send)
                            .onSubmit {
                                if !text.isEmpty {
                                    submitWithAnimation()
                                }
                            }
                        
                        // Send button
                        Button {
                            submitWithAnimation()
                        } label: {
                            Image(systemName: "arrow.up.circle.fill")
                                .font(.system(size: 44))
                                .foregroundStyle(text.isEmpty ? Color.gray.opacity(0.5) : Color.brandAccent)
                        }
                        .disabled(text.isEmpty || isSubmitting)
                    }
                    .padding(.horizontal, 24)
                }
            } else {
                // Success: Show their check-in formatted beautifully (Day One style)
                VStack(spacing: 12) {
                    Text("\"\(text)\"")
                        .font(.system(size: 18, weight: .medium))
                        .foregroundStyle(Color.textPrimary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 40)
                    
                    HStack(spacing: 6) {
                        Image(systemName: "clock")
                            .font(.caption)
                        Text("Just now")
                            .font(.caption)
                    }
                    .foregroundStyle(.secondary)
                }
                .padding(.top, 20)
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }
            
            Spacer()
            Spacer()
        }
        .padding()
    }
    
    private func submitWithAnimation() {
        isFocused = false
        isSubmitting = true
        
        // Haptic feedback (Things 3 style)
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        
        // Quick submit (Streaks-fast)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            withAnimation(.spring(response: 0.4, dampingFraction: 0.6)) {
                isSubmitting = false
                showSuccess = true
            }
            
            // Animate checkmark (Things 3 polish)
            withAnimation(.spring(response: 0.3, dampingFraction: 0.5).delay(0.1)) {
                checkmarkScale = 1.0
            }
            
            // Glow pulse
            withAnimation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true)) {
                showSuccessGlow = true
            }
            
            // Success haptic
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        }
    }
}

// One-tap mood button (Streaks-inspired: tap = done)
struct OneTapMoodButton: View {
    let emoji: String
    let label: String
    let color: Color
    let action: () -> Void
    
    @State private var isPressed = false
    
    var body: some View {
        Button {
            action()
        } label: {
            HStack(spacing: 12) {
                Text(emoji)
                    .font(.system(size: 28))
                
                Text(label)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(Color.textPrimary)
                
                Spacer()
            }
            .padding()
            .background(color.opacity(0.15))
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(color.opacity(0.3), lineWidth: 1)
            )
            .scaleEffect(isPressed ? 0.96 : 1.0)
        }
        .buttonStyle(.plain)
        .sensoryFeedback(.impact(flexibility: .soft), trigger: isPressed)
        .onLongPressGesture(minimumDuration: 0, pressing: { pressing in
            withAnimation(.easeInOut(duration: 0.15)) {
                isPressed = pressing
            }
        }, perform: {})
    }
}

struct QuickPromptButton: View {
    let text: String
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(text)
                .font(.caption)
                .foregroundStyle(Color.textPrimary)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Color.cardBackground)
                .clipShape(Capsule())
        }
    }
}

// MARK: - Screen 4: Timeline Preview
// Things 3 polish: buttery smooth animations, haptics on appearance

struct TimelinePreviewScreen: View {
    let checkInText: String
    @State private var animateTimeline = false
    @State private var showUserEntry = false
    @State private var pulseRing = false
    
    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            
            VStack(spacing: 12) {
                Image(systemName: "calendar.day.timeline.left")
                    .font(.system(size: 48))
                    .foregroundStyle(Color.brandAccent)
                    .symbolEffect(.pulse, options: .repeating, value: animateTimeline)
                
                Text("Your Timeline")
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundStyle(Color.textPrimary)
                
                Text("Watch your day come alive")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            
            // Mini timeline preview with premium animation
            VStack(spacing: 0) {
                // Past activities (fade in first)
                ForEach(Array(pastBlocks.enumerated()), id: \.offset) { index, block in
                    TimelinePreviewRow(
                        time: block.0,
                        activity: block.1,
                        color: block.2,
                        isHighlighted: false,
                        showPulse: false
                    )
                    .opacity(animateTimeline ? 1 : 0)
                    .offset(y: animateTimeline ? 0 : -10)
                    .animation(
                        .spring(response: 0.5, dampingFraction: 0.8)
                        .delay(Double(index) * 0.15),
                        value: animateTimeline
                    )
                }
                
                // User's check-in (dramatic entrance)
                TimelinePreviewRow(
                    time: currentTimeString,
                    activity: displayText,
                    color: Color.brandAccent,
                    isHighlighted: true,
                    showPulse: pulseRing
                )
                .opacity(showUserEntry ? 1 : 0)
                .scaleEffect(showUserEntry ? 1 : 0.8)
                .animation(.spring(response: 0.4, dampingFraction: 0.6), value: showUserEntry)
            }
            .padding()
            .background(Color.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .shadow(color: showUserEntry ? Color.brandAccent.opacity(0.2) : .clear, radius: 20)
            .padding(.horizontal, 24)
            .animation(.easeInOut(duration: 0.5), value: showUserEntry)
            
            // Insight text (appears after user entry)
            if showUserEntry {
                Text("As you log more, AI patterns emerge ✨")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }
            
            Spacer()
            Spacer()
        }
        .onAppear {
            // Staggered animation sequence (Things 3 style)
            withAnimation {
                animateTimeline = true
            }
            
            // User entry appears after past items
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                withAnimation {
                    showUserEntry = true
                }
                // Haptic when their entry appears
                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                
                // Start pulse ring
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                    withAnimation(.easeInOut(duration: 1.0).repeatForever(autoreverses: true)) {
                        pulseRing = true
                    }
                }
            }
        }
    }
    
    private var currentTimeString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        return formatter.string(from: Date())
    }
    
    private var displayText: String {
        if checkInText.isEmpty {
            return "Your check-in"
        }
        // Extract emoji if present, otherwise truncate nicely
        let text = checkInText.trimmingCharacters(in: .whitespaces)
        if text.count <= 25 {
            return text
        }
        return String(text.prefix(22)) + "..."
    }
    
    private var pastBlocks: [(String, String, Color)] {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        
        return [
            (formatter.string(from: Date().addingTimeInterval(-7200)), "Deep focus session", Color.success),
            (formatter.string(from: Date().addingTimeInterval(-3600)), "Team standup", Color.warning),
        ]
    }
}

struct TimelinePreviewRow: View {
    let time: String
    let activity: String
    let color: Color
    let isHighlighted: Bool
    let showPulse: Bool
    
    var body: some View {
        HStack(spacing: 12) {
            Text(time)
                .font(.system(size: 12, weight: .medium, design: .monospaced))
                .foregroundStyle(.secondary)
                .frame(width: 70, alignment: .trailing)
            
            // Timeline dot with pulse effect
            ZStack {
                if isHighlighted && showPulse {
                    Circle()
                        .stroke(color.opacity(0.4), lineWidth: 2)
                        .frame(width: 24, height: 24)
                        .scaleEffect(showPulse ? 1.5 : 1.0)
                        .opacity(showPulse ? 0 : 1)
                }
                
                Circle()
                    .fill(color)
                    .frame(width: 12, height: 12)
                    .shadow(color: isHighlighted ? color.opacity(0.5) : .clear, radius: 4)
            }
            .frame(width: 24, height: 24)
            
            Text(activity)
                .font(.subheadline)
                .fontWeight(isHighlighted ? .semibold : .regular)
                .foregroundStyle(Color.textPrimary)
                .lineLimit(1)
            
            Spacer()
            
            if isHighlighted {
                Text("NOW")
                    .font(.caption2)
                    .fontWeight(.bold)
                    .foregroundStyle(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(
                        LinearGradient(
                            colors: [Color.brandAccent, Color.brandAccent.opacity(0.8)],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .clipShape(Capsule())
            }
        }
        .padding(.vertical, 14)
        .padding(.horizontal, 12)
        .background(isHighlighted ? color.opacity(0.08) : Color.clear)
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}

// MARK: - Screen 5: Set First Goal

struct GoalTemplate: Identifiable, Equatable {
    let id = UUID()
    let name: String
    let icon: String
    let color: Color
    let target: String
}

struct SetGoalScreen: View {
    @Binding var selectedGoal: GoalTemplate?
    
    // Static so UUIDs remain stable across view re-renders (fixes radio button visual state)
    private static let goalTemplates = [
        GoalTemplate(name: "4hrs Deep Work", icon: "brain.head.profile", color: .success, target: "4 hours/day"),
        GoalTemplate(name: "Exercise 3x/week", icon: "figure.run", color: .brandAccent, target: "3 times/week"),
        GoalTemplate(name: "Daily Check-in", icon: "square.and.pencil", color: .warning, target: "1 check-in/day"),
        GoalTemplate(name: "Read 30min", icon: "book.fill", color: Color(hex: "8b5cf6")!, target: "30 min/day"),
    ]
    
    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            
            VStack(spacing: 12) {
                Image(systemName: "target")
                    .font(.system(size: 48))
                    .foregroundStyle(Color.success)
                
                Text("Set Your First Goal")
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundStyle(Color.textPrimary)
                
                Text("Pick one to start. You can add more later.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            
            VStack(spacing: 12) {
                ForEach(Self.goalTemplates) { template in
                    GoalTemplateCard(
                        template: template,
                        isSelected: selectedGoal?.id == template.id,
                        onSelect: { selectedGoal = template }
                    )
                }
            }
            .padding(.horizontal, 24)
            
            Spacer()
            Spacer()
        }
    }
}

struct GoalTemplateCard: View {
    let template: GoalTemplate
    let isSelected: Bool
    let onSelect: () -> Void
    
    var body: some View {
        Button(action: onSelect) {
            HStack(spacing: 16) {
                ZStack {
                    Circle()
                        .fill(template.color.opacity(0.2))
                        .frame(width: 48, height: 48)
                    
                    Image(systemName: template.icon)
                        .font(.system(size: 20))
                        .foregroundStyle(template.color)
                }
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(template.name)
                        .font(.headline)
                        .foregroundStyle(Color.textPrimary)
                    
                    Text(template.target)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                
                Spacer()
                
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 24))
                    .foregroundStyle(isSelected ? Color.success : Color.gray.opacity(0.5))
            }
            .padding()
            .background(Color.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(isSelected ? template.color : Color.clear, lineWidth: 2)
            )
        }
        .sensoryFeedback(.selection, trigger: isSelected)
    }
}

// MARK: - Screen 6: Enable Coaching (Notifications)

struct EnableCoachingScreen: View {
    let onEnableNotifications: () -> Void
    @State private var showExampleNotification = false
    @State private var showMascot = false
    
    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            
            VStack(spacing: 12) {
                // Small happy mascot
                Image("MascotHappy")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 80, height: 80)
                    .scaleEffect(showMascot ? 1 : 0.8)
                    .opacity(showMascot ? 1 : 0)
                    .onAppear {
                        withAnimation(.spring(response: 0.5, dampingFraction: 0.7)) {
                            showMascot = true
                        }
                    }
                
                Text("Enable AI Coaching")
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundStyle(Color.textPrimary)
                
                Text("Get daily insights & gentle nudges from your AI coach")
                    .font(.subheadline)
                    .foregroundStyle(Color.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }
            
            // Example notification
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 12) {
                    Image("MascotNudge")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 40, height: 40)
                    
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text("Nudge")
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundStyle(Color.textPrimary)
                            
                            Spacer()
                            
                            Text("now")
                                .font(.caption2)
                                .foregroundStyle(Color.textSecondary)
                        }
                        
                        Text("You've been scrolling for 45min. Time to refocus? 🎯")
                            .font(.subheadline)
                            .foregroundStyle(Color.textPrimary)
                    }
                }
                .padding()
                .background(Color.cardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .shadow(color: .black.opacity(0.08), radius: 12, y: 4)
            }
            .padding(.horizontal, 24)
            .opacity(showExampleNotification ? 1 : 0)
            .offset(y: showExampleNotification ? 0 : -20)
            .onAppear {
                withAnimation(.easeOut(duration: 0.5).delay(0.3)) {
                    showExampleNotification = true
                }
            }
            
            Button {
                onEnableNotifications()
            } label: {
                HStack {
                    Image(systemName: "bell.fill")
                    Text("Allow Notifications")
                        .fontWeight(.semibold)
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.brandAccent)
                .foregroundStyle(.white)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .padding(.horizontal, 24)
            
            Text("You can change this anytime in Settings")
                .font(.caption)
                .foregroundStyle(Color.textSecondary)
            
            Spacer()
            Spacer()
        }
    }
}

// MARK: - Screen 7: All Set!

struct AllSetScreen: View {
    let checkInText: String
    let selectedGoal: GoalTemplate?
    let onStart: () -> Void
    
    @State private var showMascot = false
    @State private var floatOffset: CGFloat = 0
    
    var body: some View {
        VStack(spacing: 32) {
            Spacer()
            
            ZStack {
                // Celebration background with mint glow
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [Color.mintLight, Color.clear],
                            center: .center,
                            startRadius: 0,
                            endRadius: 120
                        )
                    )
                    .frame(width: 220, height: 220)
                    .blur(radius: 30)
                
                // Celebrating mascot
                Image("MascotCelebrate")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 160, height: 160)
                    .scaleEffect(showMascot ? 1 : 0.5)
                    .opacity(showMascot ? 1 : 0)
                    .offset(y: floatOffset)
                    .shadow(color: Color.brandAccent.opacity(0.2), radius: 15, y: 8)
            }
            .onAppear {
                withAnimation(.spring(response: 0.5, dampingFraction: 0.6)) {
                    showMascot = true
                }
                withAnimation(.easeInOut(duration: 2.0).repeatForever(autoreverses: true).delay(0.3)) {
                    floatOffset = -6
                }
            }
            
            VStack(spacing: 12) {
                Text("You're All Set!")
                    .font(.system(size: 32, weight: .bold, design: .rounded))
                    .foregroundStyle(Color.textPrimary)
                
                Text("Here's what you've accomplished:")
                    .font(.subheadline)
                    .foregroundStyle(Color.textSecondary)
            }
            
            // Summary
            VStack(spacing: 12) {
                SummaryRow(icon: "checkmark.circle.fill", color: .success, text: "Logged your first check-in")
                
                if let goal = selectedGoal {
                    SummaryRow(icon: "target", color: goal.color, text: "Set goal: \(goal.name)")
                }
                
                SummaryRow(icon: "bell.fill", color: .warning, text: "Enabled AI coaching")
            }
            .padding()
            .background(Color.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .shadow(color: Color.black.opacity(0.05), radius: 10, y: 4)
            .padding(.horizontal, 24)
            
            Spacer()
            
            Button {
                onStart()
            } label: {
                HStack {
                    Text("Start Improving")
                        .fontWeight(.bold)
                    Image(systemName: "arrow.right")
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(
                    LinearGradient(
                        colors: [Color.brandAccent, Color.brandAccentDark],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .foregroundStyle(.white)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 32)
        }
        .onAppear {
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        }
    }
}

struct SummaryRow: View {
    let icon: String
    let color: Color
    let text: String
    
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .foregroundStyle(color)
            
            Text(text)
                .font(.subheadline)
                .foregroundStyle(Color.textPrimary)
            
            Spacer()
        }
    }
}

// MARK: - Screen 8 (Optional): Widget Promo
// Streaks is praised specifically for widget excellence

struct WidgetPromoScreen: View {
    @State private var showWidget = false
    @State private var floatAnimation = false
    
    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            
            VStack(spacing: 12) {
                Image(systemName: "square.stack.3d.up.fill")
                    .font(.system(size: 48))
                    .foregroundStyle(Color.brandAccent)
                    .symbolEffect(.bounce, value: showWidget)
                
                Text("Add a Widget")
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundStyle(Color.textPrimary)
                
                Text("See your goals at a glance.\nNo need to open the app.")
                    .font(.subheadline)
                    .foregroundStyle(Color.textSecondary)
                    .multilineTextAlignment(.center)
            }
            
            // Widget preview (floating)
            ZStack {
                // Shadow/glow with mint
                RoundedRectangle(cornerRadius: 20)
                    .fill(Color.mintLight)
                    .frame(width: 180, height: 180)
                    .blur(radius: 25)
                
                // Widget mockup
                VStack(spacing: 12) {
                    HStack {
                        Text("🎯")
                            .font(.title2)
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Today's Focus")
                                .font(.caption)
                                .foregroundStyle(Color.textSecondary)
                            Text("3h 24m")
                                .font(.title3)
                                .fontWeight(.bold)
                                .foregroundStyle(Color.success)
                        }
                        Spacer()
                    }
                    
                    ProgressView(value: 0.7)
                        .tint(Color.brandAccent)
                    
                    HStack {
                        Text("🔥 7 day streak")
                            .font(.caption)
                            .foregroundStyle(Color.warning)
                        Spacer()
                    }
                }
                .padding()
                .frame(width: 170, height: 170)
                .background(Color.cardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 20))
                .shadow(color: .black.opacity(0.08), radius: 15, y: 8)
                .scaleEffect(showWidget ? 1 : 0.8)
                .opacity(showWidget ? 1 : 0)
                .offset(y: floatAnimation ? -5 : 5)
            }
            .onAppear {
                withAnimation(.spring(response: 0.5, dampingFraction: 0.7)) {
                    showWidget = true
                }
                withAnimation(.easeInOut(duration: 2).repeatForever(autoreverses: true).delay(0.5)) {
                    floatAnimation = true
                }
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
            }
            
            // Instructions
            VStack(spacing: 8) {
                Text("To add a widget:")
                    .font(.footnote)
                    .fontWeight(.medium)
                    .foregroundStyle(Color.textPrimary)
                
                HStack(spacing: 4) {
                    Text("Long press home screen")
                    Image(systemName: "arrow.right")
                        .font(.caption2)
                    Text("Tap +")
                    Image(systemName: "arrow.right")
                        .font(.caption2)
                    Text("Find Nudge")
                }
                .font(.caption)
                .foregroundStyle(Color.textSecondary)
            }
            .padding()
            .background(Color.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .shadow(color: .black.opacity(0.05), radius: 8, y: 2)
            .padding(.horizontal, 24)
            
            Spacer()
            Spacer()
        }
    }
}

// MARK: - Preview

#Preview {
    OnboardingView(hasCompletedOnboarding: .constant(false))
        .environment(AppState())
}
