//
//  XPProgressView.swift
//  LifeLog
//
//  Created by Skynet on 2026-02-04.
//  XP progress section for the profile/settings tab
//

import SwiftUI

struct XPProgressView: View {
    let status: XPStatus?
    let isLoading: Bool
    var onTapLeaderboard: (() -> Void)? = nil
    
    var body: some View {
        VStack(spacing: 16) {
            if isLoading {
                loadingState
            } else if let status = status {
                // Level and XP Header
                HStack(alignment: .top) {
                    levelBadge(level: status.level)
                    
                    Spacer()
                    
                    VStack(alignment: .trailing, spacing: 4) {
                        Text("\(status.totalXP) XP")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundStyle(Color.textPrimary)
                        
                        Text("Lifetime earned")
                            .font(.caption)
                            .foregroundStyle(Color.textSecondary)
                    }
                }
                
                // Progress Bar
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("Level \(status.level)")
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundStyle(Color.textSecondary)
                        
                        Spacer()
                        
                        Text("Level \(status.level + 1)")
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundStyle(Color.textSecondary)
                    }
                    
                    GeometryReader { geometry in
                        ZStack(alignment: .leading) {
                            // Background track
                            RoundedRectangle(cornerRadius: 6)
                                .fill(Color.mintLight)
                                .frame(height: 12)
                            
                            // Progress fill
                            RoundedRectangle(cornerRadius: 6)
                                .fill(
                                    LinearGradient(
                                        colors: [Color.brandAccent, Color.success],
                                        startPoint: .leading,
                                        endPoint: .trailing
                                    )
                                )
                                .frame(width: geometry.size.width * status.progressFraction, height: 12)
                        }
                    }
                    .frame(height: 12)
                    
                    HStack {
                        Text("\(status.progressToNextLevel)%")
                            .font(.caption2)
                            .fontWeight(.semibold)
                            .foregroundStyle(Color.brandInteractive)
                        
                        Spacer()
                        
                        Text("\(status.xpToNextLevel) XP to go")
                            .font(.caption2)
                            .foregroundStyle(Color.textSecondary)
                    }
                }
                
                Divider()
                    .padding(.vertical, 4)
                
                // Stats Row
                HStack(spacing: 0) {
                    statItem(
                        icon: "flame.fill",
                        value: "\(status.streak)",
                        label: "Day Streak",
                        color: .warning
                    )
                    
                    Divider()
                        .frame(height: 40)
                    
                    statItem(
                        icon: "arrow.up.circle.fill",
                        value: "\(status.redemptionBoost)%",
                        label: "Boost",
                        color: .success
                    )
                    
                    Divider()
                        .frame(height: 40)
                    
                    statItem(
                        icon: "bitcoinsign.circle.fill",
                        value: "\(status.currentXP)",
                        label: "Redeemable",
                        color: .brandInteractive
                    )
                }
                
                // Leaderboard button
                if let onTapLeaderboard = onTapLeaderboard {
                    Button(action: onTapLeaderboard) {
                        HStack {
                            Image(systemName: "trophy.fill")
                                .foregroundStyle(.yellow)
                            Text("View Leaderboard")
                                .fontWeight(.medium)
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.caption)
                                .foregroundStyle(Color.textSecondary)
                        }
                        .padding(.vertical, 12)
                        .padding(.horizontal, 16)
                        .background(Color.mintLight)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    .foregroundStyle(Color.textPrimary)
                }
            } else {
                emptyState
            }
        }
        .padding(16)
        .background(Color.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 8, y: 2)
    }
    
    // MARK: - Level Badge
    private func levelBadge(level: Int) -> some View {
        HStack(spacing: 8) {
            ZStack {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: levelColors(for: level),
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 48, height: 48)
                
                Text("\(level)")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundStyle(.white)
            }
            
            VStack(alignment: .leading, spacing: 2) {
                Text("Level \(level)")
                    .font(.headline)
                    .foregroundStyle(Color.textPrimary)
                
                Text(levelTitle(for: level))
                    .font(.caption)
                    .foregroundStyle(Color.textSecondary)
            }
        }
    }
    
    // MARK: - Stat Item
    private func statItem(icon: String, value: String, label: String, color: Color) -> some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(color)
            
            Text(value)
                .font(.headline)
                .fontWeight(.bold)
                .foregroundStyle(Color.textPrimary)
            
            Text(label)
                .font(.caption2)
                .foregroundStyle(Color.textSecondary)
        }
        .frame(maxWidth: .infinity)
    }
    
    // MARK: - Loading State
    private var loadingState: some View {
        VStack(spacing: 12) {
            ProgressView()
                .scaleEffect(1.2)
            Text("Loading XP...")
                .font(.caption)
                .foregroundStyle(Color.textSecondary)
        }
        .frame(height: 150)
    }
    
    // MARK: - Empty State
    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "star.circle")
                .font(.system(size: 40))
                .foregroundStyle(Color.brandAccent)
            
            Text("Start Earning XP!")
                .font(.headline)
                .foregroundStyle(Color.textPrimary)
            
            Text("Complete check-ins, goals, and chat with agents to earn XP and level up.")
                .font(.caption)
                .foregroundStyle(Color.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(.vertical, 20)
    }
    
    // MARK: - Helpers
    private func levelColors(for level: Int) -> [Color] {
        switch level {
        case 0...4:
            return [Color.brandAccent, Color.mintMedium]
        case 5...9:
            return [Color.success, Color.brandAccentDark]
        case 10...19:
            return [Color(hex: "667EEA")!, Color(hex: "764BA2")!]
        case 20...:
            return [Color(hex: "F093FB")!, Color(hex: "F5576C")!]
        default:
            return [Color.brandAccent, Color.mintMedium]
        }
    }
    
    private func levelTitle(for level: Int) -> String {
        switch level {
        case 0: return "Newcomer"
        case 1...4: return "Explorer"
        case 5...9: return "Achiever"
        case 10...14: return "Champion"
        case 15...19: return "Master"
        case 20...: return "Legend"
        default: return "Newcomer"
        }
    }
}

