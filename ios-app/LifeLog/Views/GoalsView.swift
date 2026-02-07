//
//  GoalsView.swift
//  LifeLog
//
//  Created by Joshua Rich on 2026-02-02.
//  Updated with competitive polish - animations, skeleton UI, empty/error states
//

import SwiftUI

struct GoalsView: View {
    @Environment(AppState.self) private var appState
    @State private var goals: [Goal] = []
    @State private var isLoading = true
    @State private var selectedGoal: Goal?
    @State private var loadError: Error?
    @State private var showConfetti = false
    @State private var hasAppeared = false
    
    private let apiClient = APIClient()
    
    var body: some View {
        NavigationStack {
            ZStack {
                ScrollView {
                    VStack(spacing: 20) {
                        // Streak Summary
                        streakSummary
                        
                        // Health Integration (if available)
                        healthSection
                        
                        // Goals List
                        goalsList
                    }
                    .padding()
                }
                .background(Color.background)
                
                // Confetti overlay
                ConfettiEffect(trigger: $showConfetti)
            }
            .navigationTitle("Goals")
            .navigationBarTitleDisplayMode(.large)
            .refreshable {
                await loadGoals()
            }
            .onAppear {
                if !hasAppeared {
                    hasAppeared = true
                    Task {
                        await loadGoals()
                    }
                }
            }
            .sheet(item: $selectedGoal) { goal in
                GoalDetailSheet(goal: goal)
            }
        }
    }
    
    // MARK: - Streak Summary
    private var streakSummary: some View {
        HStack(spacing: 16) {
            AnimatedStreakCard(
                streak: maxStreak,
                delay: 0.0
            )
            
            AnimatedCompletionCard(
                completed: completedGoals,
                total: goals.count,
                delay: 0.1
            )
        }
    }
    
    private var maxStreak: Int {
        goals.map(\.streak).max() ?? 0
    }
    
    private var completedGoals: Int {
        goals.filter(\.isComplete).count
    }
    
    // MARK: - Health Section
    @ViewBuilder
    private var healthSection: some View {
        if let healthService = try? HealthKitService(), healthService.isHealthKitAvailable {
            HealthDataCard()
        }
    }
    
    // MARK: - Goals List
    private var goalsList: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Active Goals")
                    .font(.headline)
                    .foregroundStyle(Color.textPrimary)
                
                Spacer()
                
                if !isLoading && !goals.isEmpty {
                    Text("\(completedGoals) of \(goals.count)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            
            if isLoading {
                VStack(spacing: 12) {
                    ForEach(0..<3, id: \.self) { _ in
                        SkeletonGoalCard()
                    }
                }
            } else if let error = loadError {
                NetworkErrorView(retryAction: {
                    Task { await loadGoals() }
                })
            } else if goals.isEmpty {
                EmptyGoalsView()
            } else {
                LazyVStack(spacing: 12) {
                    ForEach(Array(goals.enumerated()), id: \.element.id) { index, goal in
                        AnimatedGoalCard(
                            goal: goal,
                            animationDelay: Double(index) * 0.05,
                            onComplete: {
                                triggerConfetti()
                            }
                        )
                        .onTapGesture {
                            selectedGoal = goal
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        }
                    }
                }
            }
        }
    }
    
    // MARK: - Actions
    private func triggerConfetti() {
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        showConfetti = true
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            showConfetti = false
        }
    }
    
    private func loadGoals() async {
        isLoading = true
        loadError = nil
        
        do {
            await apiClient.updateBaseURL(appState.apiEndpoint)
            let fetchedGoals = try await apiClient.fetchGoals()
            
            await MainActor.run {
                goals = fetchedGoals
                appState.goals = fetchedGoals
                appState.syncToSharedDefaults()
            }
        } catch {
            AppLogger.error("Failed to load goals", error: error)
            await MainActor.run {
                loadError = error
            }
        }
        
        await MainActor.run {
            isLoading = false
        }
    }
    
}

// MARK: - Animated Streak Card
struct AnimatedStreakCard: View {
    let streak: Int
    let delay: Double
    
    @State private var displayedStreak: Int = 0
    @State private var hasAppeared = false
    @State private var flameScale: CGFloat = 1.0
    
