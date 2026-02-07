//
//  XPService.swift
//  LifeLog
//
//  Created by Skynet on 2026-02-04.
//  Service for XP gamification API calls
//

import Foundation
import Combine

@MainActor
class XPService: ObservableObject {
    @Published var status: XPStatus?
    @Published var history: [XPTransaction] = []
    @Published var leaderboard: [LeaderboardEntry] = []
    @Published var redemptionStatus: RedemptionStatus?
    @Published var weeklyPool: WeeklyPoolStatus?
    @Published var isLoading = false
    @Published var isRedeeming = false
    @Published var error: String?
    @Published var pendingNotification: XPNotification?
    
    private var baseURL: String
    private var apiKey: String?
    
    init(baseURL: String = NudgeConstants.apiBaseURL, apiKey: String? = nil) {
        self.baseURL = baseURL
        self.apiKey = apiKey
    }
    
    func updateConfig(baseURL: String, apiKey: String?) {
        self.baseURL = baseURL
        self.apiKey = apiKey
    }
    
    /// Get a valid auth token (session token takes priority, fallback to apiKey)
    private func getAuthToken() async -> String? {
        // First try to get a valid session token from AuthService
        if let sessionToken = await AuthService.shared.getValidToken() {
            return sessionToken
        }
        // Fallback to apiKey if set
        return apiKey
    }
    
    // MARK: - Fetch XP Status
    func fetchStatus(userId: String) async {
        isLoading = true
        error = nil
        
        do {
            guard let url = URL(string: "\(baseURL)/api/xp/status?userId=\(userId)") else {
                throw XPError.invalidURL
            }
            
            var request = URLRequest(url: url)
            if let token = await getAuthToken(), !token.isEmpty {
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            }
            
            let (data, response) = try await SecureNetworking.session.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw XPError.invalidResponse
            }
            
            guard httpResponse.statusCode == 200 else {
                throw XPError.serverError(httpResponse.statusCode)
            }
            
            let decoded = try JSONDecoder().decode(XPStatusResponse.self, from: data)
            self.status = decoded.data
        } catch {
            self.error = error.localizedDescription
            AppLogger.error("XP Status fetch error", error: error)
        }
        