// MARK: - Compact Version for Lists
struct XPProgressCompactView: View {
    let status: XPStatus?
    
    var body: some View {
        if let status = status {
            HStack(spacing: 12) {
                // Level badge
                ZStack {
                    Circle()
                        .fill(Color.brandAccent)
                        .frame(width: 36, height: 36)
                    
                    Text("\(status.level)")
                        .font(.headline)
                        .fontWeight(.bold)
                        .foregroundStyle(.white)
                }
                
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text("\(status.totalXP) XP")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundStyle(Color.textPrimary)
                        
                        Spacer()
                        
                        if status.streak > 0 {
                            HStack(spacing: 2) {
                                Image(systemName: "flame.fill")
                                    .font(.caption2)
                                    .foregroundStyle(.orange)
                                Text("\(status.streak)")
                                    .font(.caption)
                                    .fontWeight(.medium)
                                    .foregroundStyle(Color.textSecondary)
                            }
                        }
                    }
                    
                    // Mini progress bar
                    GeometryReader { geometry in
                        ZStack(alignment: .leading) {
                            RoundedRectangle(cornerRadius: 3)
                                .fill(Color.mintLight)
                                .frame(height: 6)
                            
                            RoundedRectangle(cornerRadius: 3)
                                .fill(Color.brandAccent)
                                .frame(width: geometry.size.width * status.progressFraction, height: 6)
                        }
                    }
                    .frame(height: 6)
                }
            }
        }
    }
}

#Preview {
    VStack(spacing: 20) {
        XPProgressView(
            status: XPStatus(
                userId: "test123",
                totalXP: 1250,
                currentXP: 450,
                level: 3,
                nextLevelXP: 1600,
                progressToNextLevel: 78,
                redemptionBoost: 0,
                streak: 7
            ),
            isLoading: false
        ) {
            print("Leaderboard tapped")
        }
        
        XPProgressView(status: nil, isLoading: true)
        
        XPProgressView(status: nil, isLoading: false)
    }
    .padding()
    .background(Color.background)
}
