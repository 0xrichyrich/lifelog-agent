//
//  Agent.swift
//  LifeLog
//
//  Multi-agent platform models for Nudge Coach, Coffee Scout, Book Buddy
//  Created for Moltiverse Hackathon
//

import Foundation

// MARK: - Agent Model

struct Agent: Identifiable, Codable, Hashable {
    let id: String
    let name: String
    let icon: String  // emoji
    let personality: String
    let pricing: AgentPricing
    let triggers: [String]?
    
    /// Whether this agent is completely free to use
    var isFree: Bool {
        pricing.isFree
    }
    
    /// Formatted price string for display
    var priceDisplay: String {
        if isFree {
            return "FREE"
        }
        let dollars = Double(pricing.perMessage) / 1_000_000.0
        if dollars < 0.01 {
            return "$\(String(format: "%.4f", dollars))/msg"
        }
        return "$\(String(format: "%.2f", dollars))/msg"
    }
    
    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
    
    static func == (lhs: Agent, rhs: Agent) -> Bool {
        lhs.id == rhs.id
    }
}

// MARK: - Agent Pricing

struct AgentPricing: Codable, Hashable {
    /// Cost per message in USDC (6 decimals, so 10000 = $0.01)
    let perMessage: Int
    /// Whether this agent is completely free
    let isFree: Bool
    /// Free tier message allowance per day
    let freeTierDaily: Int?
    
    /// Price in dollars
    var priceInDollars: Double {
        Double(perMessage) / 1_000_000.0
    }
}

// MARK: - Chat Message

struct ChatMessage: Identifiable, Codable {
    let id: String
    let content: String
    let timestamp: Date
    let isUser: Bool
    let agentId: String?
    
    init(id: String = UUID().uuidString, content: String, timestamp: Date = Date(), isUser: Bool, agentId: String? = nil) {
        self.id = id
        self.content = content
        self.timestamp = timestamp
        self.isUser = isUser
        self.agentId = agentId
    }
}

// MARK: - Conversation

struct AgentConversation: Identifiable, Codable {
    let id: String
    let userId: String
    let agentId: String
    var messages: [ChatMessage]
    let createdAt: Date
    var updatedAt: Date
}

// MARK: - API Response Types

struct AgentListResponse: Codable {
    let agents: [Agent]
}

struct AgentMessageResponse: Codable {
    let conversationId: String
    let response: AgentResponseMessage
    let paymentRequired: PaymentRequest?
}

struct AgentResponseMessage: Codable {
    let id: String
    let agentId: String
    let content: String
    let timestamp: String
}

// MARK: - Payment Types

struct PaymentRequest: Codable {
    let agentId: String
    let amount: Int  // USDC with 6 decimals
    let currency: String
    let recipient: String  // wallet address
    let description: String
    let expiresAt: String
    let nonce: String
    
    /// Price in dollars
    var priceInDollars: Double {
        Double(amount) / 1_000_000.0
    }
    
    /// Formatted price string
    var priceDisplay: String {
        let dollars = priceInDollars
        if dollars < 0.01 {
            return "$\(String(format: "%.4f", dollars))"
        }
        return "$\(String(format: "%.2f", dollars))"
    }
}

struct PaymentProof: Codable {
    let signature: String
    let paymentId: String
    let timestamp: String
    let chain: String
    let txHash: String?
}

// MARK: - Mock Agents (fallback when API unavailable)

extension Agent {
    static let mockAgents: [Agent] = [
        Agent(
            id: "nudge-coach",
            name: "Nudge Coach",
            icon: "🌱",
            personality: "Your wellness companion. Gentle check-ins, emotional support, and positive reinforcement.",
            pricing: AgentPricing(perMessage: 0, isFree: true, freeTierDaily: nil),
            triggers: ["check-in", "mood", "wellness", "tired", "stressed"]
        ),
        Agent(
            id: "coffee-scout",
            name: "Coffee Scout",
            icon: "☕",
            personality: "Local coffee expert. Finds the perfect café based on your vibe, location, and preferences.",
            pricing: AgentPricing(perMessage: 10000, isFree: false, freeTierDaily: 3),
            triggers: ["coffee", "café", "work spot", "study spot"]
        ),
        Agent(
            id: "book-buddy",
            name: "Book Buddy",
            icon: "📚",
            personality: "Your literary companion. Book recommendations, reading lists, and bookish conversations.",
            pricing: AgentPricing(perMessage: 10000, isFree: false, freeTierDaily: 3),
            triggers: ["book", "read", "recommend", "author"]
        )
    ]
}
