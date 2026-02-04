//
//  AgentsView.swift
//  LifeLog
//
//  Marketplace grid view of AI agents with search, filters, and ratings
//  Part of the multi-agent platform UI
//

import SwiftUI

struct AgentsView: View {
    @StateObject private var viewModel = AgentsViewModel()
    @State private var selectedAgent: Agent?
    @State private var searchText = ""
    @State private var selectedCategory: AgentCategory? = nil
    
    private let columns = [
        GridItem(.flexible(), spacing: 16),
        GridItem(.flexible(), spacing: 16)
    ]
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Search bar
                    searchBar
                    
                    // Category filter chips
                    categoryChips
                    
                    // Content
                    if viewModel.isLoading {
                        loadingView
                    } else if filteredAgents.isEmpty {
                        emptyView
                    } else {
                        // Featured section (only show when no filter/search)
                        if selectedCategory == nil && searchText.isEmpty && !featuredAgents.isEmpty {
                            featuredSection
                        }
                        
                        // All agents grid
                        allAgentsSection
                    }
                }
                .padding()
            }
            .background(Color.background)
            .navigationTitle("Marketplace")
            .navigationBarTitleDisplayMode(.large)
            .refreshable {
                await viewModel.loadAgents(category: selectedCategory, search: searchText)
            }
            .onAppear {
                Task {
                    await viewModel.loadAgents()
                }
            }
            .onChange(of: selectedCategory) { _, newValue in
                Task {
                    await viewModel.loadAgents(category: newValue, search: searchText)
                }
            }
            .onChange(of: searchText) { _, newValue in
                // Debounce search
                Task {
                    try? await Task.sleep(nanoseconds: 300_000_000) // 0.3s
                    await viewModel.loadAgents(category: selectedCategory, search: newValue)
                }
            }
            .navigationDestination(item: $selectedAgent) { agent in
                AgentChatView(agent: agent)
            }
        }
    }
    
    // MARK: - Search Bar
    
    private var searchBar: some View {
        HStack(spacing: 12) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(Color.textSecondary)
            
            TextField("Search agents...", text: $searchText)
                .textFieldStyle(.plain)
                .foregroundStyle(Color.textPrimary)
            
            if !searchText.isEmpty {
                Button(action: { searchText = "" }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(Color.textSecondary)
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
    
    // MARK: - Category Chips
    
    private var categoryChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                // All chip
                CategoryChip(
                    title: "All",
                    icon: "square.grid.2x2",
                    isSelected: selectedCategory == nil
                ) {
                    selectedCategory = nil
                }
                
                // Category chips
                ForEach(AgentCategory.allCases, id: \.self) { category in
                    CategoryChip(
                        title: category.displayName,
                        icon: category.icon,
                        isSelected: selectedCategory == category
                    ) {
                        selectedCategory = category
                    }
                }
            }
        }
    }
    
    // MARK: - Featured Section
    
    private var featuredSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "star.fill")
                    .foregroundStyle(Color.brandAccent)
                Text("Featured")
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundStyle(Color.textPrimary)
            }
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 16) {
                    ForEach(featuredAgents) { agent in
                        FeaturedAgentCard(agent: agent) {
                            selectedAgent = agent
                        }
                    }
                }
            }
        }
    }
    
    // MARK: - All Agents Section
    
    private var allAgentsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(sectionTitle)
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundStyle(Color.textPrimary)
                
                Spacer()
                
                Text("\(displayAgents.count) agents")
                    .font(.caption)
                    .foregroundStyle(Color.textSecondary)
            }
            
            LazyVGrid(columns: columns, spacing: 16) {
                ForEach(displayAgents) { agent in
                    AgentCard(agent: agent) {
                        selectedAgent = agent
                    }
                }
            }
        }
    }
    
    // MARK: - Loading View
    
    private var loadingView: some View {
        LazyVGrid(columns: columns, spacing: 16) {
            ForEach(0..<6, id: \.self) { _ in
                AgentCardSkeleton()
            }
        }
    }
    
    // MARK: - Empty View
    
    private var emptyView: some View {
        VStack(spacing: 16) {
            Image(systemName: "person.3.fill")
                .font(.system(size: 48))
                .foregroundStyle(Color.textSecondary)
            
            Text("No Agents Found")
                .font(.headline)
                .foregroundStyle(Color.textPrimary)
            
            Text(searchText.isEmpty ? "Check back later or pull to refresh" : "Try a different search term")
                .font(.subheadline)
                .foregroundStyle(Color.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 60)
    }
    
    // MARK: - Computed Properties
    
    private var filteredAgents: [Agent] {
        viewModel.agents
    }
    
    private var featuredAgents: [Agent] {
        viewModel.agents.filter { $0.isFeatured }
    }
    
    private var displayAgents: [Agent] {
        if selectedCategory == nil && searchText.isEmpty {
            return viewModel.agents.filter { !$0.isFeatured }
        }
        return viewModel.agents
    }
    
    private var sectionTitle: String {
        if let category = selectedCategory {
            return "\(category.displayName) Agents"
        }
        if !searchText.isEmpty {
            return "Search Results"
        }
        return "All Agents"
    }
}

