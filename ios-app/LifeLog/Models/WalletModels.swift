//
//  WalletModels.swift
//  LifeLog
//
//  Created for Moltiverse Hackathon - Privy Wallet Integration
//

import Foundation
import SwiftUI

// MARK: - Wallet State
@Observable
final class WalletState {
    var isConnected: Bool = false
    var walletAddress: String?
    var lifeTokenBalance: String = "0"
    var pendingRewards: String = "0"
    var transactions: [WalletTransaction] = []
    var isLoading: Bool = false
    var error: String?
    
    // Privy user state
    var privyUserId: String?
    var embeddedWalletAddress: String?
    
    init() {
        // Load connection state from UserDefaults (non-sensitive flag)
        self.isConnected = UserDefaults.standard.bool(forKey: NudgeConstants.UserDefaultsKeys.walletConnected)
        // Load wallet address from Keychain (sensitive data)
        self.walletAddress = KeychainHelper.load(key: NudgeConstants.KeychainKeys.walletAddress)
        self.privyUserId = KeychainHelper.load(key: NudgeConstants.KeychainKeys.privyUserId)
    }
    
    func save() {
        // Connection state is non-sensitive, can use UserDefaults
        UserDefaults.standard.set(isConnected, forKey: NudgeConstants.UserDefaultsKeys.walletConnected)
        // Wallet address is sensitive, use Keychain
        if let address = walletAddress {
            KeychainHelper.save(key: NudgeConstants.KeychainKeys.walletAddress, value: address)
        }
        if let userId = privyUserId {
            KeychainHelper.save(key: NudgeConstants.KeychainKeys.privyUserId, value: userId)
        }
    }
    
    func clear() {
        isConnected = false
        walletAddress = nil
        privyUserId = nil
        embeddedWalletAddress = nil
        lifeTokenBalance = "0"
        pendingRewards = "0"
        transactions = []
        
        UserDefaults.standard.removeObject(forKey: NudgeConstants.UserDefaultsKeys.walletConnected)
        KeychainHelper.delete(key: NudgeConstants.KeychainKeys.walletAddress)
        KeychainHelper.delete(key: NudgeConstants.KeychainKeys.privyUserId)
    }
    
    var shortAddress: String {
        guard let address = walletAddress, address.count > 10 else {
            return walletAddress ?? ""
        }
        let prefix = String(address.prefix(6))
        let suffix = String(address.suffix(4))
        return "\(prefix)...\(suffix)"
    }
}

// MARK: - Transaction Models
struct WalletTransaction: Codable, Identifiable {
    let id: String
    let type: TransactionType
    let amount: String
    let timestamp: String
    let status: TransactionStatus
    let txHash: String?
    let description: String?
    
    enum CodingKeys: String, CodingKey {
        case id, type, amount, timestamp, status
        case txHash = "tx_hash"
        case description
    }
    
    var formattedDate: String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        
        guard let date = formatter.date(from: timestamp) ?? ISO8601DateFormatter().date(from: timestamp) else {
            return timestamp
        }
        
        let displayFormatter = DateFormatter()
        displayFormatter.dateStyle = .medium
        displayFormatter.timeStyle = .short
        return displayFormatter.string(from: date)
    }
    
    var statusColor: Color {
        switch status {
        case .completed: return .success
        case .pending: return .warning
        case .failed: return .danger
        }
    }
    
    var typeIcon: String {
        switch type {
        case .claim: return "arrow.down.circle.fill"
        case .reward: return "gift.fill"
        case .streak: return "flame.fill"
        case .checkin: return "checkmark.circle.fill"
        }
    }
}

enum TransactionType: String, Codable {
    case claim
    case reward
    case streak
    case checkin
}

enum TransactionStatus: String, Codable {
    case pending
    case completed
    case failed
}

// MARK: - API Responses
struct WalletBalanceResponse: Codable {
    let address: String
    let balance: String
    let pendingRewards: String
    let tokenSymbol: String
    let tokenDecimals: Int
    let error: String?
    
    enum CodingKeys: String, CodingKey {
        case address, balance
        case pendingRewards = "pending_rewards"
        case tokenSymbol = "token_symbol"
        case tokenDecimals = "token_decimals"
        case error
    }
}

struct ClaimRewardsResponse: Codable {
    let success: Bool
    let transactionId: String?
    let txHash: String?
    let amount: String?
    let message: String?
    let error: String?
    
    enum CodingKeys: String, CodingKey {
        case success
        case transactionId = "transaction_id"
        case txHash = "tx_hash"
        case amount, message, error
    }
}

struct TransactionHistoryResponse: Codable {
    let transactions: [WalletTransaction]
    let count: Int
    let error: String?
}

struct ConnectWalletResponse: Codable {
    let success: Bool
    let userId: String?
    let address: String?
    let error: String?
    
    enum CodingKeys: String, CodingKey {
        case success
        case userId = "user_id"
        case address
        case error
    }
}

// MARK: - Token Constants
/// Token constants sourced from centralized NudgeConstants
enum NudgeToken {
    // Monad testnet - deployed contract (centralized in NudgeConstants)
    static var contractAddress: String { NudgeConstants.tokenContractAddress }
    static var symbol: String { NudgeConstants.tokenSymbol }
    static var decimals: Int { NudgeConstants.tokenDecimals }
    static var chainId: Int { NudgeConstants.chainId }
    static var chainName: String { NudgeConstants.chainName }
    static var rpcUrl: String { NudgeConstants.rpcUrl }
    static var explorerUrl: String { NudgeConstants.explorerUrl }
}

// Keep alias for backwards compatibility
typealias LifeToken = NudgeToken
