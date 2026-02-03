//
//  BalanceCard.swift
//  LifeLog
//
//  Visual display of screen time vs outdoor time balance
//  Positive, non-judgmental presentation
//

import SwiftUI

struct BalanceCard: View {
    let screenMinutes: Int
    let outdoorMinutes: Int
    let focusMinutes: Int
    
    @State private var animateProgress = false
    
    private var balance: DailyBalance {
        DailyBalance(
            screenMinutes: screenMinutes,
            outdoorMinutes: outdoorMinutes,
            focusMinutes: focusMinutes
        )
    }
    
    var body: some View {
        VStack(spacing: 16) {
            // Header
            HStack {
                Text("Today's Balance")
                    .font(.headline)
                    .foregroundStyle(Color.textPrimary)
                
                Spacer()
                
                Text(balance.balanceEmoji)
                    .font(.title2)
            }
            
            // Visual balance bar
            BalanceBar(
                screenRatio: screenRatio,
                outdoorRatio: outdoorRatio,
                focusRatio: focusRatio,
                animate: animateProgress
            )
            
            // Stats row
            HStack(spacing: 24) {
                BalanceStat(
                    icon: "iphone",
                    label: "Screen",
                    value: formatMinutes(screenMinutes),
                    color: Color(hex: "6366f1")!
                )
                
                BalanceStat(
                    icon: "sun.max.fill",
                    label: "Outside",
                    value: formatMinutes(outdoorMinutes),
                    color: Color.success
                )
                
                BalanceStat(
                    icon: "brain.head.profile",
                    label: "Focus",
                    value: formatMinutes(focusMinutes),
                    color: Color.brandAccent
                )
            }
            
            // Positive message
            Text(balance.balanceMessage)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding()
        .background(Color.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .onAppear {
            withAnimation(.spring(response: 0.8, dampingFraction: 0.7).delay(0.2)) {
                animateProgress = true
            }
        }
    }
    
    private var totalMinutes: Int {
        max(screenMinutes + outdoorMinutes, 1)
    }
    
    private var screenRatio: CGFloat {
        CGFloat(screenMinutes) / CGFloat(totalMinutes + focusMinutes)
    }
    
    private var outdoorRatio: CGFloat {
        CGFloat(outdoorMinutes) / CGFloat(totalMinutes + focusMinutes)
    }
    
    private var focusRatio: CGFloat {
        CGFloat(focusMinutes) / CGFloat(totalMinutes + focusMinutes)
    }
    
    private func formatMinutes(_ minutes: Int) -> String {
        if minutes >= 60 {
            let hours = minutes / 60
            let mins = minutes % 60
            return mins > 0 ? "\(hours)h \(mins)m" : "\(hours)h"
        }
        return "\(minutes)m"
    }
}

// MARK: - Balance Bar

struct BalanceBar: View {
    let screenRatio: CGFloat
    let outdoorRatio: CGFloat
    let focusRatio: CGFloat
    let animate: Bool
    
    var body: some View {
        GeometryReader { geometry in
            HStack(spacing: 2) {
                // Screen time segment
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color(hex: "6366f1")!.opacity(0.8))
                    .frame(width: animate ? geometry.size.width * screenRatio : 0)
                
                // Focus time segment
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color.brandAccent.opacity(0.8))
                    .frame(width: animate ? geometry.size.width * focusRatio : 0)
                
                // Outdoor time segment
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color.success.opacity(0.8))
                    .frame(width: animate ? geometry.size.width * outdoorRatio : 0)
            }
        }
        .frame(height: 12)
        .background(Color.gray.opacity(0.2))
        .clipShape(RoundedRectangle(cornerRadius: 6))
    }
}

// MARK: - Balance Stat

struct BalanceStat: View {
    let icon: String
    let label: String
    let value: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(color)
            
            Text(value)
                .font(.headline)
                .fontWeight(.bold)
                .foregroundStyle(Color.textPrimary)
            
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Compact Balance View (for widgets/small spaces)

struct CompactBalanceView: View {
    let outdoorMinutes: Int
    let screenMinutes: Int
    
    private var ratio: CGFloat {
        guard screenMinutes > 0 else { return 1.0 }
        return min(CGFloat(outdoorMinutes) / CGFloat(screenMinutes), 1.0)
    }
    
    private var emoji: String {
        switch ratio {
        case 0.7...1.0: return "🌟"
        case 0.4..<0.7: return "☀️"
        case 0.2..<0.4: return "🌱"
        default: return "💪"
        }
    }
    
    var body: some View {
        HStack(spacing: 8) {
            // Ratio indicator
            ZStack {
                Circle()
                    .stroke(Color.gray.opacity(0.3), lineWidth: 4)
                
                Circle()
                    .trim(from: 0, to: ratio)
                    .stroke(
                        ratio >= 0.5 ? Color.success : Color.brandAccent,
                        style: StrokeStyle(lineWidth: 4, lineCap: .round)
                    )
                    .rotationEffect(.degrees(-90))
                
                Text(emoji)
                    .font(.caption)
            }
            .frame(width: 36, height: 36)
            
            VStack(alignment: .leading, spacing: 2) {
                Text("\(outdoorMinutes)m outside")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(Color.textPrimary)
                
                Text("vs \(screenMinutes)m screen")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

// MARK: - Outdoor Streak Badge

struct OutdoorStreakBadge: View {
    let streakDays: Int
    
    var body: some View {
        HStack(spacing: 6) {
            if streakDays > 0 {
                Image(systemName: "flame.fill")
                    .foregroundStyle(Color.warning)
                
                Text("\(streakDays)")
                    .fontWeight(.bold)
                    .foregroundStyle(Color.warning)
                
                Text("day\(streakDays == 1 ? "" : "s") outside")
                    .foregroundStyle(.secondary)
            } else {
                Image(systemName: "leaf")
                    .foregroundStyle(Color.success)
                
                Text("Start your streak!")
                    .foregroundStyle(.secondary)
            }
        }
        .font(.caption)
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(Color.cardBackground)
        .clipShape(Capsule())
    }
}

#Preview("Balance Card") {
    BalanceCard(
        screenMinutes: 240,
        outdoorMinutes: 60,
        focusMinutes: 120
    )
    .padding()
    .background(Color.background)
}

#Preview("Compact Balance") {
    CompactBalanceView(
        outdoorMinutes: 45,
        screenMinutes: 180
    )
    .padding()
    .background(Color.background)
}
