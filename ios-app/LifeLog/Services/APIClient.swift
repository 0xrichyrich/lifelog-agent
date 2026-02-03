//
//  APIClient.swift
//  LifeLog
//
//  Created by Joshua Rich on 2026-02-02.
//

import Foundation

actor APIClient {
    private let session: URLSession
    private var baseURL: String
    
    init(baseURL: String = "http://100.115.31.5:3000") {
        self.baseURL = baseURL
        
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        self.session = URLSession(configuration: config)
    }
    
    func updateBaseURL(_ url: String) {
        self.baseURL = url
    }
    
    // MARK: - Activities
    func fetchActivities(for date: Date = Date()) async throws -> [Activity] {
        let dateString = formatDate(date)
        let url = URL(string: "\(baseURL)/api/activities?date=\(dateString)")!
        
        let (data, response) = try await session.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw APIError.invalidResponse
        }
        
        let decoder = JSONDecoder()
        let activitiesResponse = try decoder.decode(ActivitiesResponse.self, from: data)
        return activitiesResponse.activities
    }
    
    // MARK: - Goals
    func fetchGoals() async throws -> [Goal] {
        let url = URL(string: "\(baseURL)/api/goals")!
        
        let (data, response) = try await session.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw APIError.invalidResponse
        }
        
        let decoder = JSONDecoder()
        let goalsResponse = try decoder.decode(GoalsResponse.self, from: data)
        return goalsResponse.goals
    }
    
    // MARK: - Check-ins
    func fetchCheckIns(limit: Int = 20) async throws -> [CheckIn] {
        let url = URL(string: "\(baseURL)/api/checkins?limit=\(limit)")!
        
        let (data, response) = try await session.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw APIError.invalidResponse
        }
        
        let decoder = JSONDecoder()
        let checkInsResponse = try decoder.decode(CheckInsResponse.self, from: data)
        return checkInsResponse.checkins
    }
    
    func createCheckIn(message: String) async throws -> CheckIn {
        let url = URL(string: "\(baseURL)/api/checkins")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: Any] = [
            "message": message,
            "timestamp": ISO8601DateFormatter().string(from: Date())
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw APIError.invalidResponse
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
    
    // MARK: - Whisper Transcription
    func transcribeAudio(fileURL: URL, whisperAPIKey: String) async throws -> String {
        let whisperURL = URL(string: "https://api.openai.com/v1/audio/transcriptions")!
        var request = URLRequest(url: whisperURL)
        request.httpMethod = "POST"
        request.setValue("Bearer \(whisperAPIKey)", forHTTPHeaderField: "Authorization")
        
        let boundary = UUID().uuidString
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        
        var body = Data()
        
        // Add model field
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"model\"\r\n\r\n".data(using: .utf8)!)
        body.append("whisper-1\r\n".data(using: .utf8)!)
        
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
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
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
        }
    }
}