// MARK: - Category Chip

struct CategoryChip: View {
    let title: String
    let icon: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            action()
        }) {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.caption)
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(isSelected ? Color.brandInteractive : Color.cardBackground)
            .foregroundStyle(isSelected ? .white : Color.textPrimary)
            .clipShape(Capsule())
            .shadow(color: Color.black.opacity(0.05), radius: 2, x: 0, y: 1)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Featured Agent Card

struct FeaturedAgentCard: View {
    let agent: Agent
    let onTap: () -> Void
    
    @State private var isPressed = false
    
    var body: some View {
        Button(action: {
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            onTap()
        }) {
            VStack(alignment: .leading, spacing: 12) {
                // Header with emoji and badge
                HStack {
                    Text(agent.icon)
                        .font(.system(size: 40))
                    
                    Spacer()
                    
                    VStack(alignment: .trailing, spacing: 4) {
                        PriceBadge(isFree: agent.isFree, price: agent.priceDisplay)
                        StarRating(rating: agent.displayRating, compact: true)
                    }
                }
                
                // Name and category
                VStack(alignment: .leading, spacing: 4) {
                    Text(agent.name)
                        .font(.headline)
                        .foregroundStyle(Color.textPrimary)
                    
                    if let category = agent.category {
                        Text(category.displayName)
                            .font(.caption)
                            .foregroundStyle(Color.brandInteractive)
                    }
                }
                
                // Description
                Text(agent.displayDescription)
                    .font(.caption)
                    .foregroundStyle(Color.textSecondary)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
                
                // Usage count
                HStack {
                    Image(systemName: "person.2")
                        .font(.caption2)
                    Text("\(formatUsage(agent.displayUsageCount)) uses")
                        .font(.caption2)
                }
                .foregroundStyle(Color.textSecondary)
            }
            .padding()
            .frame(width: 200, alignment: .topLeading)
            .background(
                LinearGradient(
                    colors: [Color.brandInteractive.opacity(0.1), Color.success.opacity(0.05)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(Color.brandInteractive.opacity(0.3), lineWidth: 1)
            )
            .scaleEffect(isPressed ? 0.97 : 1.0)
        }
        .buttonStyle(.plain)
        .onLongPressGesture(minimumDuration: .infinity, pressing: { pressing in
            withAnimation(.easeInOut(duration: 0.15)) {
                isPressed = pressing
            }
        }, perform: {})
    }
    
    private func formatUsage(_ count: Int) -> String {
        if count >= 1000 {
            return String(format: "%.1fk", Double(count) / 1000.0)
        }
        return "\(count)"
    }
}

// MARK: - Agent Card

struct AgentCard: View {
    let agent: Agent
    let onTap: () -> Void
    
    @State private var isPressed = false
    
    var body: some View {
        Button(action: {
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            onTap()
        }) {
            VStack(alignment: .leading, spacing: 12) {
                // Header with emoji and price badge
                HStack {
                    Text(agent.icon)
                        .font(.system(size: 36))
                    
                    Spacer()
                    
                    PriceBadge(isFree: agent.isFree, price: agent.priceDisplay)
                }
                
                // Name
                Text(agent.name)
                    .font(.headline)
                    .foregroundStyle(Color.textPrimary)
                    .lineLimit(1)
                
                // Description
                Text(agent.displayDescription)
                    .font(.caption)
                    .foregroundStyle(Color.textSecondary)
                    .lineLimit(3)
                    .multilineTextAlignment(.leading)
                
                Spacer()
                
                // Rating and usage
                HStack {
                    StarRating(rating: agent.displayRating, compact: true)
                    
                    Spacer()
                    
                    Text("\(formatUsage(agent.displayUsageCount)) uses")
                        .font(.caption2)
                        .foregroundStyle(Color.textSecondary)
                }
                
                // Capabilities
                if let capabilities = agent.capabilities, !capabilities.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 4) {
                            ForEach(capabilities.prefix(2), id: \.self) { cap in
                                Text(cap)
                                    .font(.caption2)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(Color.brandInteractive.opacity(0.1))
                                    .foregroundStyle(Color.brandInteractive)
                                    .clipShape(Capsule())
                            }
                        }
                    }
                }
                
                // Chat button hint
                HStack {
                    Text("Chat")
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundStyle(Color.brandInteractive)
                    
                    Image(systemName: "arrow.right")
                        .font(.caption)
                        .foregroundStyle(Color.brandInteractive)
                }
            }
            .padding()
            .frame(maxWidth: .infinity, minHeight: 220, alignment: .topLeading)
            .background(Color.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .shadow(color: Color.black.opacity(0.05), radius: 8, x: 0, y: 2)
            .scaleEffect(isPressed ? 0.97 : 1.0)
        }
        .buttonStyle(.plain)
        .onLongPressGesture(minimumDuration: .infinity, pressing: { pressing in
            withAnimation(.easeInOut(duration: 0.15)) {
                isPressed = pressing
            }
        }, perform: {})
    }
    