    var body: some View {
        VStack(spacing: 4) {
            HStack(spacing: 4) {
                Text("🔥")
                    .font(.title)
                    .scaleEffect(flameScale)
                
                Text("\(displayedStreak)")
                    .font(.title)
                    .fontWeight(.bold)
                    .foregroundStyle(Color.warning)
                    .contentTransition(.numericText())
            }
            Text("Max Streak")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .scaleEffect(hasAppeared ? 1.0 : 0.9)
        .opacity(hasAppeared ? 1.0 : 0)
        .onAppear {
            withAnimation(.smoothBounce.delay(delay)) {
                hasAppeared = true
            }
            
            // Animate streak counter
            withAnimation(.easeOut(duration: 0.6).delay(delay + 0.2)) {
                displayedStreak = streak
            }
            
            // Bounce the flame
            withAnimation(.spring(response: 0.3, dampingFraction: 0.4).delay(delay + 0.3)) {
                flameScale = 1.2
            }
            withAnimation(.spring(response: 0.3, dampingFraction: 0.5).delay(delay + 0.5)) {
                flameScale = 1.0
            }
        }
    }
}

// MARK: - Animated Completion Card
struct AnimatedCompletionCard: View {
    let completed: Int
    let total: Int
    let delay: Double
    
    @State private var displayedCompleted: Int = 0
    @State private var hasAppeared = false
    
    var body: some View {
        VStack(spacing: 4) {
            Text("\(displayedCompleted)/\(total)")
                .font(.title)
                .fontWeight(.bold)
                .foregroundStyle(Color.success)
                .contentTransition(.numericText())
            
            Text("Completed")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .scaleEffect(hasAppeared ? 1.0 : 0.9)
        .opacity(hasAppeared ? 1.0 : 0)
        .onAppear {
            withAnimation(.smoothBounce.delay(delay)) {
                hasAppeared = true
            }
            withAnimation(.easeOut(duration: 0.6).delay(delay + 0.2)) {
                displayedCompleted = completed
            }
        }
    }
}

// MARK: - Animated Goal Card
struct AnimatedGoalCard: View {
    let goal: Goal
    let animationDelay: Double
    var onComplete: (() -> Void)? = nil
    
    @State private var hasAppeared = false
    @State private var progressWidth: CGFloat = 0
    @State private var showCheckmark = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(goal.name)
                        .font(.headline)
                        .foregroundStyle(Color.textPrimary)
                    
                    Text(goal.category)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                
                Spacer()
                
                if goal.streak > 0 {
                    HStack(spacing: 4) {
                        Text("🔥")
                        Text("\(goal.streak)")
                            .fontWeight(.semibold)
                            .foregroundStyle(Color.warning)
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.warning.opacity(0.2))
                    .clipShape(Capsule())
                }
            }
            
            // Animated Progress Bar
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.gray.opacity(0.3))
                        .frame(height: 8)
                    
                    RoundedRectangle(cornerRadius: 4)
                        .fill(
                            LinearGradient(
                                colors: [goal.swiftColor, goal.swiftColor.opacity(0.7)],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(width: progressWidth, height: 8)
                }
                .onAppear {
                    DispatchQueue.main.asyncAfter(deadline: .now() + animationDelay) {
                        withAnimation(.spring(response: 0.6, dampingFraction: 0.7)) {
                            progressWidth = geometry.size.width * goal.progress
                        }
                    }
                }
            }
            .frame(height: 8)
            
            HStack {
                Text("\(goal.current) / \(goal.target) \(goal.unit)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                
                Spacer()
                
                if goal.isComplete {
                    HStack(spacing: 4) {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(Color.success)
                            .scaleEffect(showCheckmark ? 1.0 : 0.5)
                            .opacity(showCheckmark ? 1.0 : 0)
                        
                        Text("Complete!")
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundStyle(Color.success)
                    }
                } else {
                    Text("\(Int(goal.progress * 100))%")
                        .font(.caption)
                        .foregroundStyle(goal.swiftColor)
                }
            }
        }
        .padding()
        .background(Color.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(goal.isComplete ? Color.success.opacity(0.5) : Color.clear, lineWidth: 2)
        )
        .scaleEffect(hasAppeared ? 1.0 : 0.95)
        .opacity(hasAppeared ? 1.0 : 0)
        .offset(y: hasAppeared ? 0 : 20)
        .onAppear {
            withAnimation(.smoothBounce.delay(animationDelay)) {
                hasAppeared = true
            }
            
            if goal.isComplete {
                withAnimation(.spring(response: 0.3, dampingFraction: 0.5).delay(animationDelay + 0.3)) {
                    showCheckmark = true
                }
            }
        }
    }
}

