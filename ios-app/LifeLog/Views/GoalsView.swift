//
//  GoalsView.swift
//  LifeLog
//
//  Created by Joshua Rich on 2026-02-02.
//

import SwiftUI

struct GoalsView: View {
    @Environment(AppState.self) private var appState
    @State private var goals: [Goal] = []
    @State private var isLoading = true
    @State private var selectedGoal: Goal?
    
    private let apiClient = APIClient()
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Streak Summary
                    streakSummary
                    
                    // Goals List
                    goalsList
                }
                .padding()
            }
            .background(Color.background)
            .navigationTitle("Goals")
            .navigationBarTitleDisplayMode(.large)
            .refreshable {
                await loadGoals()
            }
            .onAppear {
                Task {
                    await loadGoals()
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
            VStack(spacing: 4) {
                HStack(spacing: 4) {
                    Text("🔥")
                        .font(.title)
                    Text("\(maxStreak)")
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundStyle(Color.warning)
                }
                Text("Max Streak")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            
            VStack(spacing: 4) {
                Text("\(completedGoals)/\(goals.count)")
                    .font(.title)
                    .fontWeight(.bold)
                    .foregroundStyle(Color.success)
                Text("Completed")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }
    
    private var maxStreak: Int {
        goals.map(\.streak).max() ?? 0
    }
    
    private var completedGoals: Int {
        goals.filter(\.isComplete).count
    }
    
    // MARK: - Goals List
    private var goalsList: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Active Goals")
                .font(.headline)
                .foregroundStyle(Color.textPrimary)
            
            if isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .padding()
            } else if goals.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "target")
                        .font(.system(size: 48))
                        .foregroundStyle(.secondary)
                    Text("No goals set yet")
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 40)
            } else {
                LazyVStack(spacing: 12) {
                    ForEach(goals) { goal in
                        GoalCard(goal: goal)
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
    private func loadGoals() async {
        isLoading = true
        
        do {
            await apiClient.updateBaseURL(appState.apiEndpoint)
            let fetchedGoals = try await apiClient.fetchGoals()
            
            await MainActor.run {
                goals = fetchedGoals
                appState.goals = fetchedGoals
                appState.syncToSharedDefaults()
            }
        } catch {
            print("Failed to load goals: \(error)")
            // Use mock data for demo
            await MainActor.run {
                goals = mockGoals
            }
        }
        
        await MainActor.run {
            isLoading = false
        }
    }
    
    private var mockGoals: [Goal] {
        [
            Goal(id: "1", name: "4 Hours Deep Work", description: "Spend at least 4 hours in focused work", type: .daily, target: 240, unit: "minutes", current: 180, streak: 7, category: "Productivity", color: "#10b981", createdAt: "2026-01-15"),
            Goal(id: "2", name: "Exercise Daily", description: "30 minutes of physical activity", type: .daily, target: 30, unit: "minutes", current: 30, streak: 3, category: "Health", color: "#3b82f6", createdAt: "2026-01-01"),
            Goal(id: "3", name: "Read 20 Pages", description: "Read at least 20 pages", type: .daily, target: 20, unit: "pages", current: 20, streak: 12, category: "Learning", color: "#f59e0b", createdAt: "2026-01-10"),
        ]
    }
}

// MARK: - Goal Card
struct GoalCard: View {
    let goal: Goal
    
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
            
            // Progress Bar
            VStack(alignment: .leading, spacing: 4) {
                ProgressView(value: goal.progress)
                    .progressViewStyle(CustomProgressStyle(color: goal.swiftColor))
                
                HStack {
                    Text("\(goal.current) / \(goal.target) \(goal.unit)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    
                    Spacer()
                    
                    if goal.isComplete {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(Color.success)
                    } else {
                        Text("\(Int(goal.progress * 100))%")
                            .font(.caption)
                            .foregroundStyle(goal.swiftColor)
                    }
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
    }
}

// MARK: - Custom Progress Style
struct CustomProgressStyle: ProgressViewStyle {
    let color: Color
    
    func makeBody(configuration: Configuration) -> some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color.gray.opacity(0.3))
                    .frame(height: 8)
                
                RoundedRectangle(cornerRadius: 4)
                    .fill(color)
                    .frame(width: geometry.size.width * (configuration.fractionCompleted ?? 0), height: 8)
                    .animation(.easeInOut, value: configuration.fractionCompleted)
            }
        }
        .frame(height: 8)
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
                    LabeledContent("Name", value: goal.name)
                    LabeledContent("Type", value: goal.type.rawValue.capitalized)
                    LabeledContent("Category", value: goal.category)
                }
                
                Section {
                    Text(goal.description)
                        .foregroundStyle(.secondary)
                }
                
                Section("Progress") {
                    VStack(alignment: .leading, spacing: 8) {
                        ProgressView(value: goal.progress)
                            .progressViewStyle(CustomProgressStyle(color: goal.swiftColor))
                        
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
