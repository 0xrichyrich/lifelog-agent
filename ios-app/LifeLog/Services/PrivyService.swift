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
    
    private var privy: Privy?
    
    init() {
        initializePrivy()
    }
    
    // MARK: - Initialization
    
    private func initializePrivy() {
        do {
            let config = PrivyConfig(
                appId: appId,
                loggingConfig: .init(logLevel: .info)
            )
            privy = PrivySdk.initialize(config: config)
            isInitialized = true
            
            // Check if already authenticated
            Task {
                await checkAuthStatus()
            }
        } catch {
            self.error = "Failed to initialize Privy: \(error.localizedDescription)"
            print("Privy initialization error: \(error)")
        }
    }
    
    private func checkAuthStatus() async {
        guard let privy = privy else { return }
        
        do {
            let authState = try await privy.auth.getAuthState()
            if let user = authState?.user {
                self.userId = user.id
                self.isAuthenticated = true
                
                // Get wallet address
                if let address = await privy.embeddedWallet.getAddress() {
                    self.walletAddress = address
                    UserDefaults.standard.set(address, forKey: "walletAddress")
                }
            }
        } catch {
            print("Error checking auth status: \(error)")
        }
    }
    
    // MARK: - Authentication
    
    /// Authenticate with email (Privy embedded wallet)
    func loginWithEmail(_ email: String) async throws {
        guard let privy = privy else {
            throw PrivyError.notInitialized
        }
        
        isLoading = true
        error = nil
        
        defer { isLoading = false }
        
        do {
            // Send OTP code to email
            try await privy.email.sendCode(to: email)
            // OTP verification will be handled separately via verifyEmailCode
        } catch {
            self.error = error.localizedDescription
            throw error
        }
    }
    
    /// Verify OTP code for email login
    func verifyEmailCode(_ code: String) async throws {
        guard let privy = privy else {
            throw PrivyError.notInitialized
        }
        
        isLoading = true
        error = nil
        
        defer { isLoading = false }
        
        do {
            let authState = try await privy.email.verifyCode(code)
            if let user = authState?.user {
                self.userId = user.id
                self.isAuthenticated = true
                
                // Create embedded wallet if user doesn't have one
                let address = try await privy.embeddedWallet.getAddress() 
                    ?? (try await privy.embeddedWallet.create())?.address
                
                self.walletAddress = address
                
                // Save credentials
                if let userId = userId {
                    KeychainHelper.save(key: "privyUserId", value: userId)
                }
                if let address = address {
                    UserDefaults.standard.set(address, forKey: "walletAddress")
                }
                UserDefaults.standard.set(true, forKey: "walletConnected")
            }
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
            let authState = try await privy.apple.login()
            if let user = authState?.user {
                self.userId = user.id
                self.isAuthenticated = true
                
                // Get or create embedded wallet
                let address = try await privy.embeddedWallet.getAddress() 
                    ?? (try await privy.embeddedWallet.create())?.address
                
                self.walletAddress = address
                
                // Save credentials
                if let userId = userId {
                    KeychainHelper.save(key: "privyUserId", value: userId)
                }
                if let address = address {
                    UserDefaults.standard.set(address, forKey: "walletAddress")
                }
                UserDefaults.standard.set(true, forKey: "walletConnected")
            }
        } catch {
            self.error = error.localizedDescription
            throw error
        }
    }
    
    /// Log out and disconnect wallet
    func logout() async {
        guard let privy = privy else { return }
        
        isLoading = true
        
        defer { isLoading = false }
        
        do {
            try await privy.logout()
        } catch {
            print("Logout error: \(error)")
        }
        
        // Clear local state
        userId = nil
        walletAddress = nil
        isAuthenticated = false
        
        // Clear stored credentials
        KeychainHelper.delete(key: "privyUserId")
        UserDefaults.standard.removeObject(forKey: "walletAddress")
        UserDefaults.standard.removeObject(forKey: "walletConnected")
    }
    
    // MARK: - Wallet Operations
    
    /// Get the embedded wallet address
    func getWalletAddress() async -> String? {
        guard let privy = privy else { return nil }
        
        do {
            return try await privy.embeddedWallet.getAddress()
        } catch {
            print("Error getting wallet address: \(error)")
            return walletAddress
        }
    }
    
    /// Sign a message with the embedded wallet
    func signMessage(_ message: String) async throws -> String {
        guard let privy = privy else {
            throw PrivyError.notInitialized
        }
        
        guard isAuthenticated else {
            throw PrivyError.notAuthenticated
        }
        
        do {
            return try await privy.embeddedWallet.signMessage(message)
        } catch {
            throw PrivyError.signatureFailed
        }
    }
    
    /// Sign a transaction
    func signTransaction(_ transaction: [String: Any]) async throws -> String {
        guard let privy = privy else {
            throw PrivyError.notInitialized
        }
        
        guard isAuthenticated else {
            throw PrivyError.notAuthenticated
        }
        
        do {
            return try await privy.embeddedWallet.signTransaction(transaction)
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
