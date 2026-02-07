//
//  XPRedemptionView.swift
//  LifeLog
//
//  XP to $NUDGE redemption flow
//  Shows balance, rates, and allows users to convert XP to tokens
//

import SwiftUI

struct XPRedemptionView: View {
    @Environment(AppState.self) private var appState
    @EnvironmentObject private var privyService: PrivyService
    @StateObject private var xpService = XPService()
    
    @State private var xpToRedeem: Double = 0
    @State private var showingConfirmation = false
    @State private var showingResult = false
    @State private var redemptionResult: RedemptionResult?
    @State private var isLoading = true
    
    private var userId: String {
        privyService.walletAddress ?? UIDevice.current.identifierForVendor?.uuidString ?? "anonymous"
    }
    
    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                if isLoading {
                    loadingView
                } else if let status = xpService.redemptionStatus {
                    balanceSection(status)
                    ratesSection(status)
                    redemptionSlider(status)
                    redeemButton(status)
                    weeklyPoolSection
                } else {
                    errorView
                }
            }
            .padding()
        }
        .background(Color.background)
        .navigationTitle("Redeem XP")
        .navigationBarTitleDisplayMode(.large)
        .onAppear {
            Task {
                await loadData()
            }
        }
        .refreshable {
            await loadData()
        }
        .alert("Confirm Redemption", isPresented: $showingConfirmation) {
            Button("Cancel", role: .cancel) { }
            Button("Redeem") {
                Task {
                    await performRedemption()
                }
            }
        } message: {
            if let status = xpService.redemptionStatus {
                let nudge = Double(Int(xpToRedeem)) / Double(status.redemptionRate)
                Text("Convert \(Int(xpToRedeem)) XP to \(String(format: "%.1f", nudge)) $NUDGE?")
            }
        }
        .overlay {
            if showingResult, let result = redemptionResult {
                RedemptionResultOverlay(result: result) {
                    showingResult = false
                    redemptionResult = nil
                }
            }
        }
    }
    
    // MARK: - Loading View
    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.2)
            Text("Loading redemption status...")
                .font(.subheadline)
                .foregroundStyle(Color.textSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.vertical, 100)
    }
    
    // MARK: - Error View
    private var errorView: some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 48))
                .foregroundStyle(Color.warning)
            
            Text("Unable to load redemption data")
                .font(.headline)
                .foregroundStyle(Color.textPrimary)
            
            Button("Try Again") {
                Task {
                    await loadData()
                }
            }
            .buttonStyle(.borderedProminent)
            .tint(Color.brandAccent)
        }
        .padding(.vertical, 100)
    }
    
    // MARK: - Balance Section
    private func balanceSection(_ status: RedemptionStatus) -> some View {
        VStack(spacing: 16) {
            // XP Balance
            VStack(spacing: 4) {
                Text("Available XP")
                    .font(.caption)
                    .foregroundStyle(Color.textSecondary)
                
                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text("\(status.currentXP)")
                        .font(.system(size: 48, weight: .bold, design: .rounded))
                        .foregroundStyle(Color.brandInteractive)
                    
                    Text("XP")
                        .font(.title3)
                        .fontWeight(.medium)
                        .foregroundStyle(Color.textSecondary)
                }
            }
            
            // Level & Streak
            HStack(spacing: 24) {
                VStack(spacing: 4) {
                    Image(systemName: "star.fill")
                        .font(.title3)
                        .foregroundStyle(Color.warning)
                    Text("Level \(status.level)")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(Color.textPrimary)
                }
                
                Divider()
                    .frame(height: 40)
                
                VStack(spacing: 4) {
                    Image(systemName: "flame.fill")
                        .font(.title3)
                        .foregroundStyle(Color.warning)
                    Text("\(String(format: "%.1f", status.streakMultiplier))x Streak")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(Color.textPrimary)
                }
                
                Divider()
                    .frame(height: 40)
                
                VStack(spacing: 4) {
                    Image(systemName: "crown.fill")
                        .font(.title3)
                        .foregroundStyle(tierColor(for: status.levelTierName))
                    Text(status.levelTierName)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(Color.textPrimary)
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(Color.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 8, y: 2)
    }
    
    // MARK: - Rates Section
    private func ratesSection(_ status: RedemptionStatus) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Redemption Rate")
                .font(.headline)
                .foregroundStyle(Color.textPrimary)
            
            HStack {
                // Rate
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 4) {
                        Text("\(status.redemptionRate)")
                            .font(.title)
                            .fontWeight(.bold)
                            .foregroundStyle(Color.brandAccent)
                        Text(": 1")
                            .font(.title)
                            .fontWeight(.bold)
                            .foregroundStyle(Color.textPrimary)
                    }
                    Text("XP per $NUDGE")
                        .font(.caption)
                        .foregroundStyle(Color.textSecondary)
                }
                
                Spacer()
                
                // Daily Cap
                VStack(alignment: .trailing, spacing: 4) {
                    HStack(spacing: 4) {
                        Text("\(status.remainingToday)")
                            .font(.title)
                            .fontWeight(.bold)
                            .foregroundStyle(status.remainingToday > 0 ? Color.success : Color.textSecondary)
                        Text("/ \(status.dailyCap)")
                            .font(.title3)
                            .foregroundStyle(Color.textSecondary)
                    }
                    Text("$NUDGE remaining today")
                        .font(.caption)
                        .foregroundStyle(Color.textSecondary)
                }
            }
            
            // Progress bar for daily cap
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.gray.opacity(0.2))
                    
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.brandAccent)
                        .frame(width: geometry.size.width * CGFloat(status.remainingToday) / CGFloat(status.dailyCap))
                }
            }
            .frame(height: 8)
        }
        .padding()
        .background(Color.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 8, y: 2)
    }
    
    // MARK: - Redemption Slider
    private func redemptionSlider(_ status: RedemptionStatus) -> some View {
        let maxXP = Double(min(status.currentXP, status.maxXPRedeemable))
        
        return VStack(alignment: .leading, spacing: 16) {
            Text("Amount to Redeem")
                .font(.headline)
                .foregroundStyle(Color.textPrimary)
            
            VStack(spacing: 8) {
                // XP Amount
                HStack {
                    Text("\(Int(xpToRedeem))")
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .foregroundStyle(Color.brandInteractive)
                    Text("XP")
                        .font(.title3)
                        .foregroundStyle(Color.textSecondary)
                    
                    Spacer()
                    
                    Image(systemName: "arrow.right")
                        .foregroundStyle(Color.textSecondary)
                    
                    Spacer()
                    
                    Text(String(format: "%.1f", Double(Int(xpToRedeem)) / Double(status.redemptionRate)))
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .foregroundStyle(Color.success)
                    Text("NUDGE")
                        .font(.title3)
                        .foregroundStyle(Color.textSecondary)
                }
                
                // Slider
                if maxXP > 0 {
                    Slider(value: $xpToRedeem, in: 0...maxXP, step: Double(status.redemptionRate))
                        .tint(Color.brandAccent)
                    
                    // Quick buttons
                    HStack {
                        QuickAmountButton(label: "25%") {
                            xpToRedeem = maxXP * 0.25
                            xpToRedeem = Double(Int(xpToRedeem / Double(status.redemptionRate)) * status.redemptionRate)
                        }
                        QuickAmountButton(label: "50%") {
                            xpToRedeem = maxXP * 0.5
                            xpToRedeem = Double(Int(xpToRedeem / Double(status.redemptionRate)) * status.redemptionRate)
                        }
                        QuickAmountButton(label: "75%") {
                            xpToRedeem = maxXP * 0.75
                            xpToRedeem = Double(Int(xpToRedeem / Double(status.redemptionRate)) * status.redemptionRate)
                        }
                        QuickAmountButton(label: "Max") {
                            xpToRedeem = maxXP
                        }
                    }
                } else {
                    Text("No XP available to redeem")
                        .font(.subheadline)
                        .foregroundStyle(Color.textSecondary)
                        .frame(maxWidth: .infinity)
                        .padding()
                }
            }
        }
        .padding()
        .background(Color.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 8, y: 2)
    }
    
    // MARK: - Redeem Button
    private func redeemButton(_ status: RedemptionStatus) -> some View {
        Button {
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            showingConfirmation = true
        } label: {
            HStack {
                if xpService.isRedeeming {
                    ProgressView()
                        .tint(.white)
                } else {
                    Image(systemName: "arrow.triangle.2.circlepath")
                    Text("Redeem for $NUDGE")
                        .fontWeight(.semibold)
                }
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(xpToRedeem > 0 ? Color.brandAccent : Color.gray.opacity(0.3))
            .foregroundStyle(.white)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .disabled(xpToRedeem <= 0 || xpService.isRedeeming)
    }
    
    // MARK: - Weekly Pool Section
    private var weeklyPoolSection: some View {
        Group {
            if let pool = xpService.weeklyPool {
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Text("Weekly Bonus Pool")
                            .font(.headline)
                            .foregroundStyle(Color.textPrimary)
                        
                        Spacer()
                        
                        Image(systemName: "gift.fill")
                            .foregroundStyle(Color.brandAccent)
                    }
                    
                    HStack(spacing: 16) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Pool Total")
                                .font(.caption)
                                .foregroundStyle(Color.textSecondary)
                            Text("\(Int(pool.poolTotal)) NUDGE")
                                .font(.headline)
                                .foregroundStyle(Color.success)
                        }
                        
                        Spacer()
                        
                        VStack(alignment: .trailing, spacing: 4) {
                            Text("Your Est. Share")
                                .font(.caption)
                                .foregroundStyle(Color.textSecondary)
                            Text("\(String(format: "%.1f", pool.estimatedReward)) NUDGE")
                                .font(.headline)
                                .foregroundStyle(Color.brandAccent)
                        }
                    }
                    
                    HStack {
                        Image(systemName: "person.3.fill")
                            .font(.caption)
                        Text("\(pool.participantCount) participants")
                            .font(.caption)
                        
                        Spacer()
                        
                        Image(systemName: "clock.fill")
                            .font(.caption)
                        Text("Ends \(formatPoolEndTime(pool.endsAt))")
                            .font(.caption)
                    }
                    .foregroundStyle(Color.textSecondary)
                }
                .padding()
                .background(Color.cardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .shadow(color: .black.opacity(0.05), radius: 8, y: 2)
            }
        }
    }
    
    // MARK: - Helpers
    private func loadData() async {
        isLoading = true
        xpService.updateConfig(baseURL: appState.apiEndpoint, apiKey: appState.apiKey)
        await xpService.fetchRedemptionStatus(userId: userId)
        await xpService.fetchWeeklyPool(userId: userId)
        isLoading = false
    }
    
    private func performRedemption() async {
        guard let result = await xpService.redeemXP(userId: userId, xpAmount: Int(xpToRedeem)) else {
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            return
        }
        
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        redemptionResult = result
        showingResult = true
        xpToRedeem = 0
    }
    
    private func tierColor(for tier: String) -> Color {
        switch tier {
        case "Gold": return Color(hex: "FFD700") ?? .yellow
        case "Silver": return Color(hex: "C0C0C0") ?? .gray
        default: return Color(hex: "CD7F32") ?? .orange
        }
    }
    
    private func formatPoolEndTime(_ isoString: String) -> String {
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: isoString) else { return isoString }
        
        let relativeFormatter = RelativeDateTimeFormatter()
        relativeFormatter.unitsStyle = .short
        return relativeFormatter.localizedString(for: date, relativeTo: Date())
    }
}

