//
//  WalletView.swift
//  LifeLog
//
//  Wallet management view with Privy integration
//  Created for Moltiverse Hackathon
//

import SwiftUI

struct WalletView: View {
    @Environment(AppState.self) private var appState
    @EnvironmentObject private var privyService: PrivyService
    @State private var walletState = WalletState()
    @State private var showingConnectSheet = false
    @State private var showingClaimConfirmation = false
    @State private var showingDisconnectAlert = false
    @State private var isClaiming = false
    @State private var isRefreshing = false
    @State private var claimResult: ClaimResult?
    
    private let walletService = WalletService()
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    if privyService.isAuthenticated {
                        // Connected State
                        connectedWalletSection
                        balanceSection
                        rewardsSection
                        transactionHistorySection
                    } else {
                        // Not Connected State
                        connectWalletSection
                    }
                }
                .padding()
            }
            .background(Color.background)
            .navigationTitle("Wallet")
            .navigationBarTitleDisplayMode(.large)
            .refreshable {
                await refreshWalletData()
            }
            .sheet(isPresented: $showingConnectSheet) {
                // Reset loading state on dismiss
                privyService.isLoading = false
                privyService.error = nil
            } content: {
                ConnectWalletSheet(privyService: privyService, walletState: $walletState)
            }
            .alert("Disconnect Wallet", isPresented: $showingDisconnectAlert) {
                Button("Cancel", role: .cancel) { }
                Button("Disconnect", role: .destructive) {
                    Task {
                        await disconnectWallet()
                    }
                }
            } message: {
                Text("Are you sure you want to disconnect your wallet? You can reconnect at any time.")
            }
            .alert("Claim Rewards", isPresented: $showingClaimConfirmation) {
                Button("Cancel", role: .cancel) { }
                Button("Claim") {
                    Task {
                        await claimRewards()
                    }
                }
            } message: {
                Text("Claim \(walletState.pendingRewards) $NUDGE tokens to your wallet?")
            }
            .overlay {
                if let result = claimResult {
                    ClaimResultOverlay(result: result) {
                        claimResult = nil
                    }
                }
            }
            .onAppear {
                if privyService.isAuthenticated {
                    Task {
                        await refreshWalletData()
                    }
                }
            }
        }
    }
    
    // MARK: - Connect Wallet Section
    
    private var connectWalletSection: some View {
        VStack(spacing: 24) {
            // Icon
            Image(systemName: "wallet.bifold.fill")
                .font(.system(size: 64))
                .foregroundStyle(Color.brandAccent)
                .padding(.top, 40)
            
            Text("Connect Your Wallet")
                .font(.title2)
                .fontWeight(.bold)
                .foregroundStyle(Color.textPrimary)
            
            Text("Connect to earn $NUDGE tokens for your check-ins and streaks")
                .font(.body)
                .foregroundStyle(Color.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
            
            // Features list
            VStack(alignment: .leading, spacing: 12) {
                FeatureItem(icon: "gift.fill", text: "Earn tokens for daily check-ins")
                FeatureItem(icon: "flame.fill", text: "Bonus rewards for streaks")
                FeatureItem(icon: "lock.shield.fill", text: "Secure embedded wallet")
                FeatureItem(icon: "key.fill", text: "No seed phrase needed")
            }
            .padding()
            .background(Color.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .shadow(color: .black.opacity(0.05), radius: 8, y: 2)
            
            // Connect Button
            Button {
                showingConnectSheet = true
            } label: {
                HStack {
                    Image(systemName: "link")
                    Text("Connect Wallet")
                }
                .font(.headline)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.brandAccent)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .padding(.top, 8)
            
            Text("Powered by Privy • Monad Testnet")
                .font(.caption)
                .foregroundStyle(Color.textSecondary)
        }
    }
    
    // MARK: - Connected Wallet Section
    
    private var connectedWalletSection: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Connected")
                    .font(.caption)
                    .foregroundStyle(Color.textSecondary)
                
                HStack(spacing: 8) {
                    Circle()
                        .fill(Color.success)
                        .frame(width: 8, height: 8)
                    
                    Text(walletState.shortAddress)
                        .font(.system(.body, design: .monospaced))
                        .foregroundStyle(Color.textPrimary)
                    
                    Button {
                        UIPasteboard.general.string = privyService.walletAddress ?? walletState.walletAddress
                        UINotificationFeedbackGenerator().notificationOccurred(.success)
                    } label: {
                        Image(systemName: "doc.on.doc")
                            .font(.caption)
                            .foregroundStyle(Color.brandAccent)
                    }
                }
            }
            
            Spacer()
            
            Menu {
                Button {
                    if let address = privyService.walletAddress ?? walletState.walletAddress,
                       let url = URL(string: "\(LifeToken.explorerUrl)/address/\(address)") {
                        UIApplication.shared.open(url)
                    }
                } label: {
                    Label("View on Explorer", systemImage: "safari")
                }
                
                Button(role: .destructive) {
                    showingDisconnectAlert = true
                } label: {
                    Label("Disconnect", systemImage: "xmark.circle")
                }
            } label: {
                Image(systemName: "ellipsis.circle")
                    .font(.title2)
                    .foregroundStyle(Color.textSecondary)
            }
        }
        .padding()
        .background(Color.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 8, y: 2)
        .onAppear {
            walletState.walletAddress = privyService.walletAddress
        }
    }
    
    // MARK: - Balance Section
    
    private var balanceSection: some View {
        VStack(spacing: 16) {
            VStack(spacing: 4) {
                Text("$NUDGE Balance")
                    .font(.caption)
                    .foregroundStyle(Color.textSecondary)
                
                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    if isRefreshing {
                        ProgressView()
                            .scaleEffect(0.8)
                    } else {
                        Text(formatBalance(walletState.lifeTokenBalance))
                            .font(.system(size: 40, weight: .bold, design: .rounded))
                            .foregroundStyle(Color.textPrimary)
                    }
                    
                    Text("NUDGE")
                        .font(.title3)
                        .fontWeight(.medium)
                        .foregroundStyle(Color.textSecondary)
                }
            }
            
            Divider()
            
            HStack {
                VStack(alignment: .center) {
                    Text("Network")
                        .font(.caption)
                        .foregroundStyle(Color.textSecondary)
                    Text(LifeToken.chainName)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(Color.textPrimary)
                }
                .frame(maxWidth: .infinity)
                
                Divider()
                    .frame(height: 40)
                
                VStack(alignment: .center) {
                    Text("Token")
                        .font(.caption)
                        .foregroundStyle(Color.textSecondary)
                    Text(LifeToken.symbol)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(Color.textPrimary)
                }
                .frame(maxWidth: .infinity)
            }
        }
        .padding()
        .background(Color.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 8, y: 2)
    }
    
    // MARK: - Rewards Section
    
    private var rewardsSection: some View {
        VStack(spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Pending Rewards")
                        .font(.caption)
                        .foregroundStyle(Color.textSecondary)
                    
                    HStack(alignment: .firstTextBaseline, spacing: 4) {
                        Text(formatBalance(walletState.pendingRewards))
                            .font(.title)
                            .fontWeight(.bold)
                            .foregroundStyle(Color.brandAccent)
                        
                        Text("NUDGE")
                            .font(.subheadline)
                            .foregroundStyle(Color.textSecondary)
                    }
                }
                
                Spacer()
                
                Image(systemName: "gift.fill")
                    .font(.title)
                    .foregroundStyle(Color.brandAccent.opacity(0.5))
            }
            
            // XP Redemption Link
            NavigationLink {
                XPRedemptionView()
                    .environment(appState)
                    .environmentObject(privyService)
            } label: {
                HStack {
                    Image(systemName: "arrow.triangle.2.circlepath")
                    Text("Redeem XP for $NUDGE")
                }
                .font(.headline)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.brandAccent)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            
            Button {
                showingClaimConfirmation = true
            } label: {
                HStack {
                    if isClaiming {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Image(systemName: "arrow.down.circle")
                        Text("Claim Pending Rewards")
                    }
                }
                .font(.subheadline)
                .foregroundStyle(hasPendingRewards ? Color.brandAccent : Color.textSecondary)
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.cardBackground)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(hasPendingRewards ? Color.brandAccent : Color.gray.opacity(0.3), lineWidth: 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .disabled(!hasPendingRewards || isClaiming)
            
            // Earnings info
            VStack(alignment: .leading, spacing: 8) {
                Text("How to earn $NUDGE")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(Color.textSecondary)
                
                HStack {
                    EarningItem(icon: "checkmark.circle", label: "Daily Check-in", amount: "+10")
                    Spacer()
                    EarningItem(icon: "flame.fill", label: "7-Day Streak", amount: "+50")
                    Spacer()
                    EarningItem(icon: "target", label: "Goal Complete", amount: "+25")
                }
            }
            .padding(.top, 8)
        }
        .padding()
        .background(Color.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 8, y: 2)
    }
    
    // MARK: - Transaction History Section
    
    private var transactionHistorySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Recent Activity")
                    .font(.headline)
                    .foregroundStyle(Color.textPrimary)
                
                Spacer()
                
                if !walletState.transactions.isEmpty {
                    NavigationLink {
                        TransactionHistoryView(walletState: walletState)
                    } label: {
                        Text("See All")
                            .font(.subheadline)
                            .foregroundStyle(Color.brandAccent)
                    }
                }
            }
            
            if walletState.transactions.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "clock.arrow.circlepath")
                        .font(.title)
                        .foregroundStyle(Color.textSecondary.opacity(0.5))
                    
                    Text("No transactions yet")
                        .font(.subheadline)
                        .foregroundStyle(Color.textSecondary)
                    
                    Text("Complete check-ins to earn rewards")
                        .font(.caption)
                        .foregroundStyle(Color.textSecondary.opacity(0.8))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 20)
            } else {
                ForEach(walletState.transactions.prefix(5)) { transaction in
                    TransactionRow(transaction: transaction)
                    
                    if transaction.id != walletState.transactions.prefix(5).last?.id {
                        Divider()
                    }
                }
            }
        }
        .padding()
        .background(Color.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 8, y: 2)
    }
    
    // MARK: - Computed Properties
    
    private var hasPendingRewards: Bool {
        guard let value = Double(walletState.pendingRewards) else { return false }
        return value > 0
    }
    
    // MARK: - Actions
    
    private func refreshWalletData() async {
        guard let address = privyService.walletAddress ?? walletState.walletAddress else { return }
        
        isRefreshing = true
        defer { isRefreshing = false }
        
        await walletService.updateBaseURL(appState.apiEndpoint)
        await walletService.updateApiKey(appState.apiKey)
        
        do {
            // Fetch balance
            let balanceResponse = try await walletService.fetchBalance(address: address)
            await MainActor.run {
                walletState.lifeTokenBalance = balanceResponse.balance
                walletState.pendingRewards = balanceResponse.pendingRewards
            }
            
            // Fetch transaction history
            let historyResponse = try await walletService.fetchTransactionHistory(address: address)
            await MainActor.run {
                walletState.transactions = historyResponse.transactions
            }
        } catch {
            AppLogger.error("Failed to refresh wallet data", error: error)
        }
    }
    
    private func claimRewards() async {
        guard let address = privyService.walletAddress ?? walletState.walletAddress else { return }
        
        isClaiming = true
        defer { isClaiming = false }
        
        await walletService.updateBaseURL(appState.apiEndpoint)
        await walletService.updateApiKey(appState.apiKey)
        
        do {
            // Sign a message to prove ownership (optional, depending on backend)
            // let signature = try await privyService.signMessage("Claim rewards for \(address)")
            
            let response = try await walletService.claimRewards(address: address)
            
            if response.success {
                await MainActor.run {
                    claimResult = ClaimResult(
                        success: true,
                        amount: response.amount ?? walletState.pendingRewards,
                        message: response.message ?? "Rewards claimed successfully!"
                    )
                    walletState.pendingRewards = "0"
                    UINotificationFeedbackGenerator().notificationOccurred(.success)
                }
                
                // Refresh data
                await refreshWalletData()
            } else {
                await MainActor.run {
                    claimResult = ClaimResult(
                        success: false,
                        amount: "0",
                        message: response.error ?? "Failed to claim rewards"
                    )
                    UINotificationFeedbackGenerator().notificationOccurred(.error)
                }
            }
        } catch {
            await MainActor.run {
                claimResult = ClaimResult(
                    success: false,
                    amount: "0",
                    message: error.localizedDescription
                )
                UINotificationFeedbackGenerator().notificationOccurred(.error)
            }
        }
    }
    
    private func disconnectWallet() async {
        await privyService.logout()
        walletState.clear()
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }
    
    // MARK: - Helpers
    
    private func formatBalance(_ balance: String) -> String {
        guard let value = Double(balance) else { return balance }
        
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.minimumFractionDigits = 0
        formatter.maximumFractionDigits = 2
        
        return formatter.string(from: NSNumber(value: value)) ?? balance
    }
}