    private func formatUsage(_ count: Int) -> String {
        if count >= 1000 {
            return String(format: "%.1fk", Double(count) / 1000.0)
        }
        return "\(count)"
    }
}

// MARK: - Star Rating

struct StarRating: View {
    let rating: Double
    let compact: Bool
    
    var body: some View {
        HStack(spacing: 2) {
            ForEach(1...5, id: \.self) { star in
                Image(systemName: star <= Int(rating.rounded()) ? "star.fill" : "star")
                    .font(.caption2)
                    .foregroundStyle(star <= Int(rating.rounded()) ? Color.orange : Color.gray.opacity(0.3))
            }
            
            if !compact {
                Text(String(format: "%.1f", rating))
                    .font(.caption2)
                    .foregroundStyle(Color.textSecondary)
            }
        }
    }
}

// MARK: - Price Badge

struct PriceBadge: View {
    let isFree: Bool
    let price: String
    
    var body: some View {
        Text(price)
            .font(.caption2)
            .fontWeight(.bold)
            .foregroundStyle(.white)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(
                RoundedRectangle(cornerRadius: 8)
                    .fill(isFree ? Color.success : Color.brandAccent)
            )
    }
}

// MARK: - Agent Card Skeleton

struct AgentCardSkeleton: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Circle()
                    .fill(Color.gray.opacity(0.2))
                    .frame(width: 40, height: 40)
                
                Spacer()
                
                RoundedRectangle(cornerRadius: 6)
                    .fill(Color.gray.opacity(0.2))
                    .frame(width: 50, height: 20)
            }
            
            RoundedRectangle(cornerRadius: 4)
                .fill(Color.gray.opacity(0.3))
                .frame(width: 100, height: 18)
            
            VStack(spacing: 4) {
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color.gray.opacity(0.2))
                    .frame(height: 12)
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color.gray.opacity(0.2))
                    .frame(height: 12)
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color.gray.opacity(0.2))
                    .frame(width: 80, height: 12)
            }
            
            Spacer()
        }
        .padding()
        .frame(maxWidth: .infinity, minHeight: 220, alignment: .topLeading)
        .background(Color.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shimmer()
    }
}

// MARK: - View Model

@MainActor
class AgentsViewModel: ObservableObject {
    @Published var agents: [Agent] = []
    @Published var isLoading = true
    @Published var error: String?
    
    private let agentService = AgentService.shared
    
    func loadAgents(category: AgentCategory? = nil, search: String? = nil) async {
        isLoading = true
        error = nil
        
        agents = await agentService.fetchMarketplaceAgents(category: category, search: search)
        
        isLoading = false
    }
}

// MARK: - Preview

#Preview {
    AgentsView()
}