// MARK: - Health Data Card
struct HealthDataCard: View {
    @StateObject private var healthService = HealthKitService()
    @State private var hasLoaded = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "heart.fill")
                    .foregroundStyle(.red)
                Text("Apple Health")
                    .font(.headline)
                    .foregroundStyle(Color.textPrimary)
                
                Spacer()
                
                if !healthService.isAuthorized {
                    Button("Connect") {
                        Task {
                            try? await healthService.requestAuthorization()
                            try? await healthService.fetchTodayData()
                        }
                    }
                    .font(.caption)
                    .foregroundStyle(Color.brandInteractive)
                }
            }
            
            if healthService.isAuthorized {
                HStack(spacing: 16) {
                    HealthMetric(
                        icon: "figure.walk",
                        value: "\(healthService.todaySteps)",
                        label: "Steps",
                        color: .success
                    )
                    
                    HealthMetric(
                        icon: "moon.zzz.fill",
                        value: String(format: "%.1f", healthService.todaySleepHours),
                        label: "Sleep hrs",
                        color: .brandAccent
                    )
                    
                    HealthMetric(
                        icon: "flame.fill",
                        value: "\(healthService.todayActiveMinutes)",
                        label: "Active min",
                        color: .warning
                    )
                }
                
                if let suggestion = healthService.generateActivitySuggestion() {
                    Text(suggestion)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .padding(.top, 4)
                }
            }
        }
        .padding()
        .background(Color.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .onAppear {
            if !hasLoaded {
                hasLoaded = true
                healthService.checkAuthorizationStatus()
                if healthService.isAuthorized {
                    Task {
                        try? await healthService.fetchTodayData()
                    }
                }
            }
        }
    }
}

struct HealthMetric: View {
    let icon: String
    let value: String
    let label: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .foregroundStyle(color)
            Text(value)
                .font(.headline)
                .fontWeight(.bold)
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Goal Detail Sheet
struct GoalDetailSheet: View {
    let goal: Goal
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationStack {
            List {
                Section {
                    HStack {
                        Circle()
                            .fill(goal.swiftColor)
                            .frame(width: 12, height: 12)
                        Text("Name")
                        Spacer()
                        Text(goal.name)
                            .foregroundStyle(.secondary)
                    }
                    
                    LabeledContent("Type", value: goal.type.rawValue.capitalized)
                    LabeledContent("Category", value: goal.category)
                }
                
                Section {
                    Text(goal.description)
                        .foregroundStyle(.secondary)
                }
                
                Section("Progress") {
                    VStack(alignment: .leading, spacing: 8) {
                        GeometryReader { geometry in
                            ZStack(alignment: .leading) {
                                RoundedRectangle(cornerRadius: 4)
                                    .fill(Color.gray.opacity(0.3))
                                    .frame(height: 12)
                                
                                RoundedRectangle(cornerRadius: 4)
                                    .fill(goal.swiftColor)
                                    .frame(width: geometry.size.width * goal.progress, height: 12)
                            }
                        }
                        .frame(height: 12)
                        
                        Text("\(goal.current) / \(goal.target) \(goal.unit)")
                            .font(.headline)
                    }
                    .padding(.vertical, 8)
                    
                    if goal.streak > 0 {
                        HStack {
                            Text("🔥 Current Streak")
                            Spacer()
                            Text("\(goal.streak) days")
                                .fontWeight(.semibold)
                                .foregroundStyle(Color.warning)
                        }
                    }
                }
                
                if goal.isComplete {
                    Section {
                        HStack {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(Color.success)
                            Text("Goal completed!")
                                .foregroundStyle(Color.success)
                        }
                    }
                }
            }
            .navigationTitle("Goal Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
        .presentationDetents([.medium, .large])
    }
}

#Preview {
    GoalsView()
        .environment(AppState())
}
