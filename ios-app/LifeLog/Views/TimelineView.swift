//
//  TimelineView.swift
//  LifeLog
//
//  Created by Joshua Rich on 2026-02-02.
//

import SwiftUI

struct TimelineView: View {
    @Environment(AppState.self) private var appState
    @State private var selectedDate = Date()
    @State private var activities: [Activity] = []
    @State private var timeBlocks: [TimeBlock] = []
    @State private var isLoading = true
    @State private var selectedBlock: TimeBlock?
    
    private let apiClient = APIClient()
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Date Picker
                    datePicker
                    
                    // Stats Summary
                    statsSummary
                    
                    // Timeline Grid
                    timelineGrid
                }
                .padding()
            }
            .background(Color.background)
            .navigationTitle("Timeline")
            .navigationBarTitleDisplayMode(.large)
            .refreshable {
                await loadActivities()
            }
            .onAppear {
                Task {
                    await loadActivities()
                }
            }
            .onChange(of: selectedDate) { _, _ in
                Task {
                    await loadActivities()
                }
            }
            .sheet(item: $selectedBlock) { block in
                TimeBlockDetailSheet(block: block)
            }
        }
    }
    
    // MARK: - Date Picker
    private var datePicker: some View {
        HStack {
            Button {
                selectedDate = Calendar.current.date(byAdding: .day, value: -1, to: selectedDate) ?? selectedDate
            } label: {
                Image(systemName: "chevron.left")
                    .font(.title2)
                    .foregroundStyle(Color.accent)
            }
            
            Spacer()
            
            Text(formattedDate)
                .font(.headline)
                .foregroundStyle(Color.textPrimary)
            
            Spacer()
            
            Button {
                if !Calendar.current.isDateInToday(selectedDate) {
                    selectedDate = Calendar.current.date(byAdding: .day, value: 1, to: selectedDate) ?? selectedDate
                }
            } label: {
                Image(systemName: "chevron.right")
                    .font(.title2)
                    .foregroundStyle(Calendar.current.isDateInToday(selectedDate) ? Color.gray : Color.accent)
            }
            .disabled(Calendar.current.isDateInToday(selectedDate))
        }
        .padding()
        .background(Color.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
    
    private var formattedDate: String {
        if Calendar.current.isDateInToday(selectedDate) {
            return "Today"
        } else if Calendar.current.isDateInYesterday(selectedDate) {
            return "Yesterday"
        } else {
            let formatter = DateFormatter()
            formatter.dateStyle = .medium
            return formatter.string(from: selectedDate)
        }
    }
    
    // MARK: - Stats Summary
    private var statsSummary: some View {
        HStack(spacing: 16) {
            StatCard(
                title: "Focus",
                value: focusMinutes,
                unit: "min",
                color: .success
            )
            
            StatCard(
                title: "Meetings",
                value: meetingMinutes,
                unit: "min",
                color: .warning
            )
            
            StatCard(
                title: "Breaks",
                value: breakMinutes,
                unit: "min",
                color: Color(.systemGray)
            )
        }
    }
    
    private var focusMinutes: Int {
        activities
            .filter { $0.category == .focus }
            .reduce(0) { $0 + ($1.duration ?? 0) } / 60
    }
    
    private var meetingMinutes: Int {
        activities
            .filter { $0.category == .collaboration }
            .reduce(0) { $0 + ($1.duration ?? 0) } / 60
    }
    
    private var breakMinutes: Int {
        activities
            .filter { $0.category == .break_ }
            .reduce(0) { $0 + ($1.duration ?? 0) } / 60
    }
    
    // MARK: - Timeline Grid
    private var timelineGrid: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Hour by Hour")
                .font(.headline)
                .foregroundStyle(Color.textPrimary)
            
            if isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .padding()
            } else {
                LazyVStack(spacing: 4) {
                    ForEach(timeBlocks.filter { $0.hour >= 6 && $0.hour <= 23 }) { block in
                        TimeBlockRow(block: block)
                            .onTapGesture {
                                if !block.activities.isEmpty {
                                    selectedBlock = block
                                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                }
                            }
                    }
                }
            }
        }
        .padding()
        .background(Color.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
    
    // MARK: - Actions
    private func loadActivities() async {
        isLoading = true
        
        do {
            await apiClient.updateBaseURL(appState.apiEndpoint)
            let fetchedActivities = try await apiClient.fetchActivities(for: selectedDate)
            
            await MainActor.run {
                activities = fetchedActivities
                timeBlocks = parseActivitiesToBlocks(fetchedActivities)
                appState.activities = fetchedActivities
                appState.syncToSharedDefaults()
            }
        } catch {
            print("Failed to load activities: \(error)")
            // Use mock data for demo
            await MainActor.run {
                timeBlocks = generateMockBlocks()
            }
        }
        
        await MainActor.run {
            isLoading = false
        }
    }
    
    private func parseActivitiesToBlocks(_ activities: [Activity]) -> [TimeBlock] {
        var blocks: [TimeBlock] = []
        
        for hour in 0..<24 {
            let hourActivities = activities.filter { activity in
                guard let date = ISO8601DateFormatter().date(from: activity.timestamp) else { return false }
                return Calendar.current.component(.hour, from: date) == hour
            }
            
            let totalMinutes = hourActivities.reduce(0) { $0 + ($1.duration ?? 0) } / 60
            
            var dominantCategory: ActivityCategory = .idle
            if !hourActivities.isEmpty {
                let categories = hourActivities.map(\.category)
                let counts = Dictionary(grouping: categories) { $0 }.mapValues(\.count)
                dominantCategory = counts.max(by: { $0.value < $1.value })?.key ?? .idle
            }
            
            blocks.append(TimeBlock(
                hour: hour,
                activities: hourActivities,
                dominantCategory: dominantCategory,
                totalMinutes: min(totalMinutes, 60)
            ))
        }
        
        return blocks
    }
    
    private func generateMockBlocks() -> [TimeBlock] {
        // Mock data for demo purposes
        let mockCategories: [(Int, ActivityCategory)] = [
            (8, .focus),
            (9, .focus),
            (10, .break_),
            (11, .collaboration),
            (12, .break_),
            (13, .focus),
            (14, .focus),
            (15, .distraction),
            (16, .collaboration),
            (17, .focus)
        ]
        
        return (0..<24).map { hour in
            let category = mockCategories.first { $0.0 == hour }?.1 ?? .idle
            return TimeBlock(
                hour: hour,
                activities: [],
                dominantCategory: category,
                totalMinutes: category == .idle ? 0 : Int.random(in: 30...60)
            )
        }
    }
}

