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
    
    private let totalPages = 7
    
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
                    
                    AllSetScreen(
                        checkInText: firstCheckInText,
                        selectedGoal: selectedGoalTemplate,
                        onStart: completeOnboarding
                    )
                    .tag(6)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
                .animation(.easeInOut, value: currentPage)
                
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

struct WelcomeScreen: View {
    @State private var animate = false
    
    var body: some View {
        VStack(spacing: 32) {
            Spacer()
            
            // Hero visual - animated brain
            ZStack {
                // Outer glow
                Circle()
                    .fill(Color.brandAccent.opacity(0.1))
                    .frame(width: 220, height: 220)
                    .blur(radius: 20)
                    .scaleEffect(animate ? 1.1 : 1.0)
                
                // Brain icon
                Image(systemName: "brain.head.profile")
                    .font(.system(size: 100))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [Color.brandAccent, Color.success],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .shadow(color: Color.brandAccent.opacity(0.5), radius: 20)
                
                // Sparkles
                ForEach(0..<6, id: \.self) { index in
                    Image(systemName: "sparkle")
                        .font(.system(size: 16))
                        .foregroundStyle(Color.warning)
                        .offset(
                            x: CGFloat.random(in: -80...80),
                            y: CGFloat.random(in: -80...80)
                        )
                        .opacity(animate ? 1 : 0.3)
                }
            }
            .onAppear {
                withAnimation(.easeInOut(duration: 2).repeatForever(autoreverses: true)) {
                    animate = true
                }
            }
            
            VStack(spacing: 16) {
                Text("LifeLog")
                    .font(.system(size: 42, weight: .bold, design: .rounded))
                    .foregroundStyle(Color.textPrimary)
                
                Text("The AI life coach that pays you to improve")
                    .font(.title3)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }
            
            Spacer()
            Spacer()
        }
        .padding()
    }
}

// MARK: - Screen 2: How It Works

