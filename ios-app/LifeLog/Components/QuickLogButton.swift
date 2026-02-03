//
//  QuickLogButton.swift
//  LifeLog
//
//  2-tap check-in flow with pre-configured quick log buttons
//  Inspired by Streaks/Things 3 for sub-second completion
//

import SwiftUI

// MARK: - Quick Log Activity Type
enum QuickLogType: String, CaseIterable, Identifiable {
    case focus = "Focus"
    case meeting = "Meeting"
    case `break` = "Break"
    case coffee = "Coffee"
    case exercise = "Exercise"
    case reading = "Reading"
    case lunch = "Lunch"
    case walk = "Walk"
    
    var id: String { rawValue }
    
    var icon: String {
        switch self {
        case .focus: return "brain.head.profile"
        case .meeting: return "person.3.fill"
        case .break: return "cup.and.saucer.fill"
        case .coffee: return "mug.fill"
        case .exercise: return "figure.run"
        case .reading: return "book.fill"
        case .lunch: return "fork.knife"
        case .walk: return "figure.walk"
        }
    }
    
    var color: Color {
        switch self {
        case .focus: return .success
        case .meeting: return .warning
        case .break: return Color(.systemGray)
        case .coffee: return Color(hex: "8b5a2b")!
        case .exercise: return .brandAccent
        case .reading: return Color(hex: "9333ea")!
        case .lunch: return Color(hex: "ea580c")!
        case .walk: return Color(hex: "06b6d4")!
        }
    }
    
    var message: String {
        switch self {
        case .focus: return "Started focus session"
        case .meeting: return "In a meeting"
        case .break: return "Taking a break"
        case .coffee: return "Coffee break ☕️"
        case .exercise: return "Exercising 💪"
        case .reading: return "Reading session 📚"
        case .lunch: return "Lunch break 🍽️"
        case .walk: return "Going for a walk 🚶"
        }
    }
}

// MARK: - Quick Log Button
struct QuickLogButton: View {
    let type: QuickLogType
    let onTap: () async -> Void
    
    @State private var isPressed = false
    @State private var isLogging = false
    @State private var showCheckmark = false
    
    var body: some View {
        Button {
            Task {
                await triggerLog()
            }
        } label: {
            VStack(spacing: 8) {
                ZStack {
                    Circle()
                        .fill(type.color.opacity(0.2))
                        .frame(width: 56, height: 56)
                    
                    if showCheckmark {
                        Image(systemName: "checkmark")
                            .font(.system(size: 24, weight: .bold))
                            .foregroundStyle(.white)
                            .transition(.scale.combined(with: .opacity))
                    } else if isLogging {
                        ProgressView()
                            .tint(type.color)
                    } else {
                        Image(systemName: type.icon)
                            .font(.system(size: 24))
                            .foregroundStyle(type.color)
                    }
                }
                .background(
                    Circle()
                        .fill(showCheckmark ? type.color : Color.clear)
                        .scaleEffect(showCheckmark ? 1.0 : 0.5)
                        .animation(.spring(response: 0.3, dampingFraction: 0.6), value: showCheckmark)
                )
                .scaleEffect(isPressed ? 0.9 : 1.0)
                .animation(.spring(response: 0.2, dampingFraction: 0.5), value: isPressed)
                
                Text(type.rawValue)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundStyle(Color.textPrimary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(Color.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 16))
        }
        .buttonStyle(PressableButtonStyle(isPressed: $isPressed))
        .disabled(isLogging)
    }
    
    private func triggerLog() async {
        // Haptic feedback on tap
        let impactFeedback = UIImpactFeedbackGenerator(style: .medium)
        impactFeedback.impactOccurred()
        
        isLogging = true
        
        await onTap()
        
        // Success haptic
        let notificationFeedback = UINotificationFeedbackGenerator()
        notificationFeedback.notificationOccurred(.success)
        
        // Show checkmark animation
        withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
            showCheckmark = true
            isLogging = false
        }
        
        // Reset after delay
        try? await Task.sleep(nanoseconds: 1_500_000_000)
        
        withAnimation(.easeOut(duration: 0.2)) {
            showCheckmark = false
        }
    }
}

// MARK: - Pressable Button Style
struct PressableButtonStyle: ButtonStyle {
    @Binding var isPressed: Bool
    
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .onChange(of: configuration.isPressed) { _, newValue in
                isPressed = newValue
            }
    }
}

// MARK: - Quick Log Grid
struct QuickLogGrid: View {
    let onLog: (QuickLogType) async -> Void
    
    let columns = [
        GridItem(.flexible()),
        GridItem(.flexible()),
        GridItem(.flexible()),
        GridItem(.flexible())
    ]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Quick Log")
                .font(.headline)
                .foregroundStyle(Color.textPrimary)
            
            LazyVGrid(columns: columns, spacing: 12) {
                ForEach(QuickLogType.allCases) { type in
                    QuickLogButton(type: type) {
                        await onLog(type)
                    }
                }
            }
        }
    }
}

#Preview {
    QuickLogGrid { type in
        try? await Task.sleep(nanoseconds: 500_000_000)
        print("Logged: \(type.rawValue)")
    }
    .padding()
    .background(Color.background)
}
