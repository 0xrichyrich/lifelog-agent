//
//  TimelineView.swift
//  LifeLog
//
//  Created by Joshua Rich on 2026-02-02.
//  Updated with competitive polish - color-coded hourly blocks, smooth transitions
//

import SwiftUI

struct TimelineView: View {
    @Environment(AppState.self) private var appState
    @State private var selectedDate = Date()
    @State private var activities: [Activity] = []
    @State private var timeBlocks: [TimeBlock] = []
    @State private var isLoading = true
    @State private var selectedBlock: TimeBlock?
    @State private var loadError: Error?
    @State private var loadTask: Task<Void, Never>?
    
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
                print("👁️ Timeline onAppear")
                // Cancel any existing load and start fresh
                loadTask?.cancel()
                loadTask = Task {
                    await loadActivities()
                }
            }
            .onDisappear {
                print("👁️ Timeline onDisappear")
                // Cancel load if view disappears
                loadTask?.cancel()
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
                withAnimation(.smoothBounce) {
                    selectedDate = Calendar.current.date(byAdding: .day, value: -1, to: selectedDate) ?? selectedDate
                }
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
            } label: {
                Image(systemName: "chevron.left.circle.fill")
                    .font(.title2)
                    .foregroundStyle(Color.brandInteractive)
            }
            
            Spacer()
            
            VStack(spacing: 2) {
                Text(dayOfWeek)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                
                Text(formattedDate)
                    .font(.headline)
                    .foregroundStyle(Color.textPrimary)
            }
            
            Spacer()
            
            Button {
                if !Calendar.current.isDateInToday(selectedDate) {
                    withAnimation(.smoothBounce) {
                        selectedDate = Calendar.current.date(byAdding: .day, value: 1, to: selectedDate) ?? selectedDate
                    }
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                }
            } label: {
                Image(systemName: "chevron.right.circle.fill")
                    .font(.title2)
                    .foregroundStyle(Calendar.current.isDateInToday(selectedDate) ? Color.gray.opacity(0.5) : Color.brandInteractive)
            }
            .disabled(Calendar.current.isDateInToday(selectedDate))
        }
        .padding()
        .background(Color.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
    
    private var dayOfWeek: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE"
        return formatter.string(from: selectedDate)
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
        HStack(spacing: 12) {
            AnimatedStatCard(
                title: "Focus",
                value: focusMinutes,
                unit: "min",
                icon: "brain.head.profile",
                color: .success,
                delay: 0.0
            )
            
            AnimatedStatCard(
                title: "Meetings",
                value: meetingMinutes,
                unit: "min",
                icon: "person.3.fill",
                color: .warning,
                delay: 0.1
            )
            
            AnimatedStatCard(
                title: "Breaks",
                value: breakMinutes,
                unit: "min",
                icon: "cup.and.saucer.fill",
                color: Color(.systemGray),
                delay: 0.2
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
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Hour by Hour")
                    .font(.headline)
                    .foregroundStyle(Color.textPrimary)
                
                Spacer()
                
                if !isLoading {
                    Text("\(totalActiveHours)h tracked")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            
            if isLoading {
                SkeletonTimeline()
                    .padding()
                    .background(Color.cardBackground)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            } else if let error = loadError {
                NetworkErrorView(retryAction: {
                    Task { await loadActivities() }
                })
            } else if timeBlocks.filter({ $0.totalMinutes > 0 }).isEmpty {
                EmptyTimelineView()
            } else {
                LazyVStack(spacing: 2) {
                    ForEach(Array(timeBlocks.filter { $0.hour >= 6 && $0.hour <= 23 }.enumerated()), id: \.element.id) { index, block in
                        ImprovedTimeBlockRow(block: block, animationDelay: Double(index) * 0.02)
                            .onTapGesture {
                                if !block.activities.isEmpty || block.totalMinutes > 0 {
                                    selectedBlock = block
                                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                }
                            }
                    }
                }
                .padding()
                .background(Color.cardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
    }
    
    private var totalActiveHours: Int {
        timeBlocks.filter { $0.totalMinutes >= 30 }.count
    }
    
    // MARK: - Actions
    private func loadActivities() async {
        print("🔄 loadActivities called, isCancelled: \(Task.isCancelled)")
        
        // Check if cancelled before starting
        guard !Task.isCancelled else {
            print("⏹️ Task was cancelled, skipping load")
            return
        }
        
        isLoading = true
        loadError = nil
        
        do {
            let endpoint = appState.apiEndpoint
            print("📡 Timeline loading from: \(endpoint)")
            await apiClient.updateBaseURL(endpoint)
            
            // Check cancellation before network call
            guard !Task.isCancelled else { return }
            
            let fetchedActivities = try await apiClient.fetchActivities(for: selectedDate)
            
            // Check cancellation before updating UI
            guard !Task.isCancelled else { return }
            
            print("✅ Loaded \(fetchedActivities.count) activities")
            
            await MainActor.run {
                activities = fetchedActivities
                timeBlocks = parseActivitiesToBlocks(fetchedActivities)
                appState.activities = fetchedActivities
                appState.syncToSharedDefaults()
            }
        } catch is CancellationError {
            // Task was cancelled, this is expected behavior
            print("📡 Timeline load cancelled (tab switched)")
        } catch {
            // Only show error if not cancelled
            guard !Task.isCancelled else { return }
            print("❌ Failed to load activities from \(appState.apiEndpoint): \(error)")
            await MainActor.run {
                loadError = error
            }
        }
        
        // Only update loading state if not cancelled
        guard !Task.isCancelled else { return }
        await MainActor.run {
            isLoading = false
        }
    }
    
    private func parseActivitiesToBlocks(_ activities: [Activity]) -> [TimeBlock] {
        var blocks: [TimeBlock] = []
        
        print("📊 Parsing \(activities.count) activities into time blocks")
        
        for hour in 0..<24 {
            let hourActivities = activities.filter { activity in
                guard let date = ISO8601DateFormatter().date(from: activity.timestamp) else { 
                    print("⚠️ Failed to parse timestamp: \(activity.timestamp)")
                    return false 
                }
                let activityHour = Calendar.current.component(.hour, from: date)
                return activityHour == hour
            }
            
            if !hourActivities.isEmpty {
                print("⏰ Hour \(hour): \(hourActivities.count) activities")
            }
            
            // Give check-ins a default 5-minute duration for display
            let totalMinutes = hourActivities.reduce(0) { total, activity in
                let duration = activity.duration ?? 300 // Default 5 min (300 sec) for check-ins
                return total + duration
            } / 60
            
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
    
}

// MARK: - Animated Stat Card
struct AnimatedStatCard: View {
    let title: String
    let value: Int
    let unit: String
    let icon: String
    let color: Color
    let delay: Double
    
    @State private var displayedValue: Int = 0
    @State private var hasAppeared = false
    
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(color)
            
            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text("\(displayedValue)")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundStyle(color)
                    .contentTransition(.numericText())
                
                Text(unit)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            
            Text(title)
                .font(.caption)
                .foregroundStyle(Color.textPrimary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(Color.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .scaleEffect(hasAppeared ? 1.0 : 0.9)
        .opacity(hasAppeared ? 1.0 : 0)
        .onAppear {
            withAnimation(.smoothBounce.delay(delay)) {
                hasAppeared = true
            }
            withAnimation(.easeOut(duration: 0.6).delay(delay + 0.2)) {
                displayedValue = value
            }
        }
        .onChange(of: value) { _, newValue in
            withAnimation(.easeOut(duration: 0.3)) {
                displayedValue = newValue
            }
        }
    }
}

// MARK: - Improved Time Block Row
struct ImprovedTimeBlockRow: View {
    let block: TimeBlock
    let animationDelay: Double
    
    @State private var hasAppeared = false
    @State private var barWidth: CGFloat = 0
    
    private var isCurrentHour: Bool {
        Calendar.current.component(.hour, from: Date()) == block.hour
    }
    
    var body: some View {
        HStack(spacing: 12) {
            // Hour label
            Text(block.hourLabel)
                .font(.system(.caption, design: .monospaced))
                .foregroundStyle(isCurrentHour ? Color.brandAccent : .secondary)
                .fontWeight(isCurrentHour ? .bold : .regular)
                .frame(width: 44, alignment: .trailing)
            
            // Progress bar with category color
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    // Background track
                    RoundedRectangle(cornerRadius: 6)
                        .fill(Color.gray.opacity(0.1))
                    
                    // Filled portion with gradient
                    RoundedRectangle(cornerRadius: 6)
                        .fill(
                            LinearGradient(
                                colors: [
                                    block.dominantCategory.color,
                                    block.dominantCategory.color.opacity(0.7)
                                ],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(width: barWidth)
                    
                    // Current hour indicator
                    if isCurrentHour && block.totalMinutes == 0 {
                        HStack(spacing: 4) {
                            Circle()
                                .fill(Color.brandAccent)
                                .frame(width: 8, height: 8)
                                .pulseAnimation(isAnimating: true)
                            
                            Text("Now")
                                .font(.caption2)
                                .foregroundStyle(Color.brandAccent)
                        }
                        .padding(.leading, 8)
                    }
                }
                .onAppear {
                    DispatchQueue.main.asyncAfter(deadline: .now() + animationDelay) {
                        withAnimation(.spring(response: 0.5, dampingFraction: 0.7)) {
                            barWidth = max(4, geometry.size.width * CGFloat(block.totalMinutes) / 60)
                        }
                    }
                }
                .onChange(of: block.totalMinutes) { _, newValue in
                    withAnimation(.spring(response: 0.4, dampingFraction: 0.7)) {
                        barWidth = max(4, geometry.size.width * CGFloat(newValue) / 60)
                    }
                }
            }
            .frame(height: 28)
            
            // Duration label with category icon
            HStack(spacing: 4) {
                if block.totalMinutes > 0 {
                    Image(systemName: block.dominantCategory.icon)
                        .font(.caption2)
                        .foregroundStyle(block.dominantCategory.color)
                    
                    Text("\(block.totalMinutes)m")
                        .font(.system(.caption2, design: .monospaced))
                        .foregroundStyle(.secondary)
                }
            }
            .frame(width: 50, alignment: .leading)
        }
        .padding(.vertical, 4)
        .opacity(hasAppeared ? 1 : 0)
        .offset(x: hasAppeared ? 0 : -20)
        .onAppear {
            withAnimation(.easeOut(duration: 0.3).delay(animationDelay)) {
                hasAppeared = true
            }
        }
    }
}

// MARK: - Activity Category Extensions
extension ActivityCategory {
    var icon: String {
        switch self {
        case .focus: return "brain.head.profile"
        case .collaboration: return "person.3.fill"
        case .distraction: return "sparkles.tv"
        case .break_: return "cup.and.saucer.fill"
        case .idle: return "moon.zzz"
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
                    HStack {
                        Image(systemName: "clock")
                            .foregroundStyle(Color.brandAccent)
                        Text("Time")
                        Spacer()
                        Text(block.hourLabel)
                            .foregroundStyle(.secondary)
                    }
                    
                    HStack {
                        Image(systemName: block.dominantCategory.icon)
                            .foregroundStyle(block.dominantCategory.color)
                        Text("Category")
                        Spacer()
                        Text(block.dominantCategory.displayName)
                            .foregroundStyle(block.dominantCategory.color)
                    }
                    
                    HStack {
                        Image(systemName: "timer")
                            .foregroundStyle(Color.brandAccent)
                        Text("Duration")
                        Spacer()
                        Text("\(block.totalMinutes) minutes")
                            .foregroundStyle(.secondary)
                    }
                }
                
                if !block.activities.isEmpty {
                    Section("Activities") {
                        ForEach(block.activities) { activity in
                            VStack(alignment: .leading, spacing: 4) {
                                HStack {
                                    Circle()
                                        .fill(activity.category.color)
                                        .frame(width: 8, height: 8)
                                    
                                    Text(activity.type.rawValue.capitalized)
                                        .font(.headline)
                                }
                                
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