        isLoading = false
    }
    
    // MARK: - Fetch History
    func fetchHistory(userId: String, limit: Int = 20) async {
        do {
            guard let url = URL(string: "\(baseURL)/api/xp/history?userId=\(userId)&limit=\(limit)") else {
                throw XPError.invalidURL
            }
            
            var request = URLRequest(url: url)
            if let token = await getAuthToken(), !token.isEmpty {
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            }
            
            let (data, response) = try await SecureNetworking.session.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw XPError.invalidResponse
            }
            
            guard httpResponse.statusCode == 200 else {
                throw XPError.serverError(httpResponse.statusCode)
            }
            
            let decoded = try JSONDecoder().decode(XPHistoryResponse.self, from: data)
            self.history = decoded.data.history
        } catch {
            AppLogger.error("XP History fetch error", error: error)
        }
    }
    
    // MARK: - Fetch Leaderboard
    func fetchLeaderboard(limit: Int = 10) async {
        do {
            guard let url = URL(string: "\(baseURL)/api/xp/leaderboard?limit=\(limit)") else {
                throw XPError.invalidURL
            }
            
            var request = URLRequest(url: url)
            if let token = await getAuthToken(), !token.isEmpty {
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            }
            
            let (data, response) = try await SecureNetworking.session.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw XPError.invalidResponse
            }
            
            guard httpResponse.statusCode == 200 else {
                throw XPError.serverError(httpResponse.statusCode)
            }
            
            let decoded = try JSONDecoder().decode(LeaderboardResponse.self, from: data)
            self.leaderboard = decoded.data.leaderboard
        } catch {
            AppLogger.error("Leaderboard fetch error", error: error)
        }
    }
    
    // MARK: - Award XP (called when user completes actions)
    func awardXP(userId: String, activity: XPActivity) async -> XPNotification? {
        do {
            guard let url = URL(string: "\(baseURL)/api/xp/award") else {
                throw XPError.invalidURL
            }
            
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            
            // Use session token for authenticated POST requests
            if let token = await getAuthToken(), !token.isEmpty {
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            }
            
            let body: [String: Any] = [
                "userId": userId,
                "activity": activity.rawValue
            ]
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
            
            let (data, response) = try await SecureNetworking.session.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw XPError.invalidResponse
            }
            
            guard httpResponse.statusCode == 200 else {
                throw XPError.serverError(httpResponse.statusCode)
            }
            
            let decoded = try JSONDecoder().decode(XPAwardResponse.self, from: data)
            
            // Update local status
            if var currentStatus = self.status {
                currentStatus = XPStatus(
                    userId: currentStatus.userId,
                    totalXP: decoded.data.user.totalXP,
                    currentXP: decoded.data.user.currentXP,
                    level: decoded.data.user.level,
                    nextLevelXP: currentStatus.nextLevelXP,
                    progressToNextLevel: currentStatus.progressToNextLevel,
                    redemptionBoost: currentStatus.redemptionBoost,
                    streak: currentStatus.streak
                )
                self.status = currentStatus
            }
            
            // Create notification
            let notification = XPNotification(
                amount: decoded.data.xpAwarded,
                activity: activity,
                leveledUp: decoded.data.leveledUp,
                newLevel: decoded.data.newLevel
            )
            
            self.pendingNotification = notification
            return notification
            
        } catch {
            AppLogger.error("XP Award error", error: error)
            return nil
        }
    }
    
    func clearNotification() {
        pendingNotification = nil
    }
    
    // MARK: - Fetch Redemption Status
    func fetchRedemptionStatus(userId: String) async {
        do {
            guard let url = URL(string: "\(baseURL)/api/xp/redeem?userId=\(userId)") else {
                throw XPError.invalidURL
            }
            
            var request = URLRequest(url: url)
            if let token = await getAuthToken(), !token.isEmpty {
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            }
            
            let (data, response) = try await SecureNetworking.session.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw XPError.invalidResponse
            }
            
            guard httpResponse.statusCode == 200 else {
                throw XPError.serverError(httpResponse.statusCode)
            }
            
            let decoded = try JSONDecoder().decode(RedemptionStatusResponse.self, from: data)
            self.redemptionStatus = decoded.data
        } catch {
            AppLogger.error("Redemption status fetch error", error: error)
            self.error = error.localizedDescription
        }
    }
    
    // MARK: - Redeem XP for NUDGE
    func redeemXP(userId: String, xpAmount: Int) async -> RedemptionResult? {
        isRedeeming = true
        defer { isRedeeming = false }
        
        do {
            guard let url = URL(string: "\(baseURL)/api/xp/redeem") else {
                throw XPError.invalidURL
            }
            
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            
            // Use session token for authenticated POST requests
            // Session token is obtained after Privy login via AuthService
            if let token = await getAuthToken(), !token.isEmpty {
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            }
            
            let body: [String: Any] = [
                "userId": userId,
                "xpAmount": xpAmount
            ]
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
            
            let (data, response) = try await SecureNetworking.session.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw XPError.invalidResponse
            }
            
            guard httpResponse.statusCode == 200 else {
                throw XPError.serverError(httpResponse.statusCode)
            }
            
            let decoded = try JSONDecoder().decode(RedemptionResponse.self, from: data)
            
            if decoded.success, let result = decoded.data {
                // Update local redemption status
                if var currentStatus = self.redemptionStatus {
                    self.redemptionStatus = RedemptionStatus(
                        userId: currentStatus.userId,
                        currentXP: result.newXPBalance,
                        level: currentStatus.level,
                        streakMultiplier: currentStatus.streakMultiplier,
                        redemptionRate: currentStatus.redemptionRate,
                        dailyCap: currentStatus.dailyCap,
                        redeemedToday: currentStatus.dailyCap - result.dailyRemaining,
                        remainingToday: result.dailyRemaining
                    )
                }
                return result
            } else {
                self.error = decoded.error ?? "Redemption failed"
                return nil
            }
        } catch {
            AppLogger.error("XP Redemption error", error: error)
            self.error = error.localizedDescription
            return nil
        }
    }
    
    // MARK: - Fetch Weekly Pool Status
    func fetchWeeklyPool(userId: String) async {
        do {
            guard let url = URL(string: "\(baseURL)/api/xp/pool?userId=\(userId)") else {
                throw XPError.invalidURL
            }
            
            var request = URLRequest(url: url)
            if let token = await getAuthToken(), !token.isEmpty {
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            }
            
            let (data, response) = try await SecureNetworking.session.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw XPError.invalidResponse
            }
            
            guard httpResponse.statusCode == 200 else {
                throw XPError.serverError(httpResponse.statusCode)
            }
            
            let decoded = try JSONDecoder().decode(WeeklyPoolResponse.self, from: data)
            self.weeklyPool = decoded.data
        } catch {
            AppLogger.error("Weekly pool fetch error", error: error)
        }
    }
}

enum XPError: Error, LocalizedError {
    case invalidURL
    case invalidResponse
    case serverError(Int)
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid server response"
        case .serverError(let code):
            return "Server error: \(code)"
        }
    }
}
