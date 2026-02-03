//
//  WellnessView.swift
//  LifeLog
//
//  Wellness dashboard with screen time, outdoor tracking, and insights
//  Focus on positive reinforcement and gentle suggestions
//

import SwiftUI

struct WellnessView: View {
    @StateObject private var viewModel = WellnessViewModel()
    @State private var showOutdoorLog = false
    @State private var selectedOutdoorMinutes = 30
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Today's Balance
                    if let screenData = viewModel.screenTimeData {
                        BalanceCard(
                            screenMinutes: screenData.totalMinutes,
                            outdoorMinutes: viewModel.outdoorStats.todayMinutes,
                            focusMinutes: screenData.productivityMinutes
                        )
                    } else {
                        BalanceCardSkeleton()
                    }
                    
                    // Wellness Insights
                    if !viewModel.insights.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Insights")
                                .font(.headline)
                                .foregroundStyle(Color.textPrimary)
                            
                            WellnessInsightsList(
                                insights: viewModel.insights,
                                onAction: { insight in
                                    handleInsightAction(insight)
                                }
                            )
                        }
                    }
                    
                    // Outdoor Streak
                    outdoorStreakSection
                    
                    // Quick Actions
                    quickActionsSection
                    
                    // Screen Time Breakdown
                    if let screenData = viewModel.screenTimeData {
                        screenTimeBreakdownSection(screenData)
                    }
                }
                .padding()
            }
            .background(Color.background)
            .navigationTitle("Wellness")
            .navigationBarTitleDisplayMode(.large)
            .refreshable {
                await viewModel.loadData()
            }
            .onAppear {
                Task {
                    await viewModel.loadData()
                }
            }
            .sheet(isPresented: $showOutdoorLog) {
                LogOutdoorSheet(
                    selectedMinutes: $selectedOutdoorMinutes,
                    onLog: { minutes, type in
                        viewModel.logOutdoorTime(minutes: minutes, type: type)
                        showOutdoorLog = false
                    }
                )
            }
        }
    }
    
    // MARK: - Outdoor Streak Section
    
    private var outdoorStreakSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Outdoor Streak")
                    .font(.headline)
                    .foregroundStyle(Color.textPrimary)
                
                Spacer()
                
                OutdoorStreakBadge(streakDays: viewModel.outdoorStats.streakDays)
            }
            
            HStack(spacing: 16) {
                OutdoorStatCard(
                    icon: "sun.max.fill",
                    value: "\(viewModel.outdoorStats.todayMinutes)",
                    unit: "min",
                    label: "Today",
                    color: .success
                )
                
                OutdoorStatCard(
                    icon: "calendar",
                    value: "\(viewModel.outdoorStats.weekMinutes)",
                    unit: "min",
                    label: "This Week",
                    color: .brandAccent
                )
                
                OutdoorStatCard(
                    icon: "flame.fill",
                    value: "\(viewModel.outdoorStats.streakDays)",
                    unit: viewModel.outdoorStats.streakDays == 1 ? "day" : "days",
                    label: "Streak",
                    color: .warning
                )
            }
        }
    }
    
    // MARK: - Quick Actions Section
    
    private var quickActionsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Quick Log")
                .font(.headline)
                .foregroundStyle(Color.textPrimary)
            
            HStack(spacing: 12) {
                QuickOutdoorActionButton(
                    icon: "figure.walk",
                    label: "10m Walk",
                    color: .success
                ) {
                    viewModel.logOutdoorTime(minutes: 10, type: .walking)
                }
                
                QuickOutdoorActionButton(
                    icon: "figure.run",
                    label: "20m Run",
                    color: .brandAccent
                ) {
                    viewModel.logOutdoorTime(minutes: 20, type: .running)
                }
                
                QuickOutdoorActionButton(
                    icon: "plus",
                    label: "Custom",
                    color: .gray
                ) {
                    showOutdoorLog = true
                }
            }
        }
    }
    
    // MARK: - Screen Time Breakdown
    
    private func screenTimeBreakdownSection(_ data: ScreenTimeData) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Screen Time")
                    .font(.headline)
                    .foregroundStyle(Color.textPrimary)
                
                Spacer()
                
                Text(formatTime(data.totalMinutes))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            
            VStack(spacing: 8) {
                ForEach(data.categories.sorted { $0.minutes > $1.minutes }.prefix(5)) { category in
                    CategoryRow(category: category, total: data.totalMinutes)
                }
            }
            .padding()
            .background(Color.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }
    
    // MARK: - Helpers
    
    private func handleInsightAction(_ insight: WellnessInsight) {
        if insight.actionLabel?.lowercased().contains("walk") == true ||
           insight.actionLabel?.lowercased().contains("outside") == true {
            showOutdoorLog = true
        }
    }
    
    private func formatTime(_ minutes: Int) -> String {
        if minutes >= 60 {
            let hours = minutes / 60
            let mins = minutes % 60
            return mins > 0 ? "\(hours)h \(mins)m" : "\(hours)h"
        }
        return "\(minutes)m"
    }
}

