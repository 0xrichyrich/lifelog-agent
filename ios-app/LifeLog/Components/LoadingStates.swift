//
//  LoadingStates.swift
//  LifeLog
//
//  Skeleton UI loading states, empty states with helpful guidance,
//  and error states with recovery actions
//

import SwiftUI

// MARK: - Skeleton Loading Views

struct SkeletonCard: View {
    var height: CGFloat = 80
    
    var body: some View {
        RoundedRectangle(cornerRadius: 12)
            .fill(Color.cardBackground)
            .frame(height: height)
            .overlay(
                HStack(spacing: 12) {
                    Circle()
                        .fill(Color.gray.opacity(0.3))
                        .frame(width: 44, height: 44)
                    
                    VStack(alignment: .leading, spacing: 8) {
                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color.gray.opacity(0.3))
                            .frame(width: 120, height: 14)
                        
                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color.gray.opacity(0.2))
                            .frame(width: 80, height: 10)
                    }
                    
                    Spacer()
                    
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.gray.opacity(0.2))
                        .frame(width: 40, height: 20)
                }
                .padding()
            )
            .shimmer()
    }
}

struct SkeletonTimeline: View {
    var body: some View {
        VStack(spacing: 4) {
            ForEach(0..<8, id: \.self) { index in
                HStack(spacing: 12) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.gray.opacity(0.2))
                        .frame(width: 40, height: 12)
                    
                    GeometryReader { geometry in
                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color.gray.opacity(0.15))
                            .frame(width: geometry.size.width * CGFloat.random(in: 0.2...0.9))
                    }
                    .frame(height: 24)
                }
            }
        }
        .shimmer()
    }
}

struct SkeletonGoalCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 8) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.gray.opacity(0.3))
                        .frame(width: 140, height: 16)
                    
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.gray.opacity(0.2))
                        .frame(width: 80, height: 12)
                }
                
                Spacer()
                
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.gray.opacity(0.2))
                    .frame(width: 50, height: 28)
            }
            
            RoundedRectangle(cornerRadius: 4)
                .fill(Color.gray.opacity(0.2))
                .frame(height: 8)
            
            HStack {
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color.gray.opacity(0.2))
                    .frame(width: 80, height: 12)
                
                Spacer()
                
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color.gray.opacity(0.2))
                    .frame(width: 30, height: 12)
            }
        }
        .padding()
        .background(Color.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shimmer()
    }
}

// MARK: - Loading View Wrapper
struct LoadingView<Content: View>: View {
    let isLoading: Bool
    let skeletonCount: Int
    let content: () -> Content
    
    init(isLoading: Bool, skeletonCount: Int = 3, @ViewBuilder content: @escaping () -> Content) {
        self.isLoading = isLoading
        self.skeletonCount = skeletonCount
        self.content = content
    }
    
    var body: some View {
        if isLoading {
            VStack(spacing: 12) {
                ForEach(0..<skeletonCount, id: \.self) { _ in
                    SkeletonCard()
                }
            }
        } else {
            content()
        }
    }
}

// MARK: - Empty State Views

struct EmptyStateView: View {
    let icon: String
    let title: String
    let message: String
    var actionTitle: String? = nil
    var action: (() -> Void)? = nil
    