// MARK: - Supporting Views

struct FeatureItem: View {
    let icon: String
    let text: String
    
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.body)
                .foregroundStyle(Color.brandAccent)
                .frame(width: 24)
            
            Text(text)
                .font(.subheadline)
                .foregroundStyle(Color.textPrimary)
        }
    }
}

struct EarningItem: View {
    let icon: String
    let label: String
    let amount: String
    
    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.body)
                .foregroundStyle(Color.brandAccent)
            
            Text(label)
                .font(.caption2)
                .foregroundStyle(Color.textSecondary)
            
            Text(amount)
                .font(.caption)
                .fontWeight(.bold)
                .foregroundStyle(Color.success)
        }
    }
}

struct TransactionRow: View {
    let transaction: WalletTransaction
    
    var body: some View {
        HStack {
            Image(systemName: transaction.typeIcon)
                .font(.title3)
                .foregroundStyle(transaction.statusColor)
                .frame(width: 32)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(transaction.type.rawValue.capitalized)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(Color.textPrimary)
                
                Text(transaction.formattedDate)
                    .font(.caption)
                    .foregroundStyle(Color.textSecondary)
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 2) {
                Text("+\(transaction.amount)")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(Color.success)
                
                Text(transaction.status.rawValue.capitalized)
                    .font(.caption)
                    .foregroundStyle(transaction.statusColor)
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Claim Result
struct ClaimResult {
    let success: Bool
    let amount: String
    let message: String
}

struct ClaimResultOverlay: View {
    let result: ClaimResult
    let onDismiss: () -> Void
    
    var body: some View {
        ZStack {
            Color.black.opacity(0.4)
                .ignoresSafeArea()
                .onTapGesture {
                    onDismiss()
                }
            
            VStack(spacing: 20) {
                Image(systemName: result.success ? "checkmark.circle.fill" : "xmark.circle.fill")
                    .font(.system(size: 60))
                    .foregroundStyle(result.success ? Color.success : Color.danger)
                
                if result.success {
                    VStack(spacing: 4) {
                        Text("Claimed!")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundStyle(Color.textPrimary)
                        
                        Text("+\(result.amount) NUDGE")
                            .font(.title)
                            .fontWeight(.bold)
                            .foregroundStyle(Color.success)
                    }
                } else {
                    Text("Claim Failed")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundStyle(Color.textPrimary)
                }
                
                Text(result.message)
                    .font(.subheadline)
                    .foregroundStyle(Color.textSecondary)
                    .multilineTextAlignment(.center)
                
                Button {
                    onDismiss()
                } label: {
                    Text("OK")
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
    }
}

// MARK: - Connect Wallet Sheet

struct ConnectWalletSheet: View {
    @ObservedObject var privyService: PrivyService
    @Binding var walletState: WalletState
    @Environment(\.dismiss) private var dismiss
    @State private var email = ""
    @State private var showingEmailLogin = false
    @State private var showingOtpEntry = false
    @State private var otpCode = ""
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                // Logo/Icon
                Image(systemName: "wallet.bifold.fill")
                    .font(.system(size: 50))
                    .foregroundStyle(Color.brandAccent)
                    .padding(.top, 20)
                
                Text("Connect Wallet")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundStyle(Color.textPrimary)
                
                Text("Sign in to create your embedded wallet")
                    .font(.body)
                    .foregroundStyle(Color.textSecondary)
                    .multilineTextAlignment(.center)
                
                Spacer()
                
                // Sign in options
                VStack(spacing: 12) {
                    // Sign in with Apple
                    Button {
                        Task {
                            try? await privyService.loginWithApple()
                            if privyService.isAuthenticated {
                                walletState.isConnected = true
                                walletState.walletAddress = privyService.walletAddress
                                walletState.save()
                                dismiss()
                            }
                        }
                    } label: {
                        HStack {
                            Image(systemName: "apple.logo")
                            Text("Continue with Apple")
                        }
                        .font(.headline)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.black)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    
                    // Email login
                    Button {
                        showingEmailLogin = true
                    } label: {
                        HStack {
                            Image(systemName: "envelope.fill")
                            Text("Continue with Email")
                        }
                        .font(.headline)
                        .foregroundStyle(Color.textPrimary)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.inputBackground)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                }
                
                if showingEmailLogin {
                    VStack(spacing: 12) {
                        if showingOtpEntry {
                            // OTP Code Entry
                            Text("Enter the code sent to \(email)")
                                .font(.subheadline)
                                .foregroundStyle(Color.textSecondary)
                            
                            TextField("6-digit code", text: $otpCode)
                                .textContentType(.oneTimeCode)
                                .keyboardType(.numberPad)
                                .multilineTextAlignment(.center)
                                .font(.title2.monospaced())
                                .padding()
                                .background(Color.inputBackground)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                            
                            Button {
                                Task {
                                    try? await privyService.verifyEmailCode(otpCode)
                                    if privyService.isAuthenticated {
                                        walletState.isConnected = true
                                        walletState.walletAddress = privyService.walletAddress
                                        walletState.save()
                                        dismiss()
                                    }
                                }
                            } label: {
                                HStack {
                                    if privyService.isLoading {
                                        ProgressView()
                                            .tint(.white)
                                    } else {
                                        Text("Verify Code")
                                    }
                                }
                                .font(.headline)
                                .foregroundStyle(.white)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(otpCode.count < 6 ? Color.gray : Color.brandAccent)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                            }
                            .disabled(otpCode.count < 6 || privyService.isLoading)
                            
                            Button("Use different email") {
                                showingOtpEntry = false
                                otpCode = ""
                            }
                            .font(.subheadline)
                            .foregroundStyle(Color.brandAccent)
                        } else {
                            // Email Entry
                            TextField("Email address", text: $email)
                                .textContentType(.emailAddress)
                                .keyboardType(.emailAddress)
                                .autocapitalization(.none)
                                .padding()
                                .background(Color.inputBackground)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                            
                            Button {
                                Task {
                                    try? await privyService.loginWithEmail(email)
                                    // Show OTP entry after email is sent
                                    if privyService.error == nil {
                                        withAnimation {
                                            showingOtpEntry = true
                                        }
                                    }
                                }
                            } label: {
                                HStack {
                                    if privyService.isLoading {
                                        ProgressView()
                                            .tint(.white)
                                    } else {
                                        Text("Send Code")
                                    }
                                }
                                .font(.headline)
                                .foregroundStyle(.white)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(email.isEmpty ? Color.gray : Color.brandAccent)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                            }
                            .disabled(email.isEmpty || privyService.isLoading)
                        }
                    }
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                }
                
                if let error = privyService.error {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(Color.danger)
                }
                
                Spacer()
                
                // Privacy note
                Text("By connecting, you agree to our Terms of Service")
                    .font(.caption)
                    .foregroundStyle(Color.textSecondary)
                    .multilineTextAlignment(.center)
            }
            .padding()
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
            .animation(.easeInOut, value: showingEmailLogin)
        }
        .presentationDetents([.medium, .large])
    }
}

// MARK: - Transaction History View

struct TransactionHistoryView: View {
    let walletState: WalletState
    
    var body: some View {
        List {
            ForEach(walletState.transactions) { transaction in
                TransactionRow(transaction: transaction)
            }
        }
        .listStyle(.plain)
        .navigationTitle("Transaction History")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Preview

#Preview {
    WalletView()
        .environment(AppState())
        .environmentObject(PrivyService.shared)
}