// MARK: - View Model

@MainActor
class WellnessViewModel: ObservableObject {
    @Published var screenTimeData: ScreenTimeData?
    @Published var outdoorStats: OutdoorStats = OutdoorStats()
    @Published var insights: [WellnessInsight] = []
    @Published var isLoading = true
    
    private let screenTimeService = ScreenTimeService.shared
    private let outdoorService = OutdoorActivityService.shared
    private let nudgeService = WellnessNudgeService.shared
    
    func loadData() async {
        isLoading = true
        
        // Fetch screen time
        await screenTimeService.fetchTodayScreenTime()
        await screenTimeService.fetchWeeklyScreenTime()
        screenTimeData = screenTimeService.todayData
        
        // Fetch outdoor stats
        await outdoorService.fetchTodayFromHealth()
        outdoorStats = outdoorService.todayStats
        
        // Generate insights
        insights = await nudgeService.generateInsights()
        
        isLoading = false
    }
    
    func logOutdoorTime(minutes: Int, type: OutdoorActivityType) {
        outdoorService.logOutdoorTime(minutes: minutes, type: type)
        outdoorStats = outdoorService.todayStats
        
        // Refresh insights
        Task {
            insights = await nudgeService.generateInsights()
        }
    }
}

// MARK: - Supporting Views

struct OutdoorStatCard: View {
    let icon: String
    let value: String
    let unit: String
    let label: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(color)
            
            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text(value)
                    .font(.title3)
                    .fontWeight(.bold)
                
                Text(unit)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct QuickOutdoorActionButton: View {
    let icon: String
    let label: String
    let color: Color
    let action: () -> Void
    
    @State private var isPressed = false
    @State private var showCheck = false
    
    var body: some View {
        Button {
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            
            withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                showCheck = true
            }
            
            action()
            
            DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
                withAnimation {
                    showCheck = false
                }
            }
        } label: {
            VStack(spacing: 8) {
                ZStack {
                    Circle()
                        .fill(color.opacity(0.2))
                        .frame(width: 48, height: 48)
                    
                    if showCheck {
                        Image(systemName: "checkmark")
                            .font(.title3)
                            .fontWeight(.bold)
                            .foregroundStyle(.white)
                            .transition(.scale)
                    } else {
                        Image(systemName: icon)
                            .font(.title3)
                            .foregroundStyle(color)
                    }
                }
                .background(
                    Circle()
                        .fill(showCheck ? color : Color.clear)
                )
                
                Text(label)
                    .font(.caption)
                    .foregroundStyle(Color.textPrimary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(Color.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .scaleEffect(isPressed ? 0.95 : 1.0)
        }
        .buttonStyle(.plain)
    }
}

struct CategoryRow: View {
    let category: AppCategoryUsage
    let total: Int
    
    private var ratio: CGFloat {
        guard total > 0 else { return 0 }
        return CGFloat(category.minutes) / CGFloat(total)
    }
    
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: category.category.icon)
                .font(.subheadline)
                .foregroundStyle(category.category.color)
                .frame(width: 24)
            
            Text(category.category.rawValue)
                .font(.subheadline)
                .foregroundStyle(Color.textPrimary)
            
            Spacer()
            
            GeometryReader { geometry in
                RoundedRectangle(cornerRadius: 2)
                    .fill(category.category.color.opacity(0.3))
                    .overlay(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 2)
                            .fill(category.category.color)
                            .frame(width: geometry.size.width * ratio)
                    }
            }
            .frame(width: 60, height: 6)
            
