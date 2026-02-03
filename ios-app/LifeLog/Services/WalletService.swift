//
//  WalletService.swift
//  LifeLog
//
//  API client for wallet-related endpoints
//  Created for Moltiverse Hackathon
//

import Foundation

/// Service for interacting with wallet-related API endpoints
actor WalletService {
    private let session: URLSession
    private var baseURL: String
    private var apiKey: String?
    
    init(baseURL: String = "https://dashboard-flame-five-76.vercel.app", apiKey: String? = nil) {
        self.baseURL = baseURL
        self.apiKey = apiKey
        
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        self.session = URLSession(configuration: config)
    }
    
    func updateBaseURL(_ url: String) {
        self.baseURL = url
    }
    
    func updateApiKey(_ key: String?) {
        self.apiKey = key
    }
    
    // MARK: - Private Helpers
    
    private func authenticatedRequest(url: URL) -> URLRequest {
        var request = URLRequest(url: url)
        if let apiKey = apiKey, !apiKey.isEmpty {
            request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        }
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        return request
    }
    
    private func authenticatedPostRequest(url: URL, body: [String: Any]) throws -> URLRequest {
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let apiKey = apiKey, !apiKey.isEmpty {
            request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        }
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        return request
    }
    
    // MARK: - Wallet Balance
    
    /// Fetch the $LIFE token balance for a wallet address
    func fetchBalance(address: String) async throws -> WalletBalanceResponse {
        let url = URL(string: "\(baseURL)/api/wallet/balance?address=\(address)")!
        let request = authenticatedRequest(url: url)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw WalletError.invalidResponse
        }
        
        if httpResponse.statusCode == 401 {
            throw WalletError.unauthorized
        }
        
        guard httpResponse.statusCode == 200 else {
            throw WalletError.serverError(httpResponse.statusCode)
        }
        
        let decoder = JSONDecoder()
        return try decoder.decode(WalletBalanceResponse.self, from: data)
    }
    
    // MARK: - Claim Rewards
    
    /// Claim pending rewards (earned from check-ins and streaks)
    func claimRewards(address: String, signature: String? = nil) async throws -> ClaimRewardsResponse {
        let url = URL(string: "\(baseURL)/api/wallet/claim")!
        
        var body: [String: Any] = ["address": address]
        if let sig = signature {
            body["signature"] = sig
        }
        
        let request = try authenticatedPostRequest(url: url, body: body)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw WalletError.invalidResponse
        }
        
        if httpResponse.statusCode == 401 {
            throw WalletError.unauthorized
        }
        
        guard httpResponse.statusCode == 200 || httpResponse.statusCode == 201 else {
            // Try to parse error message from response
            if let errorResponse = try? JSONDecoder().decode(ClaimRewardsResponse.self, from: data),
               let errorMessage = errorResponse.error {
                throw WalletError.claimFailed(errorMessage)
            }
            throw WalletError.serverError(httpResponse.statusCode)
        }
        
        let decoder = JSONDecoder()
        return try decoder.decode(ClaimRewardsResponse.self, from: data)
    }
    
    // MARK: - Transaction History
    
    /// Fetch transaction history for a wallet address
    func fetchTransactionHistory(address: String, limit: Int = 20, offset: Int = 0) async throws -> TransactionHistoryResponse {
        let url = URL(string: "\(baseURL)/api/wallet/history?address=\(address)&limit=\(limit)&offset=\(offset)")!
        let request = authenticatedRequest(url: url)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw WalletError.invalidResponse
        }
        
        if httpResponse.statusCode == 401 {
            throw WalletError.unauthorized
        }
        
        guard httpResponse.statusCode == 200 else {
            throw WalletError.serverError(httpResponse.statusCode)
        }
        
        let decoder = JSONDecoder()
        return try decoder.decode(TransactionHistoryResponse.self, from: data)
    }
    
    // MARK: - Connect Wallet
    
    /// Register/connect a wallet address with the user's account
    func connectWallet(address: String, privyUserId: String) async throws -> ConnectWalletResponse {
        let url = URL(string: "\(baseURL)/api/wallet/connect")!
        
        let body: [String: Any] = [
            "address": address,
            "privy_user_id": privyUserId,
            "chain": LifeToken.chainName
        ]
        
        let request = try authenticatedPostRequest(url: url, body: body)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw WalletError.invalidResponse
        }
        
        if httpResponse.statusCode == 401 {
            throw WalletError.unauthorized
        }
        
        guard httpResponse.statusCode == 200 || httpResponse.statusCode == 201 else {
            throw WalletError.serverError(httpResponse.statusCode)
        }
        
        let decoder = JSONDecoder()
        return try decoder.decode(ConnectWalletResponse.self, from: data)
    }
    
    // MARK: - Disconnect Wallet
    
    /// Disconnect a wallet from the user's account
    func disconnectWallet(address: String) async throws {
        let url = URL(string: "\(baseURL)/api/wallet/disconnect")!
        
        let body: [String: Any] = ["address": address]
        
        let request = try authenticatedPostRequest(url: url, body: body)
        
        let (_, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw WalletError.invalidResponse
        }
        
        guard httpResponse.statusCode == 200 || httpResponse.statusCode == 204 else {
            throw WalletError.serverError(httpResponse.statusCode)
        }
    }
}

// MARK: - Wallet Errors
enum WalletError: Error, LocalizedError {
    case invalidResponse
    case unauthorized
    case serverError(Int)
    case claimFailed(String)
    case insufficientBalance
    case walletNotConnected
    
    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Invalid response from server"
        case .unauthorized:
            return "Authentication required. Please check your API key."
        case .serverError(let code):
            return "Server error: \(code)"
        case .claimFailed(let message):
            return "Claim failed: \(message)"
        case .insufficientBalance:
            return "Insufficient balance for transaction"
        case .walletNotConnected:
            return "Please connect your wallet first"
        }
    }
}
