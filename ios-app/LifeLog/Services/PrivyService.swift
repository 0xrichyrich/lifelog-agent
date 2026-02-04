//
//  PrivyService.swift
//  LifeLog
//
//  Privy SDK integration for wallet management
//  Created for Moltiverse Hackathon
//

import Foundation
import SwiftUI
import PrivySDK

/// Service for managing Privy embedded wallet integration
@MainActor
class PrivyService: ObservableObject {
    @Published var isInitialized: Bool = false
    @Published var isAuthenticated: Bool = false
    @Published var isLoading: Bool = false
    @Published var error: String?
    @Published var walletAddress: String?
    @Published var userId: String?
    
    // Privy configuration
    private let appId = "cml88575000qmjr0bt3tivdrr"
    // App Client ID from Privy Dashboard (Settings -> API Keys -> App client ID)
    private let appClientId = "client-WY6VqnR715TBi3TYk8mmGfsVs6WTzKJDGmaWHsr3sHU3G"
    
    private var privy: (any Privy)?
    private var currentUser: (any PrivyUser)?
    
    // Store email for verification flow
    private var pendingEmail: String?
    
    init() {
        initializePrivy()
    }
    
    // MARK: - Initialization
    
    private func initializePrivy() {
        let config = PrivyConfig(
            appId: appId,
            appClientId: appClientId,
            loggingConfig: PrivyLoggingConfig(logLevel: .info)
        )
        privy = PrivySdk.initialize(config: config)
        isInitialized = true
        
        // Check if already authenticated
        Task {
            await checkAuthStatus()
        }
    }
    
    private func checkAuthStatus() async {
        guard let privy = privy else { return }
        
        let authState = await privy.getAuthState()
        
        switch authState {
        case .authenticated(let user):
            self.currentUser = user
            self.userId = user.id
            self.isAuthenticated = true
            
            // Get wallet address from first embedded Ethereum wallet
            if let wallet = user.embeddedEthereumWallets.first {
                self.walletAddress = wallet.address
                UserDefaults.standard.set(wallet.address, forKey: "walletAddress")
            }
            
        case .unauthenticated, .notReady, .authenticatedUnverified:
            self.isAuthenticated = false
            self.currentUser = nil
            
        @unknown default:
            self.isAuthenticated = false
        }
    }
    
    // MARK: - Authentication
    
    /// Authenticate with email (Privy embedded wallet) - Step 1: Send OTP
    func loginWithEmail(_ email: String) async throws {
        guard let privy = privy else {
            throw PrivyError.notInitialized
        }
        
        isLoading = true
        error = nil
        pendingEmail = email
        
        defer { isLoading = false }
        
        do {
            // Send OTP code to email
            try await privy.email.sendCode(to: email)
            // OTP verification will be handled via verifyEmailCode
        } catch {
            self.error = error.localizedDescription
            throw error
        }
    }
    
    /// Verify OTP code for email login - Step 2: Verify and authenticate
    func verifyEmailCode(_ code: String) async throws {
        guard let privy = privy else {
            throw PrivyError.notInitialized
        }
        
        guard let email = pendingEmail else {
            throw PrivyError.unknown("No pending email verification. Call loginWithEmail first.")
        }
        
        isLoading = true
        error = nil
        
        defer { 
            isLoading = false 
            pendingEmail = nil
        }
        
        do {
            // Verify code and login
            let user = try await privy.email.loginWithCode(code, sentTo: email)
            
            self.currentUser = user
            self.userId = user.id
            self.isAuthenticated = true
            
            // Get or create embedded wallet
            var wallet = user.embeddedEthereumWallets.first
            if wallet == nil {
                wallet = try await user.createEthereumWallet()
            }
            
            if let address = wallet?.address {
                self.walletAddress = address
                UserDefaults.standard.set(address, forKey: "walletAddress")
            }
            
            // Save credentials
            if let userId = userId {
                KeychainHelper.save(key: "privyUserId", value: userId)
            }
            UserDefaults.standard.set(true, forKey: "walletConnected")
            
        } catch {
            self.error = error.localizedDescription
            throw error
        }
    }
    
