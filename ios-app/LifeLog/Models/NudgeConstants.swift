//
//  NudgeConstants.swift
//  Nudge
//
//  Centralized configuration constants.
//  Moving hardcoded values here allows for easier updates.
//

import Foundation

/// Centralized configuration constants for the Nudge app
enum NudgeConstants {
    /// API base URL for the Nudge backend
    static let apiBaseURL = "https://www.littlenudge.app"
    
    /// Token contract address on Monad testnet
    /// Note: This can be updated if the contract is redeployed
    static let tokenContractAddress = "0x99cDfA46B933ea28Edf4BB620428E24C8EB63367"
    
    /// Token symbol
    static let tokenSymbol = "NUDGE"
    
    /// Token decimals
    static let tokenDecimals = 18
    
    /// Monad testnet chain ID
    static let chainId = 10143
    
    /// Chain name for display
    static let chainName = "Monad Testnet"
    
    /// RPC URL for Monad testnet
    static let rpcUrl = "https://testnet-rpc.monad.xyz/"
    
    /// Block explorer URL
    static let explorerUrl = "https://testnet.monad.xyz"
    
    /// App Group identifier for widgets
    static let appGroupId = "group.com.skynet.nudge"
    
    /// Keychain service identifier
    static let keychainService = "com.skynet.nudge"
}

// MARK: - Keychain Keys
extension NudgeConstants {
    enum KeychainKeys {
        static let apiKey = "lifelogApiKey"
        static let privyUserId = "privyUserId"
        static let walletAddress = "walletAddress"
        static let username = "nudgeUsername"
        /// Session token received from backend after Privy authentication
        static let sessionToken = "nudgeSessionToken"
        /// Session token expiry timestamp (stored as ISO8601 string)
        static let sessionTokenExpiry = "nudgeSessionTokenExpiry"
    }
}

// MARK: - UserDefaults Keys (non-sensitive data only)
extension NudgeConstants {
    enum UserDefaultsKeys {
        static let apiEndpoint = "apiEndpoint"
        static let notificationsEnabled = "notificationsEnabled"
        static let collectScreenshots = "collectScreenshots"
        static let collectAudio = "collectAudio"
        static let collectCamera = "collectCamera"
        static let walletConnected = "walletConnected"
    }
}
