//
//  AgentsView.swift
//  LifeLog
//
//  Grid view of available AI agents with pricing badges
//  Part of the multi-agent platform UI
//

import SwiftUI

struct AgentsView: View {
    @StateObject private var viewModel = AgentsViewModel()
    @State private var selectedAgent: Agent?
    
    private let columns = [
        GridItem(.flexible(), spacing: 16),
        GridItem(.flexible(), spacing: 16)
    ]
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Header section
                    headerSection
                    
                    // Agents grid
                    if viewModel.isLoading {
                        loadingView
                    } else if viewModel.agents.isEmpty {
                        emptyView
                    } else {
                        agentsGrid
                    }
                }
                .padding()
            }
            .background(Color.background)
            .navigationTitle("Agents")
            .navigationBarTitleDisplayMode(.large)
            .refreshable {
                await viewModel.loadAgents()
            }
            .onAppear {
                Task {
                    await viewModel.loadAgents()
                }
            }
            .navigationDestination(item: $selectedAgent) { agent in
                AgentChatView(agent: agent)
            }
        }
    }
    
    // MARK: - Header Section
    
    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Talk to AI Agents")
                .font(.title2)
                .fontWeight(.semibold)
                .foregroundStyle(Color.textPrimary)
            
            Text("Specialized assistants powered by x402 micropayments")
                .font(.subheadline)
                .foregroundStyle(Color.textSecondary)
        }
    }
    
    // MARK: - Agents Grid
    
    private var agentsGrid: some View {
        LazyVGrid(columns: columns, spacing: 16) {
            ForEach(viewModel.agents) { agent in
                AgentCard(agent: agent) {
                    selectedAgent = agent
                }
            }
        }
    }
    
    // MARK: - Loading View
    
    private var loadingView: some View {
        LazyVGrid(columns: columns, spacing: 16) {
            ForEach(0..<4, id: \.self) { _ in
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
            
            Text("No Agents Available")
                .font(.headline)
                .foregroundStyle(Color.textPrimary)
            
            Text("Check back later or pull to refresh")
                .font(.subheadline)
                .foregroundStyle(Color.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 60)
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
                Text(agent.personality)
                    .font(.caption)
                    .foregroundStyle(Color.textSecondary)
                    .lineLimit(3)
                    .multilineTextAlignment(.leading)
                
                Spacer()
                
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
            .frame(maxWidth: .infinity, minHeight: 180, alignment: .topLeading)
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
        .frame(maxWidth: .infinity, minHeight: 180, alignment: .topLeading)
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
    
    func loadAgents() async {
        isLoading = true
        error = nil
        
        agents = await agentService.fetchAgents()
        
        isLoading = false
    }
}

// MARK: - Preview

#Preview {
    AgentsView()
}
