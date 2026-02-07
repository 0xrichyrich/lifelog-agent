//
//  Animations.swift
//  LifeLog
//
//  Things 3 style micro-animations with spring physics
//  Completion animations, transitions, and feedback effects
//

import SwiftUI

// MARK: - Completion Animation View
struct CompletionAnimation: View {
    @Binding var isAnimating: Bool
    var color: Color = .success
    
    @State private var scale: CGFloat = 0.5
    @State private var opacity: Double = 0
    @State private var ringScale: CGFloat = 0.3
    @State private var ringOpacity: Double = 0.8
    @State private var checkScale: CGFloat = 0.1
    
    var body: some View {
        ZStack {
            // Expanding ring
            Circle()
                .stroke(color.opacity(ringOpacity), lineWidth: 3)
                .scaleEffect(ringScale)
            
            // Filled circle
            Circle()
                .fill(color)
                .scaleEffect(scale)
                .opacity(opacity)
            
            // Checkmark
            Image(systemName: "checkmark")
                .font(.system(size: 32, weight: .bold))
                .foregroundStyle(.white)
                .scaleEffect(checkScale)
        }
        .frame(width: 80, height: 80)
        .onChange(of: isAnimating) { _, newValue in
            if newValue {
                playAnimation()
            } else {
                resetAnimation()
            }
        }
    }
    
    private func playAnimation() {
        // Ring expands outward
        withAnimation(.spring(response: 0.4, dampingFraction: 0.5)) {
            ringScale = 1.5
        }
        withAnimation(.easeOut(duration: 0.4).delay(0.1)) {
            ringOpacity = 0
        }
        
        // Circle fills
        withAnimation(.spring(response: 0.35, dampingFraction: 0.55)) {
            scale = 1.0
            opacity = 1.0
        }
        
        // Checkmark bounces in
        withAnimation(.spring(response: 0.3, dampingFraction: 0.4).delay(0.15)) {
            checkScale = 1.0
        }
    }
    
    private func resetAnimation() {
        withAnimation(.easeOut(duration: 0.2)) {
            scale = 0.5
            opacity = 0
            ringScale = 0.3
            ringOpacity = 0.8
            checkScale = 0.1
        }
    }
}

// MARK: - Confetti Particle
struct ConfettiParticle: Identifiable {
    let id = UUID()
    var position: CGPoint
    var color: Color
    var rotation: Double
    var scale: Double
}

// MARK: - Confetti Effect
struct ConfettiEffect: View {
    @Binding var trigger: Bool
    var particleCount: Int = 50
    
    @State private var particles: [ConfettiParticle] = []
    
    private let colors: [Color] = [.success, .brandAccent, .warning, Color(hex: "9333ea") ?? .purple, Color(hex: "ec4899") ?? .pink]
    
    var body: some View {
        GeometryReader { geometry in
            ZStack {
                ForEach(particles) { particle in
                    RoundedRectangle(cornerRadius: 2)
                        .fill(particle.color)
                        .frame(width: 8, height: 12)
                        .scaleEffect(particle.scale)
                        .rotationEffect(.degrees(particle.rotation))
                        .position(particle.position)
                }
            }
            .onChange(of: trigger) { _, newValue in
                if newValue {
                    createParticles(in: geometry.size)
                    animateParticles(in: geometry.size)
                }
            }
        }
        .allowsHitTesting(false)
    }
    
    private func createParticles(in size: CGSize) {
        particles = (0..<particleCount).map { _ in
            ConfettiParticle(
                position: CGPoint(x: size.width / 2, y: size.height / 2),
                color: colors.randomElement()!,
                rotation: Double.random(in: 0...360),
                scale: Double.random(in: 0.5...1.0)
            )
        }
    }
    
    private func animateParticles(in size: CGSize) {
        for i in particles.indices {
            let angle = Double.random(in: 0...(2 * .pi))
            let distance = Double.random(in: 100...300)
            let targetX = size.width / 2 + cos(angle) * distance
            let targetY = size.height / 2 + sin(angle) * distance
            
            withAnimation(.spring(response: 0.6, dampingFraction: 0.6).delay(Double(i) * 0.01)) {
                particles[i].position = CGPoint(x: targetX, y: targetY)
                particles[i].rotation += Double.random(in: 180...720)
            }
            
            withAnimation(.easeOut(duration: 0.8).delay(0.4)) {
                particles[i].scale = 0
            }
        }
        
        // Clear particles after animation
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            particles.removeAll()
        }
    }
}