    var body: some View {
        VStack(spacing: 20) {
            ZStack {
                Circle()
                    .fill(Color.brandAccent.opacity(0.1))
                    .frame(width: 100, height: 100)
                
                Image(systemName: icon)
                    .font(.system(size: 40))
                    .foregroundStyle(Color.brandAccent)
            }
            
            VStack(spacing: 8) {
                Text(title)
                    .font(.title3)
                    .fontWeight(.semibold)
                    .foregroundStyle(Color.textPrimary)
                
                Text(message)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .lineLimit(3)
            }
            
            if let actionTitle = actionTitle, let action = action {
                Button {
                    action()
                } label: {
                    Text(actionTitle)
                        .fontWeight(.semibold)
                        .padding(.horizontal, 24)
                        .padding(.vertical, 12)
                        .background(Color.brandAccent)
                        .foregroundStyle(.white)
                        .clipShape(Capsule())
                }
                .padding(.top, 8)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
        .padding(.horizontal, 32)
    }
}

// MARK: - Pre-built Empty States

struct EmptyCheckInsView: View {
    var onStartLogging: (() -> Void)? = nil
    
    var body: some View {
        EmptyStateView(
            icon: "square.and.pencil",
            title: "No Check-ins Yet",
            message: "Start your first check-in to capture what's on your mind. Quick logs help you track your day!",
            actionTitle: "Log Now",
            action: onStartLogging
        )
    }
}

struct EmptyGoalsView: View {
    var onCreateGoal: (() -> Void)? = nil
    
    var body: some View {
        EmptyStateView(
            icon: "target",
            title: "Set Your First Goal",
            message: "Goals help you stay focused and build streaks. Start with something small and achievable.",
            actionTitle: "Create Goal",
            action: onCreateGoal
        )
    }
}

struct EmptyTimelineView: View {
    var body: some View {
        EmptyStateView(
            icon: "calendar.day.timeline.left",
            title: "No Activity Today",
            message: "Your timeline will fill up as you log activities throughout the day."
        )
    }
}

// MARK: - Error State Views

struct ErrorStateView: View {
    let title: String
    let message: String
    let retryAction: () -> Void
    var secondaryAction: (() -> Void)? = nil
    var secondaryTitle: String? = nil
    
    @State private var shakeAmount: CGFloat = 0
    
    var body: some View {
        VStack(spacing: 20) {
            ZStack {
                Circle()
                    .fill(Color.danger.opacity(0.1))
                    .frame(width: 100, height: 100)
                
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 40))
                    .foregroundStyle(Color.danger)
            }
            .shake(trigger: shakeAmount)
            
            VStack(spacing: 8) {
                Text(title)
                    .font(.title3)
                    .fontWeight(.semibold)
                    .foregroundStyle(Color.textPrimary)
                
                Text(message)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .lineLimit(4)
            }
            
            VStack(spacing: 12) {
                Button {
                    withAnimation(.default) {
                        shakeAmount += 1
                    }
                    retryAction()
                } label: {
                    HStack {
                        Image(systemName: "arrow.clockwise")
                        Text("Try Again")
                    }
                    .fontWeight(.semibold)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color.brandAccent)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                
                if let secondaryAction = secondaryAction, let secondaryTitle = secondaryTitle {
                    Button {
                        secondaryAction()
                    } label: {
                        Text(secondaryTitle)
                            .fontWeight(.medium)
                            .foregroundStyle(Color.brandAccent)
                    }
                }
            }
            .padding(.top, 8)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
        .padding(.horizontal, 32)
    }
}

// MARK: - Pre-built Error States

struct NetworkErrorView: View {
    let retryAction: () -> Void
    var onOfflineMode: (() -> Void)? = nil
    
    var body: some View {
        ErrorStateView(
            title: "Connection Failed",
            message: "Unable to reach the server. Check your internet connection and try again.",
            retryAction: retryAction,
            secondaryAction: onOfflineMode,
            secondaryTitle: "Continue Offline"
        )
    }
}

struct ServerErrorView: View {
    let retryAction: () -> Void
    
    var body: some View {
        ErrorStateView(
            title: "Something Went Wrong",
            message: "The server encountered an error. This is usually temporary. Please try again.",
            retryAction: retryAction
        )
    }
}

// MARK: - Custom Pull-to-Refresh Animation

struct CustomRefreshView: View {
    var isRefreshing: Bool
    var progress: CGFloat
    
    var body: some View {
        HStack(spacing: 12) {
            if isRefreshing {
                ProgressView()
                    .tint(Color.brandAccent)
            } else {
                Image(systemName: "arrow.down")
                    .rotationEffect(.degrees(180 * progress))
                    .foregroundStyle(Color.brandAccent.opacity(progress))
            }
            
            Text(isRefreshing ? "Refreshing..." : (progress >= 1 ? "Release to refresh" : "Pull to refresh"))
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(height: 50)
    }
}

// MARK: - Previews

#Preview("Skeleton Cards") {
    VStack(spacing: 12) {
        SkeletonCard()
        SkeletonCard(height: 100)
        SkeletonGoalCard()
    }
    .padding()
    .background(Color.background)
}

#Preview("Empty States") {
    ScrollView {
        VStack(spacing: 40) {
            EmptyCheckInsView()
            EmptyGoalsView()
            EmptyTimelineView()
        }
    }
    .background(Color.background)
}

#Preview("Error States") {
    VStack(spacing: 40) {
        NetworkErrorView(retryAction: {})
        ServerErrorView(retryAction: {})
    }
    .background(Color.background)
}