            Text("\(category.minutes)m")
                .font(.caption)
                .foregroundStyle(.secondary)
                .frame(width: 40, alignment: .trailing)
        }
    }
}

struct BalanceCardSkeleton: View {
    var body: some View {
        VStack(spacing: 16) {
            HStack {
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color.gray.opacity(0.3))
                    .frame(width: 120, height: 20)
                Spacer()
            }
            
            RoundedRectangle(cornerRadius: 6)
                .fill(Color.gray.opacity(0.2))
                .frame(height: 12)
            
            HStack(spacing: 24) {
                ForEach(0..<3, id: \.self) { _ in
                    VStack(spacing: 4) {
                        Circle()
                            .fill(Color.gray.opacity(0.2))
                            .frame(width: 24, height: 24)
                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color.gray.opacity(0.3))
                            .frame(width: 40, height: 16)
                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color.gray.opacity(0.2))
                            .frame(width: 50, height: 12)
                    }
                    .frame(maxWidth: .infinity)
                }
            }
        }
        .padding()
        .background(Color.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shimmer()
    }
}

// MARK: - Log Outdoor Sheet

struct LogOutdoorSheet: View {
    @Binding var selectedMinutes: Int
    let onLog: (Int, OutdoorActivityType) -> Void
    
    @Environment(\.dismiss) private var dismiss
    @State private var selectedType: OutdoorActivityType = .generalOutdoor
    
    private let minuteOptions = [10, 15, 20, 30, 45, 60, 90, 120]
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                // Activity type
                VStack(alignment: .leading, spacing: 12) {
                    Text("Activity")
                        .font(.headline)
                        .foregroundStyle(Color.textPrimary)
                    
                    LazyVGrid(columns: [
                        GridItem(.flexible()),
                        GridItem(.flexible()),
                        GridItem(.flexible())
                    ], spacing: 12) {
                        ForEach(OutdoorActivityType.allCases, id: \.self) { type in
                            ActivityTypeButton(
                                type: type,
                                isSelected: selectedType == type
                            ) {
                                selectedType = type
                            }
                        }
                    }
                }
                
                // Duration
                VStack(alignment: .leading, spacing: 12) {
                    Text("Duration")
                        .font(.headline)
                        .foregroundStyle(Color.textPrimary)
                    
                    LazyVGrid(columns: [
                        GridItem(.flexible()),
                        GridItem(.flexible()),
                        GridItem(.flexible()),
                        GridItem(.flexible())
                    ], spacing: 12) {
                        ForEach(minuteOptions, id: \.self) { minutes in
                            DurationButton(
                                minutes: minutes,
                                isSelected: selectedMinutes == minutes
                            ) {
                                selectedMinutes = minutes
                            }
                        }
                    }
                }
                
                Spacer()
                
                // Log button
                Button {
                    onLog(selectedMinutes, selectedType)
                } label: {
                    HStack {
                        Image(systemName: selectedType.icon)
                        Text("Log \(selectedMinutes) min \(selectedType.rawValue.lowercased())")
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.success)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
            .padding()
            .background(Color.background)
            .navigationTitle("Log Outdoor Time")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
        .presentationDetents([.medium])
    }
}

struct ActivityTypeButton: View {
    let type: OutdoorActivityType
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 6) {
                Image(systemName: type.icon)
                    .font(.title2)
                Text(type.rawValue)
                    .font(.caption)
            }
            .foregroundStyle(isSelected ? .white : Color.textPrimary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(isSelected ? Color.success : Color.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isSelected ? Color.clear : Color.gray.opacity(0.3), lineWidth: 1)
            )
        }
        .sensoryFeedback(.selection, trigger: isSelected)
    }
}

struct DurationButton: View {
    let minutes: Int
    let isSelected: Bool
    let action: () -> Void
    
    private var label: String {
        if minutes >= 60 {
            return "\(minutes / 60)h"
        }
        return "\(minutes)m"
    }
    
    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(isSelected ? .white : Color.textPrimary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(isSelected ? Color.brandAccent : Color.cardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 8))
        }
        .sensoryFeedback(.selection, trigger: isSelected)
    }
}

#Preview {
    WellnessView()
}
