//
//  AppState.swift
//  Nudge
//
//  Created by Joshua Rich on 2026-02-02.
//  Updated with secure API key storage via Keychain
//

import SwiftUI
import Security

@Observable
final class AppState {
    // Settings
    var apiEndpoint: String {
        didSet {
            UserDefaults.standard.set(apiEndpoint, forKey: "apiEndpoint")
        }
    }
    
    /// API key stored securely in Keychain
    var apiKey: String {
        didSet {
            KeychainHelper.save(key: "lifelogApiKey", value: apiKey)
        }
    }
    
    var notificationsEnabled: Bool {
        didSet {
            UserDefaults.standard.set(notificationsEnabled, forKey: "notificationsEnabled")
        }
    }
    
    var collectScreenshots: Bool {
        didSet {
            UserDefaults.standard.set(collectScreenshots, forKey: "collectScreenshots")
        }
    }
    
    var collectAudio: Bool {
        didSet {
            UserDefaults.standard.set(collectAudio, forKey: "collectAudio")
        }
    }
    
    var collectCamera: Bool {
        didSet {
            UserDefaults.standard.set(collectCamera, forKey: "collectCamera")
        }
    }
    
    // Cache
    var activities: [Activity] = []
    var goals: [Goal] = []
    var checkIns: [CheckIn] = []
    var isLoading = false
    var errorMessage: String?
    
    init() {
        self.apiEndpoint = "https://dashboard-flame-five-76.vercel.app"
        self.apiKey = KeychainHelper.load(key: "lifelogApiKey") ?? ""
        self.notificationsEnabled = UserDefaults.standard.bool(forKey: "notificationsEnabled")
        self.collectScreenshots = UserDefaults.standard.object(forKey: "collectScreenshots") as? Bool ?? true
        self.collectAudio = UserDefaults.standard.object(forKey: "collectAudio") as? Bool ?? true
        self.collectCamera = UserDefaults.standard.bool(forKey: "collectCamera")
    }
}

// MARK: - App Group for Widgets
extension AppState {
    static let appGroup = "group.com.skynet.nudge"
    
    static var sharedDefaults: UserDefaults? {
        UserDefaults(suiteName: appGroup)
    }
    
    func syncToSharedDefaults() {
        Self.sharedDefaults?.set(apiEndpoint, forKey: "apiEndpoint")
        Self.sharedDefaults?.set(goals.count, forKey: "goalsCount")
        Self.sharedDefaults?.set(goals.filter { $0.current >= $0.target }.count, forKey: "goalsCompleted")
        
        // Calculate max streak
        let maxStreak = goals.map(\.streak).max() ?? 0
        Self.sharedDefaults?.set(maxStreak, forKey: "maxStreak")
        
        // Calculate total focus minutes today
        let focusMinutes = activities
            .filter { $0.category == .focus }
            .reduce(0) { $0 + ($1.duration ?? 0) } / 60
        Self.sharedDefaults?.set(focusMinutes, forKey: "focusMinutes")
    }
}

// MARK: - Keychain Helper for Secure Storage
/// Securely stores sensitive data in iOS Keychain
enum KeychainHelper {
    private static let service = "com.skynet.nudge"
    
    static func save(key: String, value: String) {
        guard let data = value.data(using: .utf8) else { return }
        
        // Delete existing item first
        let deleteQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]
        SecItemDelete(deleteQuery as CFDictionary)
        
        // Add new item
        let addQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock,
        ]
        
        let status = SecItemAdd(addQuery as CFDictionary, nil)
        if status != errSecSuccess && status != errSecDuplicateItem {
            print("Keychain save error: \(status)")
        }
    }
    
    static func load(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        guard status == errSecSuccess,
              let data = result as? Data,
              let value = String(data: data, encoding: .utf8) else {
            return nil
        }
        
        return value
    }
    
    static func delete(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]
        SecItemDelete(query as CFDictionary)
    }
}