// MARK: - Quick Amount Button
struct QuickAmountButton: View {
    let label: String
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.caption)
                .fontWeight(.medium)
                .foregroundStyle(Color.brandAccent)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(Color.brandAccent.opacity(0.15))
                .clipShape(Capsule())
        }
    }
}

// MARK: - Redemption Result Overlay
struct RedemptionResultOverlay: View {
    let result: RedemptionResult
    let onDismiss: () -> Void
    
    @State private var showConfetti = false
    
    var body: some View {
        ZStack {
            Color.black.opacity(0.4)
                .ignoresSafeArea()
                .onTapGesture {
                    onDismiss()
                }
            
            VStack(spacing: 24) {
                // Success icon
                ZStack {
                    Circle()
                        .fill(Color.success.opacity(0.2))
                        .frame(width: 100, height: 100)
                    
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 60))
                        .foregroundStyle(Color.success)
                        .scaleEffect(showConfetti ? 1.0 : 0.5)
                        .animation(.spring(response: 0.4, dampingFraction: 0.6), value: showConfetti)
                }
                
                VStack(spacing: 8) {
                    Text("Redemption Successful!")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundStyle(Color.textPrimary)
                    
                    HStack(spacing: 4) {
                        Text("+\(String(format: "%.1f", result.nudgeEarned))")
                            .font(.system(size: 36, weight: .bold, design: .rounded))
                            .foregroundStyle(Color.success)
                        Text("NUDGE")
                            .font(.title3)
                            .foregroundStyle(Color.textSecondary)
                    }
                }
                
                VStack(spacing: 8) {
                    HStack {
                        Text("XP Spent")
                            .foregroundStyle(Color.textSecondary)
                        Spacer()
                        Text("-\(result.xpSpent) XP")
                            .fontWeight(.medium)
                            .foregroundStyle(Color.textPrimary)
                    }
                    
                    HStack {
                        Text("New XP Balance")
                            .foregroundStyle(Color.textSecondary)
                        Spacer()
                        Text("\(result.newXPBalance) XP")
                            .fontWeight(.medium)
                            .foregroundStyle(Color.brandInteractive)
                    }
                    
                    HStack {
                        Text("Daily Remaining")
                            .foregroundStyle(Color.textSecondary)
                        Spacer()
                        Text("\(result.dailyRemaining) NUDGE")
                            .fontWeight(.medium)
                            .foregroundStyle(Color.textPrimary)
                    }
                }
                .font(.subheadline)
                .padding()
                .background(Color.background)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                
                Button {
                    onDismiss()
                } label: {
                    Text("Done")
                        .font(.headline)
                        .foregroundStyle(.white)
                        .frame(width: 120)
                        .padding()
                        .background(Color.brandAccent)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
            .padding(32)
            .background(Color.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 20))
            .shadow(radius: 20)
            .padding(40)
        }
        .transition(.opacity)
        .onAppear {
            showConfetti = true
        }
    }
}

#Preview {
    NavigationStack {
        XPRedemptionView()
            .environment(AppState())
            .environmentObject(PrivyService.shared)
    }
}
