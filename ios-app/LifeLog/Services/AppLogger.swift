//
//  AppLogger.swift
//  Nudge
//
//  Centralized logging utility that only logs in DEBUG builds.
//  This prevents App Store reviewers from seeing debug output.
//

import Foundation

/// Centralized logger that only outputs in DEBUG builds
enum AppLogger {
    /// Log a debug message (only visible in DEBUG builds)
    static func debug(_ message: String, file: String = #file, function: String = #function, line: Int = #line) {
        #if DEBUG
        let filename = (file as NSString).lastPathComponent
        print("[\(filename):\(line)] \(function) - \(message)")
        #endif
    }
    
    /// Log an info message (only visible in DEBUG builds)
    static func info(_ message: String) {
        #if DEBUG
        print("ℹ️ \(message)")
        #endif
    }
    
    /// Log a warning message (only visible in DEBUG builds)
    static func warning(_ message: String) {
        #if DEBUG
        print("⚠️ \(message)")
        #endif
    }
    
    /// Log an error message (only visible in DEBUG builds)
    static func error(_ message: String) {
        #if DEBUG
        print("❌ \(message)")
        #endif
    }
    
    /// Log an error with the Error object (only visible in DEBUG builds)
    static func error(_ message: String, error: Error) {
        #if DEBUG
        print("❌ \(message): \(error.localizedDescription)")
        #endif
    }
}
