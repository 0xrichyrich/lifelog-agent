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
    @Published var isLoading = false
    @Published var error: String?
    @Published var pendingNotification: XPNotification?
    
    private let session: URLSession
    private var baseURL: String
    private var apiKey: String?
    
    init(baseURL: String = "https://www.littlenudge.app", apiKey: String? = nil) {
        self.baseURL = baseURL
        self.apiKey = apiKey
        
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        self.session = URLSession(configuration: config)
    }
    
    func updateConfig(baseURL: String, apiKey: String?) {
        self.baseURL = baseURL
        self.apiKey = apiKey
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
            if let apiKey = apiKey, !apiKey.isEmpty {
                request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
            }
            
            let (data, response) = try await session.data(for: request)
            
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
            print("XP Status fetch error: \(error)")
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
            if let apiKey = apiKey, !apiKey.isEmpty {
                request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
            }
            
            let (data, response) = try await session.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw XPError.invalidResponse
            }
            
            guard httpResponse.statusCode == 200 else {
                throw XPError.serverError(httpResponse.statusCode)
            }
            
            let decoded = try JSONDecoder().decode(XPHistoryResponse.self, from: data)
            self.history = decoded.data.history
        } catch {
            print("XP History fetch error: \(error)")
        }
    }
    
    // MARK: - Fetch Leaderboard
    func fetchLeaderboard(limit: Int = 10) async {
        do {
            guard let url = URL(string: "\(baseURL)/api/xp/leaderboard?limit=\(limit)") else {
                throw XPError.invalidURL
            }
            
            var request = URLRequest(url: url)
            if let apiKey = apiKey, !apiKey.isEmpty {
                request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
            }
            
            let (data, response) = try await session.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw XPError.invalidResponse
            }
            
            guard httpResponse.statusCode == 200 else {
                throw XPError.serverError(httpResponse.statusCode)
            }
            
            let decoded = try JSONDecoder().decode(LeaderboardResponse.self, from: data)
            self.leaderboard = decoded.data.leaderboard
        } catch {
            print("Leaderboard fetch error: \(error)")
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
            if let apiKey = apiKey, !apiKey.isEmpty {
                request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
            }
            
            let body: [String: Any] = [
                "userId": userId,
                "activity": activity.rawValue
            ]
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
            
            let (data, response) = try await session.data(for: request)
            
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
            print("XP Award error: \(error)")
            return nil
        }
    }
    
    func clearNotification() {
        pendingNotification = nil
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
