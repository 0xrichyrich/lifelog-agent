//
//  APIClient.swift
//  LifeLog
//
//  Created by Joshua Rich on 2026-02-02.
//  Security-hardened version with API key authentication
//

import Foundation

actor APIClient {
    private let session: URLSession
    private var baseURL: String
    private var apiKey: String?
    
    init(baseURL: String = "https://www.littlenudge.app", apiKey: String? = nil) {
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
    
    /// Creates an authenticated request with API key header
    private func authenticatedRequest(url: URL) -> URLRequest {
        var request = URLRequest(url: url)
        if let apiKey = apiKey, !apiKey.isEmpty {
            request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        }
        return request
    }
    
    /// Creates an authenticated POST request
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
    
    // MARK: - Activities
    func fetchActivities(for date: Date = Date()) async throws -> [Activity] {
        let dateString = formatDate(date)
        let url = URL(string: "\(baseURL)/api/activities?date=\(dateString)")!
        let request = authenticatedRequest(url: url)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        if httpResponse.statusCode == 401 {
            throw APIError.unauthorized
        }
        
        guard httpResponse.statusCode == 200 else {
            throw APIError.serverError(httpResponse.statusCode)
        }
        
        let decoder = JSONDecoder()
        let activitiesResponse = try decoder.decode(ActivitiesResponse.self, from: data)
        return activitiesResponse.activities
    }
    
    // MARK: - Goals
    func fetchGoals() async throws -> [Goal] {
        let url = URL(string: "\(baseURL)/api/goals")!
        let request = authenticatedRequest(url: url)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        if httpResponse.statusCode == 401 {
            throw APIError.unauthorized
        }
        
        guard httpResponse.statusCode == 200 else {
            throw APIError.serverError(httpResponse.statusCode)
        }
        
        let decoder = JSONDecoder()
        let goalsResponse = try decoder.decode(GoalsResponse.self, from: data)
        return goalsResponse.goals
    }
    
    // MARK: - Check-ins
    func fetchCheckIns(limit: Int = 20) async throws -> [CheckIn] {
        let url = URL(string: "\(baseURL)/api/checkins?limit=\(limit)")!
        let request = authenticatedRequest(url: url)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        if httpResponse.statusCode == 401 {
            throw APIError.unauthorized
        }
        
        guard httpResponse.statusCode == 200 else {
            throw APIError.serverError(httpResponse.statusCode)
        }
        
        let decoder = JSONDecoder()
        let checkInsResponse = try decoder.decode(CheckInsResponse.self, from: data)
        return checkInsResponse.checkins
    }
    
    func createCheckIn(message: String, activityType: String = "break") async throws -> CheckIn {
        let url = URL(string: "\(baseURL)/api/checkins")!
        
        // Validate message length client-side
        let trimmedMessage = message.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedMessage.isEmpty else {
            throw APIError.validationError("Message cannot be empty")
        }
        guard trimmedMessage.count <= 5000 else {
            throw APIError.validationError("Message too long (max 5000 characters)")
        }
        
        let body: [String: Any] = [
            "message": trimmedMessage,
            "timestamp": ISO8601DateFormatter().string(from: Date()),
            "activityType": activityType
        ]
        let request = try authenticatedPostRequest(url: url, body: body)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        if httpResponse.statusCode == 401 {
            throw APIError.unauthorized
        }
        
        guard httpResponse.statusCode == 200 else {
            throw APIError.serverError(httpResponse.statusCode)
        }
        
        let decoder = JSONDecoder()
        let createResponse = try decoder.decode(CreateCheckInResponse.self, from: data)
        
        return CheckIn(
            id: createResponse.id,
            timestamp: createResponse.timestamp,
            message: createResponse.message,
            source: createResponse.source
        )
    }
    
    // MARK: - Whisper Transcription (via backend proxy)
    /// Transcribe audio via the backend proxy endpoint
    /// This avoids exposing OpenAI API keys in the iOS app
    func transcribeAudio(fileURL: URL) async throws -> String {
        let transcribeURL = URL(string: "\(baseURL)/api/transcribe")!
        var request = URLRequest(url: transcribeURL)
        request.httpMethod = "POST"
        if let apiKey = apiKey, !apiKey.isEmpty {
            request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        }
        
        let boundary = UUID().uuidString
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        
        var body = Data()
        
        // Add audio file
        let audioData = try Data(contentsOf: fileURL)
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"audio.m4a\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: audio/m4a\r\n\r\n".data(using: .utf8)!)
        body.append(audioData)
        body.append("\r\n".data(using: .utf8)!)
        
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        
        request.httpBody = body
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        if httpResponse.statusCode == 401 {
            throw APIError.unauthorized
        }
        
        guard httpResponse.statusCode == 200 else {
            throw APIError.transcriptionFailed
        }
        
        struct TranscriptionResponse: Codable {
            let text: String
        }
        
        let transcription = try JSONDecoder().decode(TranscriptionResponse.self, from: data)
        return transcription.text
    }
    
    // MARK: - Helpers
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }
}

enum APIError: Error, LocalizedError {
    case invalidResponse
    case networkError(Error)
    case decodingError(Error)
    case transcriptionFailed
    case serverError(Int)
    case unauthorized
    case validationError(String)
    case rateLimited(retryAfter: Int)
    
    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Invalid response from server"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .decodingError(let error):
            return "Failed to decode response: \(error.localizedDescription)"
        case .transcriptionFailed:
            return "Failed to transcribe audio"
        case .serverError(let code):
            return "Server error: \(code)"
        case .unauthorized:
            return "Authentication required. Please check your API key in Settings."
        case .validationError(let message):
            return "Validation error: \(message)"
        case .rateLimited(let retryAfter):
            return "Rate limited. Please try again in \(retryAfter) seconds."
        }
    }
}