// MARK: - Stat Card
struct StatCard: View {
    let title: String
    let value: Int
    let unit: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 4) {
            Text("\(value)")
                .font(.title2)
                .fontWeight(.bold)
                .foregroundStyle(color)
            
            Text(unit)
                .font(.caption2)
                .foregroundStyle(.secondary)
            
            Text(title)
                .font(.caption)
                .foregroundStyle(Color.textPrimary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

// MARK: - Time Block Row
struct TimeBlockRow: View {
    let block: TimeBlock
    
    var body: some View {
        HStack(spacing: 12) {
            Text(block.hourLabel)
                .font(.caption)
                .foregroundStyle(.secondary)
                .frame(width: 40, alignment: .trailing)
            
            GeometryReader { geometry in
                RoundedRectangle(cornerRadius: 4)
                    .fill(block.dominantCategory.color.opacity(block.totalMinutes > 0 ? 0.8 : 0.1))
                    .frame(width: max(4, geometry.size.width * CGFloat(block.totalMinutes) / 60))
                    .animation(.easeInOut, value: block.totalMinutes)
            }
            .frame(height: 24)
            
            if block.totalMinutes > 0 {
                Text("\(block.totalMinutes)m")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .frame(width: 30)
            } else {
                Spacer()
                    .frame(width: 30)
            }
        }
    }
}

// MARK: - Time Block Detail Sheet
struct TimeBlockDetailSheet: View {
    let block: TimeBlock
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationStack {
            List {
                Section {
                    LabeledContent("Time", value: block.hourLabel)
                    LabeledContent("Category", value: block.dominantCategory.displayName)
                    LabeledContent("Duration", value: "\(block.totalMinutes) minutes")
                }
                
                if !block.activities.isEmpty {
                    Section("Activities") {
                        ForEach(block.activities) { activity in
                            VStack(alignment: .leading, spacing: 4) {
                                Text(activity.type.rawValue.capitalized)
                                    .font(.headline)
                                
                                if let duration = activity.duration {
                                    Text("\(duration / 60) minutes")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                
                                if let metadata = activity.metadata,
                                   let app = metadata["app"] as? String {
                                    Text(app)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                            .padding(.vertical, 4)
                        }
                    }
                }
            }
            .navigationTitle("Hour Details")
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
}

#Preview {
    TimelineView()
        .environment(AppState())
}
