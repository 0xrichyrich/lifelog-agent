//
//  Agent.swift
//  LifeLog
//
//  Multi-agent platform models for Nudge Coach, Coffee Scout, Book Buddy
//  Extended for Marketplace support
//

import Foundation

// MARK: - Agent Category

enum AgentCategory: String, Codable, CaseIterable {
    case wellness
    case productivity
    case lifestyle
    case entertainment
    
    var displayName: String {
        rawValue.capitalized
    }
    
    var icon: String {
        switch self {
        case .wellness: return "heart.fill"
        case .productivity: return "bolt.fill"
        case .lifestyle: return "star.fill"
        case .entertainment: return "gamecontroller.fill"
        }
    }
    
    var color: String {
        switch self {
        case .wellness: return "mint"
        case .productivity: return "orange"
        case .lifestyle: return "purple"
        case .entertainment: return "pink"
        }
    }
}

// MARK: - Agent Model

struct Agent: Identifiable, Codable, Hashable {
    let id: String
    let name: String
    let icon: String  // emoji
    let personality: String
    let pricing: AgentPricing
    let triggers: [String]?
    
    // Marketplace fields (optional for backwards compatibility)
    let description: String?
    let category: AgentCategory?
    let rating: Double?
    let totalRatings: Int?
    let usageCount: Int?
    let featured: Bool?
    let capabilities: [String]?
    
    // Computed properties
    
    /// Get description, falling back to personality
    var displayDescription: String {
        description ?? personality
    }
    
    /// Whether this agent is featured
    var isFeatured: Bool {
        featured ?? false
    }
    
    /// Whether this agent is completely free to use
    var isFree: Bool {
        pricing.isFree
    }
    
    /// Agent's rating or default
    var displayRating: Double {
        rating ?? 4.5
    }
    
    /// Usage count or default
    var displayUsageCount: Int {
        usageCount ?? 0
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
    
    // Custom decoding to handle API response format
    enum CodingKeys: String, CodingKey {
        case id, name, icon, personality, pricing, triggers
        case description, category, rating, totalRatings, usageCount, featured, capabilities
        case price, isFree
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        id = try container.decode(String.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        icon = try container.decode(String.self, forKey: .icon)
        
        // Handle personality vs description
        if let desc = try? container.decode(String.self, forKey: .description) {
            description = desc
            personality = try container.decodeIfPresent(String.self, forKey: .personality) ?? desc
        } else {
            personality = try container.decode(String.self, forKey: .personality)
            description = nil
        }
        
        // Handle pricing - might be full object or separate fields
        if let fullPricing = try? container.decode(AgentPricing.self, forKey: .pricing) {
            pricing = fullPricing
        } else {
            // Construct from marketplace API format
            let price = try container.decodeIfPresent(Int.self, forKey: .price) ?? 0
            let isFree = try container.decodeIfPresent(Bool.self, forKey: .isFree) ?? (price == 0)
            pricing = AgentPricing(perMessage: price, isFree: isFree, freeTierDaily: nil)
        }
        
        triggers = try container.decodeIfPresent([String].self, forKey: .triggers)
        category = try container.decodeIfPresent(AgentCategory.self, forKey: .category)
        rating = try container.decodeIfPresent(Double.self, forKey: .rating)
        totalRatings = try container.decodeIfPresent(Int.self, forKey: .totalRatings)
        usageCount = try container.decodeIfPresent(Int.self, forKey: .usageCount)
        featured = try container.decodeIfPresent(Bool.self, forKey: .featured)
        capabilities = try container.decodeIfPresent([String].self, forKey: .capabilities)
    }
    
    init(
        id: String,
        name: String,
        icon: String,
        personality: String,
        pricing: AgentPricing,
        triggers: [String]?,
        description: String? = nil,
        category: AgentCategory? = nil,
        rating: Double? = nil,
        totalRatings: Int? = nil,
        usageCount: Int? = nil,
        featured: Bool? = nil,
        capabilities: [String]? = nil
    ) {
        self.id = id
        self.name = name
        self.icon = icon
        self.personality = personality
        self.pricing = pricing
        self.triggers = triggers
        self.description = description
        self.category = category
        self.rating = rating
        self.totalRatings = totalRatings
        self.usageCount = usageCount
        self.featured = featured
        self.capabilities = capabilities
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

struct MarketplaceAgentResponse: Codable {
    let agents: [Agent]
    let total: Int?
    let categories: [String]?
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
            triggers: ["check-in", "mood", "wellness", "tired", "stressed"],
            description: "Your wellness companion. Gentle check-ins, emotional support, and positive reinforcement for daily mindfulness.",
            category: .wellness,
            rating: 4.9,
            totalRatings: 2341,
            usageCount: 15420,
            featured: true,
            capabilities: ["daily check-ins", "mood tracking", "wellness tips"]
        ),
        Agent(
            id: "coffee-scout",
            name: "Coffee Scout",
            icon: "☕",
            personality: "Local coffee expert. Finds the perfect café based on your vibe, location, and preferences.",
            pricing: AgentPricing(perMessage: 10000, isFree: false, freeTierDaily: 3),
            triggers: ["coffee", "café", "work spot", "study spot"],
            description: "Local coffee expert. Finds the perfect café based on your vibe, location, and work preferences.",
            category: .lifestyle,
            rating: 4.8,
            totalRatings: 1456,
            usageCount: 9200,
            featured: true,
            capabilities: ["café recommendations", "vibe matching", "location-aware"]
        ),
        Agent(
            id: "book-buddy",
            name: "Book Buddy",
            icon: "📚",
            personality: "Your literary companion. Book recommendations, reading lists, and bookish conversations.",
            pricing: AgentPricing(perMessage: 10000, isFree: false, freeTierDaily: 3),
            triggers: ["book", "read", "recommend", "author"],
            description: "Your literary companion. Book recommendations, reading lists, and bookish conversations tailored to your taste.",
            category: .lifestyle,
            rating: 4.7,
            totalRatings: 823,
            usageCount: 5800,
            featured: false,
            capabilities: ["book recommendations", "reading lists", "genre matching"]
        )
    ]
}
