//
//  AgentService.swift
//  LifeLog
//
//  Service for interacting with the multi-agent API
//  Handles agent listing, messaging, and x402 payment flows
//

import Foundation

// MARK: - Agent Service Errors

enum AgentServiceError: Error, LocalizedError {
    case invalidResponse
    case serverError(Int)
    case networkError(Error)
    case decodingError(Error)
    case paymentRequired(PaymentRequest)
    case unauthorized
    case agentNotFound
    
    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Invalid response from server"
        case .serverError(let code):
            return "Server error: \(code)"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .decodingError(let error):
            return "Failed to decode response: \(error.localizedDescription)"
        case .paymentRequired(let request):
            return "Payment required: \(request.priceDisplay)"
        case .unauthorized:
            return "Authentication required"
        case .agentNotFound:
            return "Agent not found"
        }
    }
}

// MARK: - Agent Service

actor AgentService {
    private let session: URLSession
    private let baseURL: String
    private var apiKey: String?
    
    // In-memory conversation cache
    private var conversations: [String: AgentConversation] = [:]
    
    init(baseURL: String = "https://dashboard-flame-five-76.vercel.app", apiKey: String? = nil) {
        self.baseURL = baseURL
        self.apiKey = apiKey
        
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        self.session = URLSession(configuration: config)
    }
    
    func updateApiKey(_ key: String?) {
        self.apiKey = key
    }
    
    // MARK: - Request Helpers
    
    private func makeRequest(url: URL, method: String = "GET", body: [String: Any]? = nil) -> URLRequest {
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let apiKey = apiKey, !apiKey.isEmpty {
            request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        }
        
        if let body = body {
            request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        }
        
        return request
    }
    
    // MARK: - Fetch Agents
    
    /// Fetch list of available agents from the API
    func fetchAgents() async -> [Agent] {
        let url = URL(string: "\(baseURL)/api/agents")!
        let request = makeRequest(url: url)
        
        do {
            let (data, response) = try await session.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                print("[AgentService] Invalid response type")
                return Agent.mockAgents
            }
            
            guard httpResponse.statusCode == 200 else {
                print("[AgentService] Server returned \(httpResponse.statusCode)")
                return Agent.mockAgents
            }
            
            let decoded = try JSONDecoder().decode(AgentListResponse.self, from: data)
            return decoded.agents
            
        } catch {
            print("[AgentService] Error fetching agents: \(error)")
            return Agent.mockAgents
        }
    }
    
    // MARK: - Send Message
    
    /// Send a message to an agent
    /// - Parameters:
    ///   - agentId: The agent to message
    ///   - message: The user's message
    ///   - userId: The user's ID
    ///   - conversationId: Optional existing conversation ID
    ///   - paymentProof: Optional payment proof for paid agents
    /// - Returns: The agent's response and conversation ID
    /// - Throws: AgentServiceError, including .paymentRequired for 402 responses
    func sendMessage(
        agentId: String,
        message: String,
        userId: String,
        conversationId: String? = nil,
        paymentProof: PaymentProof? = nil
    ) async throws -> (response: String, conversationId: String) {
        let url = URL(string: "\(baseURL)/api/agents/\(agentId)/message")!
        
        var body: [String: Any] = [
            "message": message
        ]
        
        if let conversationId = conversationId {
            body["conversationId"] = conversationId
        }
        
        if let proof = paymentProof {
            body["paymentProof"] = [
                "signature": proof.signature,
                "paymentId": proof.paymentId,
                "timestamp": proof.timestamp,
                "chain": proof.chain,
                "txHash": proof.txHash as Any
            ]
        }
        
        var request = makeRequest(url: url, method: "POST", body: body)
        // Add user ID to headers for the backend
        request.setValue(userId, forHTTPHeaderField: "X-User-ID")
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw AgentServiceError.invalidResponse
        }
        
        // Handle 402 Payment Required
        if httpResponse.statusCode == 402 {
            let paymentRequest = try JSONDecoder().decode(PaymentRequest.self, from: data)
            throw AgentServiceError.paymentRequired(paymentRequest)
        }
        
        guard httpResponse.statusCode == 200 else {
            if httpResponse.statusCode == 404 {
                throw AgentServiceError.agentNotFound
            }
            if httpResponse.statusCode == 401 {
                throw AgentServiceError.unauthorized
            }
            throw AgentServiceError.serverError(httpResponse.statusCode)
        }
        
        let agentResponse = try JSONDecoder().decode(AgentMessageResponse.self, from: data)
        
        // Check if there's a payment required in the response body
        if let paymentRequired = agentResponse.paymentRequired {
            throw AgentServiceError.paymentRequired(paymentRequired)
        }
        
        return (agentResponse.response.content, agentResponse.conversationId)
    }
    
    // MARK: - Get Agent Pricing
    
    /// Get pricing information for an agent
    func getAgentPricing(agentId: String) async throws -> AgentPricing {
        let url = URL(string: "\(baseURL)/api/agents/\(agentId)/pricing")!
        let request = makeRequest(url: url)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw AgentServiceError.invalidResponse
        }
        
        guard httpResponse.statusCode == 200 else {
            throw AgentServiceError.serverError(httpResponse.statusCode)
        }
        
        struct PricingResponse: Codable {
            let agentId: String
            let pricing: AgentPricing
            let walletAddress: String
        }
        
        let pricing = try JSONDecoder().decode(PricingResponse.self, from: data)
        return pricing.pricing
    }
    
    // MARK: - Conversation Management
    
    /// Get or create a conversation with an agent
    func getConversation(agentId: String, userId: String) -> AgentConversation {
        let key = "\(userId)_\(agentId)"
        
        if let existing = conversations[key] {
            return existing
        }
        
        let conversation = AgentConversation(
            id: UUID().uuidString,
            userId: userId,
            agentId: agentId,
            messages: [],
            createdAt: Date(),
            updatedAt: Date()
        )
        
        conversations[key] = conversation
        return conversation
    }
    
    /// Add a message to a conversation
    func addMessage(_ message: ChatMessage, to conversationKey: String) {
        if var conversation = conversations[conversationKey] {
            conversation.messages.append(message)
            conversation.updatedAt = Date()
            conversations[conversationKey] = conversation
        }
    }
    
    /// Clear conversation history for an agent
    func clearConversation(agentId: String, userId: String) {
        let key = "\(userId)_\(agentId)"
        conversations.removeValue(forKey: key)
    }
}

// MARK: - Singleton for shared access

extension AgentService {
    static let shared = AgentService(
        apiKey: KeychainHelper.load(key: "lifelogApiKey")
    )
}
