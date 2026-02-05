//
//  XPNotificationView.swift
//  LifeLog
//
//  Created by Skynet on 2026-02-04.
//  Toast notification for XP earned
//

import SwiftUI

struct XPNotificationView: View {
    let notification: XPNotification
    let onDismiss: () -> Void
    
    @State private var isVisible = false
    @State private var offset: CGFloat = -100
    
    var body: some View {
        VStack {
            if isVisible {
                HStack(spacing: 12) {
                    // XP Icon
                    ZStack {
                        Circle()
                            .fill(
                                LinearGradient(
                                    colors: [Color.brandAccent, Color.success],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .frame(width: 44, height: 44)
                        
                        Image(systemName: "star.fill")
                            .font(.title3)
                            .foregroundStyle(.white)
                    }
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text("+\(notification.amount) XP")
                            .font(.headline)
                            .fontWeight(.bold)
                            .foregroundStyle(Color.textPrimary)
                        
                        Text(notification.activity.displayName)
                            .font(.caption)
                            .foregroundStyle(Color.textSecondary)
                    }
                    
                    Spacer()
                    
                    // Level up indicator
                    if notification.leveledUp, let newLevel = notification.newLevel {
                        VStack(spacing: 2) {
                            Image(systemName: "arrow.up.circle.fill")
                                .font(.title2)
                                .foregroundStyle(.yellow)
                            
                            Text("Lvl \(newLevel)!")
                                .font(.caption2)
                                .fontWeight(.bold)
                                .foregroundStyle(.yellow)
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color.cardBackground)
                        .shadow(color: .black.opacity(0.15), radius: 10, y: 4)
                )
                .padding(.horizontal, 20)
                .offset(y: offset)
                .transition(.move(edge: .top).combined(with: .opacity))
            }
            
            Spacer()
        }
        .onAppear {
            withAnimation(.spring(response: 0.5, dampingFraction: 0.7)) {
                isVisible = true
                offset = 0
            }
            
            // Auto-dismiss after 2 seconds
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                dismiss()
            }
        }
    }
    
    private func dismiss() {
        withAnimation(.easeInOut(duration: 0.3)) {
            offset = -100
            isVisible = false
        }
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            onDismiss()
        }
    }
}

// MARK: - XP Notification Modifier
struct XPNotificationModifier: ViewModifier {
    @Binding var notification: XPNotification?
    
    func body(content: Content) -> some View {
        ZStack {
            content
            
            if let notification = notification {
                XPNotificationView(notification: notification) {
                    self.notification = nil
                }
                .zIndex(100)
            }
        }
    }
}

extension View {
    func xpNotification(_ notification: Binding<XPNotification?>) -> some View {
        modifier(XPNotificationModifier(notification: notification))
    }
}

// MARK: - Inline XP Gain Animation
struct XPGainAnimation: View {
    let amount: Int
    @State private var isAnimating = false
    @State private var scale: CGFloat = 0.5
    @State private var opacity: Double = 1.0
    @State private var yOffset: CGFloat = 0
    
    var body: some View {
        Text("+\(amount) XP")
            .font(.caption)
            .fontWeight(.bold)
            .foregroundStyle(Color.brandInteractive)
            .scaleEffect(scale)
            .opacity(opacity)
            .offset(y: yOffset)
            .onAppear {
                withAnimation(.spring(response: 0.3, dampingFraction: 0.5)) {
                    scale = 1.2
                }
                
                withAnimation(.easeOut(duration: 0.8).delay(0.3)) {
                    yOffset = -30
                    opacity = 0
                }
            }
    }
}

// MARK: - Preview
#Preview {
    ZStack {
        Color.background.ignoresSafeArea()
        
        VStack {
            Text("Main Content")
                .font(.title)
            
            Spacer()
        }
        .padding(.top, 100)
        
        XPNotificationView(
            notification: XPNotification(
                amount: 50,
                activity: .dailyCheckin,
                leveledUp: true,
                newLevel: 5
            )
        ) {
            print("Dismissed")
        }
    }
}