    /// Sign in with Apple
    func loginWithApple() async throws {
        guard let privy = privy else {
            throw PrivyError.notInitialized
        }
        
        isLoading = true
        error = nil
        
        defer { isLoading = false }
        
        do {
            // Use OAuth provider for Apple Sign In
            let user = try await privy.oAuth.login(with: .apple)
            
            self.currentUser = user
            self.userId = user.id
            self.isAuthenticated = true
            
            // Get or create embedded wallet
            var wallet = user.embeddedEthereumWallets.first
            if wallet == nil {
                wallet = try await user.createEthereumWallet()
            }
            
            if let address = wallet?.address {
                self.walletAddress = address
                UserDefaults.standard.set(address, forKey: "walletAddress")
            }
            
            // Save credentials
            if let userId = userId {
                KeychainHelper.save(key: "privyUserId", value: userId)
            }
            UserDefaults.standard.set(true, forKey: "walletConnected")
            
        } catch {
            self.error = error.localizedDescription
            throw error
        }
    }
    
    /// Log out and disconnect wallet
    func logout() async {
        isLoading = true
        
        defer { isLoading = false }
        
        // Logout is called on the user, not the privy instance
        if let user = currentUser {
            await user.logout()
        }
        
        // Clear local state
        currentUser = nil
        userId = nil
        walletAddress = nil
        isAuthenticated = false
        
        // Clear stored credentials
        KeychainHelper.delete(key: "privyUserId")
        UserDefaults.standard.removeObject(forKey: "walletAddress")
        UserDefaults.standard.removeObject(forKey: "walletConnected")
    }
    
    /// Handle OAuth callback URL from Privy
    func handleCallback(url: URL) async {
        // Privy SDK handles OAuth callbacks automatically
        // Just re-check auth status after callback
        await checkAuthStatus()
    }
    
    // MARK: - Wallet Operations
    
    /// Get the embedded wallet address
    func getWalletAddress() async -> String? {
        guard let user = currentUser else { return walletAddress }
        
        if let wallet = user.embeddedEthereumWallets.first {
            return wallet.address
        }
        return walletAddress
    }
    
    /// Sign a message with the embedded wallet
    func signMessage(_ message: String) async throws -> String {
        guard let user = currentUser else {
            throw PrivyError.notInitialized
        }
        
        guard isAuthenticated else {
            throw PrivyError.notAuthenticated
        }
        
        guard let wallet = user.embeddedEthereumWallets.first else {
            throw PrivyError.walletCreationFailed
        }
        
        do {
            // Use the wallet provider with personalSign RPC request
            let request = EthereumRpcRequest.personalSign(message: message, address: wallet.address)
            return try await wallet.provider.request(request)
        } catch {
            throw PrivyError.signatureFailed
        }
    }
    
    /// Sign a transaction
    func signTransaction(_ transaction: [String: Any]) async throws -> String {
        guard let user = currentUser else {
            throw PrivyError.notInitialized
        }
        
        guard isAuthenticated else {
            throw PrivyError.notAuthenticated
        }
        
        guard let wallet = user.embeddedEthereumWallets.first else {
            throw PrivyError.walletCreationFailed
        }
        
        do {
            // Build unsigned transaction from dictionary
            let unsignedTx = EthereumRpcRequest.UnsignedEthTransaction(
                from: transaction["from"] as? String,
                to: transaction["to"] as? String,
                data: transaction["data"] as? String,
                value: (transaction["value"] as? Int).map { .int($0) }
            )
            
            let request = try EthereumRpcRequest.ethSignTransaction(transaction: unsignedTx)
            return try await wallet.provider.request(request)
        } catch {
            throw PrivyError.signatureFailed
        }
    }
}

// MARK: - Errors
enum PrivyError: LocalizedError {
    case notInitialized
    case notAuthenticated
    case walletCreationFailed
    case signatureFailed
    case unknown(String)
    
    var errorDescription: String? {
        switch self {
        case .notInitialized:
            return "Privy SDK not initialized"
        case .notAuthenticated:
            return "Please connect your wallet first"
        case .walletCreationFailed:
            return "Failed to create embedded wallet"
        case .signatureFailed:
            return "Failed to sign transaction"
        case .unknown(let message):
            return message
        }
    }
}

// MARK: - Preview Helper
extension PrivyService {
    static var preview: PrivyService {
        let service = PrivyService()
        service.isAuthenticated = true
        service.walletAddress = "0x1234567890abcdef1234567890abcdef12345678"
        service.userId = "preview_user"
        return service
    }
}
