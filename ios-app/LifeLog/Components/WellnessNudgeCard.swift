//
//  WellnessNudgeCard.swift
//  LifeLog
//
//  Displays wellness insights with positive, supportive messaging
//

import SwiftUI

struct WellnessNudgeCard: View {
    let insight: WellnessInsight
    var onAction: (() -> Void)? = nil
    var onDismiss: (() -> Void)? = nil
    
    @State private var appeared = false
    @State private var dismissed = false
    
    var body: some View {
        if !dismissed {
            HStack(spacing: 12) {
                // Emoji indicator
                Text(insight.emoji)
                    .font(.title2)
                    .frame(width: 44, height: 44)
                    .background(insight.type.backgroundColor)
                    .clipShape(Circle())
                
                // Content
                VStack(alignment: .leading, spacing: 4) {
                    Text(insight.message)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(Color.textPrimary)
                    
                    if let detail = insight.detail {
                        Text(detail)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                
                Spacer()
                
                // Action or dismiss
                if let actionLabel = insight.actionLabel {
                    Button {
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        onAction?()
                    } label: {
                        Text(actionLabel)
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundStyle(.white)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color.brandAccent)
                            .clipShape(Capsule())
                    }
                } else if onDismiss != nil {
                    Button {
                        withAnimation(.easeOut(duration: 0.2)) {
                            dismissed = true
                        }
                        onDismiss?()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .padding(8)
                    }
                }
            }
            .padding()
            .background(insight.type.backgroundColor)
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(insight.type.borderColor, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .scaleEffect(appeared ? 1.0 : 0.95)
            .opacity(appeared ? 1.0 : 0)
            .onAppear {
                withAnimation(.spring(response: 0.4, dampingFraction: 0.7)) {
                    appeared = true
                }
            }
        }
    }
}

// MARK: - Wellness Insights List

struct WellnessInsightsList: View {
    let insights: [WellnessInsight]
    var onAction: ((WellnessInsight) -> Void)? = nil
    
    var body: some View {
        if !insights.isEmpty {
            VStack(spacing: 12) {
                ForEach(Array(insights.enumerated()), id: \.element.id) { index, insight in
                    WellnessNudgeCard(
                        insight: insight,
                        onAction: { onAction?(insight) }
                    )
                    .transition(.asymmetric(
                        insertion: .push(from: .top).combined(with: .opacity),
                        removal: .push(from: .bottom).combined(with: .opacity)
                    ))
                    .animation(.spring(response: 0.4, dampingFraction: 0.7).delay(Double(index) * 0.1), value: insights.count)
                }
            }
        }
    }
}

// MARK: - Quick Outdoor Log Card

struct QuickOutdoorLogCard: View {
    let onLogWalk: () -> Void
    let onLogOutdoor: () -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "sun.max.fill")
                    .foregroundStyle(Color.warning)
                Text("Log outdoor time")
                    .font(.headline)
                    .foregroundStyle(Color.textPrimary)
            }
            
            HStack(spacing: 12) {
                QuickOutdoorButton(
                    icon: "figure.walk",
                    label: "Walk",
                    color: Color.success,
                    action: onLogWalk
                )
                
                QuickOutdoorButton(
                    icon: "figure.run",
                    label: "Run",
                    color: Color.brandAccent,
                    action: onLogOutdoor
                )
                
                QuickOutdoorButton(
                    icon: "sun.max.fill",
                    label: "Outside",
                    color: Color.warning,
                    action: onLogOutdoor
                )
            }
        }
        .padding()
        .background(Color.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

struct QuickOutdoorButton: View {
    let icon: String
    let label: String
    let color: Color
    let action: () -> Void
    
    @State private var isPressed = false
    
    var body: some View {
        Button {
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            action()
        } label: {
            VStack(spacing: 6) {
                ZStack {
                    Circle()
                        .fill(color.opacity(0.2))
                        .frame(width: 44, height: 44)
                    
                    Image(systemName: icon)
                        .font(.system(size: 20))
                        .foregroundStyle(color)
                }
                
                Text(label)
                    .font(.caption)
                    .foregroundStyle(Color.textPrimary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
            .background(Color.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .scaleEffect(isPressed ? 0.95 : 1.0)
        }
        .buttonStyle(.plain)
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in isPressed = true }
                .onEnded { _ in isPressed = false }
        )
    }
}

// MARK: - Celebration Animation

struct CelebrationCard: View {
    let message: String
    let emoji: String
    
    @State private var bounceEmoji = false
    @State private var showSparkles = false
    
    var body: some View {
        HStack(spacing: 16) {
            ZStack {
                // Sparkle effect
                ForEach(0..<6, id: \.self) { index in
                    Image(systemName: "sparkle")
                        .font(.caption)
                        .foregroundStyle(Color.warning)
                        .offset(
                            x: showSparkles ? CGFloat.random(in: -25...25) : 0,
                            y: showSparkles ? CGFloat.random(in: -25...25) : 0
                        )
                        .opacity(showSparkles ? 0 : 1)
                        .animation(
                            .easeOut(duration: 0.8)
                            .delay(Double(index) * 0.1),
                            value: showSparkles
                        )
                }
                
                Text(emoji)
                    .font(.system(size: 40))
                    .scaleEffect(bounceEmoji ? 1.2 : 1.0)
            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text(message)
                    .font(.headline)
                    .foregroundStyle(Color.textPrimary)
                
                Text("Keep it up!")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            
            Spacer()
        }
        .padding()
        .background(
            LinearGradient(
                colors: [Color.success.opacity(0.2), Color.success.opacity(0.05)],
                startPoint: .leading,
                endPoint: .trailing
            )
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.success.opacity(0.3), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .onAppear {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.5)) {
                bounceEmoji = true
            }
            withAnimation(.easeOut(duration: 0.5).delay(0.2)) {
                bounceEmoji = false
            }
            
            showSparkles = true
            
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        }
    }
}

#Preview("Nudge Cards") {
    VStack(spacing: 16) {
        WellnessNudgeCard(insight: WellnessInsight(
            type: .celebration,
            message: "2 hours outside today - amazing! ☀️",
            detail: "You're really getting out there!",
            emoji: "🌟"
        ))
        
        WellnessNudgeCard(insight: WellnessInsight(
            type: .gentleSuggestion,
            message: "You've been inside for a while - want to log a walk? 🌳",
            emoji: "🌱",
            actionLabel: "Log walk"
        ))
        
        WellnessNudgeCard(insight: WellnessInsight(
            type: .streak,
            message: "🔥 7 day outdoor streak!",
            emoji: "🔥"
        ))
        
        CelebrationCard(message: "Your focus is up 20%!", emoji: "🎯")
    }
    .padding()
    .background(Color.background)
}
