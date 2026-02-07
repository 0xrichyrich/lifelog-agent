//
//  AuthService.swift
//  LifeLog
//
//  Handles authentication token management.
//  After Privy login, exchanges wallet address for a session token from the backend.
//

import Foundation

/// Error types for authentication operations
enum AuthError: Error, LocalizedError {
    case notAuthenticated
    case tokenExchangeFailed(String)
    case networkError(Error)
    case invalidResponse
    
    var errorDescription: String? {
        switch self {
        case .notAuthenticated:
            return "Please log in first"
        case .tokenExchangeFailed(let message):
            return "Authentication failed: \(message)"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .invalidResponse:
            return "Invalid response from server"
        }
    }
}

/// Manages session tokens for authenticated API requests
@MainActor
class AuthService: ObservableObject {
    /// Shared singleton instance
    static let shared = AuthService()
    
    @Published private(set) var isAuthenticated: Bool = false
    @Published private(set) var sessionToken: String?
    @Published private(set) var tokenExpiry: Date?
    
    private let baseURL = NudgeConstants.apiBaseURL
    
    private init() {
        // Load existing token from Keychain
        loadStoredToken()
    }
    
    /// Get a valid session token, refreshing if necessary
    /// Returns nil if not authenticated
    func getValidToken() async -> String? {
        // Check if we have a valid cached token
        if let token = sessionToken, let expiry = tokenExpiry, expiry > Date() {
            return token
        }
        
        // Try to refresh the token
        do {
            try await refreshToken()
            return sessionToken
        } catch {
            AppLogger.error("Failed to get valid auth token", error: error)
            return nil
        }
    }
    
    /// Exchange Privy wallet address for a session token
    func exchangeForSessionToken(walletAddress: String) async throws {
        guard let url = URL(string: "\(baseURL)/api/auth/token") else {
            throw AuthError.invalidResponse
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: Any] = [
            "walletAddress": walletAddress
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        do {
            let (data, response) = try await SecureNetworking.session.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw AuthError.invalidResponse
            }
            
            guard httpResponse.statusCode == 200 else {
                // Try to parse error message
                if let errorJson = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let errorMessage = errorJson["error"] as? String {
                    throw AuthError.tokenExchangeFailed(errorMessage)
                }
                throw AuthError.tokenExchangeFailed("Server returned \(httpResponse.statusCode)")
            }
            
            // Parse token response
            guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let token = json["token"] as? String,
                  let expiresIn = json["expiresIn"] as? Int else {
                throw AuthError.invalidResponse
            }
            
            // Calculate expiry time
            let expiry = Date().addingTimeInterval(TimeInterval(expiresIn))
            
            // Store securely
            storeToken(token, expiry: expiry)
            
            // Update state
            self.sessionToken = token
            self.tokenExpiry = expiry
            self.isAuthenticated = true
            
            AppLogger.debug("Session token exchanged, expires in \(expiresIn)s")
            
        } catch let error as AuthError {
            throw error
        } catch {
            throw AuthError.networkError(error)
        }
    }
    
    /// Refresh the session token using the stored wallet address
    func refreshToken() async throws {
        guard let walletAddress = KeychainHelper.load(key: NudgeConstants.KeychainKeys.walletAddress) else {
            throw AuthError.notAuthenticated
        }
        
        try await exchangeForSessionToken(walletAddress: walletAddress)
    }
    
    /// Clear authentication state (called on logout)
    func clearAuth() {
        sessionToken = nil
        tokenExpiry = nil
        isAuthenticated = false
        
        KeychainHelper.delete(key: NudgeConstants.KeychainKeys.sessionToken)
        KeychainHelper.delete(key: NudgeConstants.KeychainKeys.sessionTokenExpiry)
    }
    
    // MARK: - Private Helpers
    
    private func loadStoredToken() {
        guard let token = KeychainHelper.load(key: NudgeConstants.KeychainKeys.sessionToken),
              let expiryString = KeychainHelper.load(key: NudgeConstants.KeychainKeys.sessionTokenExpiry) else {
            return
        }
        
        let formatter = ISO8601DateFormatter()
        guard let expiry = formatter.date(from: expiryString), expiry > Date() else {
            // Token expired, clear it
            clearAuth()
            return
        }
        
        self.sessionToken = token
        self.tokenExpiry = expiry
        self.isAuthenticated = true
    }
    
    private func storeToken(_ token: String, expiry: Date) {
        KeychainHelper.save(key: NudgeConstants.KeychainKeys.sessionToken, value: token)
        
        let formatter = ISO8601DateFormatter()
        KeychainHelper.save(key: NudgeConstants.KeychainKeys.sessionTokenExpiry, value: formatter.string(from: expiry))
    }
}