// MARK: - Shake Effect
struct ShakeEffect: GeometryEffect {
    var amount: CGFloat = 10
    var shakesPerUnit: CGFloat = 3
    var animatableData: CGFloat
    
    func effectValue(size: CGSize) -> ProjectionTransform {
        ProjectionTransform(CGAffineTransform(translationX:
            amount * sin(animatableData * .pi * shakesPerUnit),
            y: 0
        ))
    }
}

// MARK: - Bounce Effect Modifier
struct BounceEffect: ViewModifier {
    @Binding var trigger: Bool
    var scale: CGFloat = 1.2
    
    @State private var currentScale: CGFloat = 1.0
    
    func body(content: Content) -> some View {
        content
            .scaleEffect(currentScale)
            .onChange(of: trigger) { _, newValue in
                if newValue {
                    withAnimation(.spring(response: 0.25, dampingFraction: 0.4)) {
                        currentScale = scale
                    }
                    withAnimation(.spring(response: 0.25, dampingFraction: 0.4).delay(0.15)) {
                        currentScale = 1.0
                    }
                }
            }
    }
}

// MARK: - Pulse Animation
struct PulseAnimation: ViewModifier {
    let isAnimating: Bool
    
    @State private var scale: CGFloat = 1.0
    @State private var opacity: Double = 1.0
    
    func body(content: Content) -> some View {
        content
            .overlay(
                content
                    .scaleEffect(scale)
                    .opacity(opacity)
            )
            .onAppear {
                if isAnimating {
                    withAnimation(.easeInOut(duration: 1.5).repeatForever(autoreverses: false)) {
                        scale = 1.5
                        opacity = 0
                    }
                }
            }
    }
}

// MARK: - Skeleton Loading Animation
struct SkeletonLoadingModifier: ViewModifier {
    @State private var phase: CGFloat = 0
    
    func body(content: Content) -> some View {
        content
            .overlay(
                GeometryReader { geometry in
                    LinearGradient(
                        colors: [
                            Color.clear,
                            Color.white.opacity(0.3),
                            Color.clear
                        ],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                    .frame(width: geometry.size.width * 2)
                    .offset(x: -geometry.size.width + (geometry.size.width * 2 * phase))
                }
                .mask(content)
            )
            .onAppear {
                withAnimation(.linear(duration: 1.5).repeatForever(autoreverses: false)) {
                    phase = 1
                }
            }
    }
}

// MARK: - View Extensions
extension View {
    func bounceEffect(trigger: Binding<Bool>, scale: CGFloat = 1.2) -> some View {
        modifier(BounceEffect(trigger: trigger, scale: scale))
    }
    
    func pulseAnimation(isAnimating: Bool) -> some View {
        modifier(PulseAnimation(isAnimating: isAnimating))
    }
    
    func shimmer() -> some View {
        modifier(SkeletonLoadingModifier())
    }
    
    func shake(trigger: CGFloat) -> some View {
        modifier(ShakeEffect(animatableData: trigger))
    }
}

// MARK: - Spring Presets (Things 3 style)
extension Animation {
    static let quickBounce = Animation.spring(response: 0.25, dampingFraction: 0.5)
    static let smoothBounce = Animation.spring(response: 0.35, dampingFraction: 0.6)
    static let gentleBounce = Animation.spring(response: 0.45, dampingFraction: 0.7)
    static let snappy = Animation.spring(response: 0.2, dampingFraction: 0.8)
}

#Preview("Completion Animation") {
    @Previewable @State var isAnimating = false
    
    VStack(spacing: 40) {
        CompletionAnimation(isAnimating: $isAnimating)
        
        Button("Animate") {
            isAnimating = true
            DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                isAnimating = false
            }
        }
        .buttonStyle(.borderedProminent)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(Color.background)
}
