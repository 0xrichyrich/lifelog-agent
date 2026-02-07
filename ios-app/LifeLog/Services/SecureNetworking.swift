//
//  SecureNetworking.swift
//  LifeLog
//
//  Centralized secure networking with certificate validation.
//  All services should use this shared session instead of creating their own.
//

import Foundation

/// Shared secure URLSession with certificate validation for all API calls
enum SecureNetworking {
    /// Shared URLSession with certificate validation delegate
    static let session: URLSession = {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        // Enforce TLS 1.2+ for security
        config.tlsMinimumSupportedProtocolVersion = .TLSv12
        
        return URLSession(
            configuration: config,
            delegate: APISessionDelegate(),
            delegateQueue: nil
        )
    }()
}