struct HowItWorksScreen: View {
    var body: some View {
        VStack(spacing: 40) {
            Spacer()
            
            Text("How It Works")
                .font(.system(size: 32, weight: .bold, design: .rounded))
                .foregroundStyle(Color.textPrimary)
            
            VStack(spacing: 24) {
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

struct FirstCheckInScreen: View {
    @Binding var text: String
    @Binding var isSubmitting: Bool
    @Binding var showSuccess: Bool
    let onSubmit: () -> Void
    
    @FocusState private var isFocused: Bool
    
    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            
            VStack(spacing: 12) {
                Image(systemName: showSuccess ? "checkmark.circle.fill" : "lightbulb.fill")
                    .font(.system(size: 48))
                    .foregroundStyle(showSuccess ? Color.success : Color.warning)
                
                Text(showSuccess ? "Great Start!" : "Your First Check-In")
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundStyle(Color.textPrimary)
                
                Text(showSuccess ? "You just logged your first moment. This is how patterns emerge." : "What's on your mind right now?")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }
            
            if !showSuccess {
                VStack(spacing: 16) {
                    TextEditor(text: $text)
                        .frame(height: 120)
                        .padding()
                        .background(Color.cardBackground)
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(Color.brandAccent.opacity(0.5), lineWidth: 1)
                        )
                        .scrollContentBackground(.hidden)
                        .foregroundStyle(Color.textPrimary)
                        .focused($isFocused)
                    
                    // Quick prompts
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            QuickPromptButton(text: "Feeling focused 🎯") { text = "Feeling focused and ready to work 🎯" }
                            QuickPromptButton(text: "Just woke up ☀️") { text = "Just woke up, starting my day ☀️" }
                            QuickPromptButton(text: "Taking a break 🧘") { text = "Taking a mindful break 🧘" }
                            QuickPromptButton(text: "Deep in work 💻") { text = "Deep in focused work mode 💻" }
                        }
                        .padding(.horizontal)
                    }
                    
                    Button {
                        isFocused = false
                        onSubmit()
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
                        .background(text.isEmpty ? Color.brandAccent.opacity(0.5) : Color.brandAccent)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    .disabled(text.isEmpty || isSubmitting)
                    .padding(.horizontal, 24)
                }
            } else {
                // Success state
                VStack(spacing: 8) {
                    Text(""\(text)"")
                        .font(.body)
                        .foregroundStyle(Color.textPrimary)
                        .multilineTextAlignment(.center)
                        .padding()
                        .background(Color.cardBackground)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .padding(.horizontal, 32)
                    
                    Text("Logged just now")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            
            Spacer()
            Spacer()
        }
        .padding()
        .onAppear {
            if !showSuccess {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    isFocused = true
                }
            }
        }
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

struct TimelinePreviewScreen: View {
    let checkInText: String
    @State private var animateTimeline = false
    
    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            
            VStack(spacing: 12) {
                Image(systemName: "calendar.day.timeline.left")
                    .font(.system(size: 48))
                    .foregroundStyle(Color.brandAccent)
                
                Text("Your Timeline")
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundStyle(Color.textPrimary)
                
                Text("This is what your day looks like.\nAs you log more, patterns emerge.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            
            // Mini timeline preview
            VStack(spacing: 0) {
                ForEach(sampleTimeBlocks, id: \.0) { block in
                    TimelinePreviewRow(
                        time: block.0,
                        activity: block.1,
                        color: block.2,
                        isHighlighted: block.3
                    )
                    .opacity(animateTimeline ? 1 : 0)
                    .offset(x: animateTimeline ? 0 : -20)
                    .animation(.easeOut(duration: 0.4).delay(Double(sampleTimeBlocks.firstIndex(where: { $0.0 == block.0 }) ?? 0) * 0.1), value: animateTimeline)
                }
            }
            .padding()
            .background(Color.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .padding(.horizontal, 24)
            
            Spacer()
            Spacer()
        }
        .onAppear {
            animateTimeline = true
        }
    }
    
    private var sampleTimeBlocks: [(String, String, Color, Bool)] {
        let currentHour = Calendar.current.component(.hour, from: Date())
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        
        return [
            (formatter.string(from: Date().addingTimeInterval(-7200)), "Focus time", Color.success, false),
            (formatter.string(from: Date().addingTimeInterval(-3600)), "Meeting", Color.warning, false),
            (formatter.string(from: Date()), checkInText.isEmpty ? "Check-in" : String(checkInText.prefix(30)) + "...", Color.brandAccent, true),
        ]
    }
}

struct TimelinePreviewRow: View {
    let time: String
    let activity: String
    let color: Color
    let isHighlighted: Bool
    
    var body: some View {
        HStack(spacing: 12) {
            Text(time)
                .font(.caption)
                .foregroundStyle(.secondary)
                .frame(width: 70, alignment: .trailing)
            
            Circle()
                .fill(color)
                .frame(width: 12, height: 12)
                .overlay(
                    Circle()
                        .stroke(color.opacity(0.3), lineWidth: isHighlighted ? 4 : 0)
                )
            
            Text(activity)
                .font(.subheadline)
                .foregroundStyle(Color.textPrimary)
                .lineLimit(1)
            
            Spacer()
            
            if isHighlighted {
                Text("NEW")
                    .font(.caption2)
                    .fontWeight(.bold)
                    .foregroundStyle(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.brandAccent)
                    .clipShape(Capsule())
            }
        }
        .padding(.vertical, 12)
        .padding(.horizontal, 8)
        .background(isHighlighted ? color.opacity(0.1) : Color.clear)
        .clipShape(RoundedRectangle(cornerRadius: 8))
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
    
    private let goalTemplates = [
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
                ForEach(goalTemplates) { template in
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
    
    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            
            VStack(spacing: 12) {
                Image(systemName: "bell.badge.fill")
                    .font(.system(size: 48))
                    .foregroundStyle(Color.warning)
                
                Text("Enable AI Coaching")
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundStyle(Color.textPrimary)
                
                Text("Get daily insights & gentle nudges from your AI coach")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }
            
            // Example notification
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 12) {
                    Image(systemName: "brain.head.profile")
                        .font(.system(size: 32))
                        .foregroundStyle(Color.brandAccent)
                    
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text("LifeLog")
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundStyle(Color.textPrimary)
                            
                            Spacer()
                            
                            Text("now")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                        
                        Text("You've been scrolling for 45min. Time to refocus? 🎯")
                            .font(.subheadline)
                            .foregroundStyle(Color.textPrimary)
                    }
                }
                .padding()
                .background(Color.cardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .shadow(color: .black.opacity(0.3), radius: 10, y: 5)
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
                .foregroundStyle(.secondary)
            
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
    
    @State private var showConfetti = false
    
    var body: some View {
        VStack(spacing: 32) {
            Spacer()
            
            ZStack {
                // Celebration background
                Circle()
                    .fill(Color.success.opacity(0.1))
                    .frame(width: 180, height: 180)
                    .blur(radius: 30)
                
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 80))
                    .foregroundStyle(Color.success)
                    .shadow(color: Color.success.opacity(0.5), radius: 20)
            }
            
            VStack(spacing: 12) {
                Text("You're All Set!")
                    .font(.system(size: 32, weight: .bold, design: .rounded))
                    .foregroundStyle(Color.textPrimary)
                
                Text("Here's what you've accomplished:")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
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
                        colors: [Color.brandAccent, Color.success],
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

// MARK: - Preview

#Preview {
    OnboardingView(hasCompletedOnboarding: .constant(false))
        .environment(AppState())
}
