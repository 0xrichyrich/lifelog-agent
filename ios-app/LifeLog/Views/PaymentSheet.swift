//
//  PaymentSheet.swift
//  LifeLog
//
//  Payment modal for x402 micropayments to AI agents
//  Uses Privy embedded wallet to sign transactions
//

import SwiftUI

struct PaymentSheet: View {
    let agent: Agent
    let paymentRequest: PaymentRequest
    let onPaymentComplete: (PaymentProof) -> Void
    let onCancel: () -> Void
    
    @EnvironmentObject private var privyService: PrivyService
    @State private var isProcessing = false
    @State private var error: String?
    @State private var showWalletNeeded = false
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                // Agent info
                agentHeader
                
                // Payment details
                paymentDetails
                
                Spacer()
                
                // Error message
                if let error = error {
                    errorBanner(error)
                }
                
                // Action buttons
                actionButtons
            }
            .padding()
            .background(Color.background)
            .navigationTitle("Payment Required")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        onCancel()
                    }
                    .foregroundStyle(Color.textSecondary)
                }
            }
            .alert("Wallet Required", isPresented: $showWalletNeeded) {
                Button("OK") {}
            } message: {
                Text("Please connect your wallet in Settings to make payments.")
            }
        }
    }
    
    // MARK: - Agent Header
    
    private var agentHeader: some View {
        VStack(spacing: 12) {
            Text(agent.icon)
                .font(.system(size: 56))
            
            Text(agent.name)
                .font(.title2)
                .fontWeight(.semibold)
                .foregroundStyle(Color.textPrimary)
            
            Text("wants to process your message")
                .font(.subheadline)
                .foregroundStyle(Color.textSecondary)
        }
    }
    
    // MARK: - Payment Details
    
    private var paymentDetails: some View {
        VStack(spacing: 16) {
            // Amount
            VStack(spacing: 4) {
                Text(paymentRequest.priceDisplay)
                    .font(.system(size: 48, weight: .bold, design: .rounded))
                    .foregroundStyle(Color.brandInteractive)
                
                Text("USDC")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(Color.textSecondary)
            }
            
            // Details card
            VStack(spacing: 12) {
                PaymentDetailRow(label: "Agent", value: agent.name)
                PaymentDetailRow(label: "Price", value: paymentRequest.priceDisplay)
                PaymentDetailRow(label: "Network", value: "Base")
                
                if let walletAddress = privyService.walletAddress {
                    PaymentDetailRow(
                        label: "From",
                        value: formatAddress(walletAddress)
                    )
                }
            }
            .padding()
            .background(Color.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }
    
    // MARK: - Error Banner
    
    private func errorBanner(_ message: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(Color.danger)
            
            Text(message)
                .font(.caption)
                .foregroundStyle(Color.danger)
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(Color.danger.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
    
    // MARK: - Action Buttons
    
    private var actionButtons: some View {
        VStack(spacing: 12) {
            // Pay button
            Button {
                processPayment()
            } label: {
                HStack {
                    if isProcessing {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            .scaleEffect(0.8)
                    } else {
                        Image(systemName: "creditcard.fill")
                    }
                    
                    Text(isProcessing ? "Processing..." : "Pay \(paymentRequest.priceDisplay)")
                        .fontWeight(.semibold)
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(
                    privyService.isAuthenticated
                    ? Color.brandInteractive
                    : Color.gray
                )
                .foregroundStyle(.white)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .disabled(!privyService.isAuthenticated || isProcessing)
            
            // Connect wallet prompt
            if !privyService.isAuthenticated {
                Text("Connect your wallet in Settings to enable payments")
                    .font(.caption)
                    .foregroundStyle(Color.textSecondary)
                    .multilineTextAlignment(.center)
            }
            
            // Secure payment note
            HStack(spacing: 4) {
                Image(systemName: "lock.fill")
                    .font(.caption2)
                Text("Secured by Privy")
                    .font(.caption2)
            }
            .foregroundStyle(Color.textSecondary)
        }
    }
    
    // MARK: - Process Payment
    
    private func processPayment() {
        guard privyService.isAuthenticated else {
            showWalletNeeded = true
            return
        }
        
        isProcessing = true
        error = nil
        
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        
        Task {
            do {
                // Create the message to sign
                let message = createPaymentMessage()
                
                // Sign with Privy wallet
                let signature = try await privyService.signMessage(message)
                
                // Create payment proof
                let proof = PaymentProof(
                    signature: signature,
                    paymentId: paymentRequest.nonce,
                    timestamp: ISO8601DateFormatter().string(from: Date()),
                    chain: "base",
                    txHash: nil
                )
                
                await MainActor.run {
                    isProcessing = false
                    UINotificationFeedbackGenerator().notificationOccurred(.success)
                    onPaymentComplete(proof)
                }
                
            } catch {
                await MainActor.run {
                    self.error = error.localizedDescription
                    isProcessing = false
                    UINotificationFeedbackGenerator().notificationOccurred(.error)
                }
            }
        }
    }
    
    /// Create the message to sign for payment authorization
    private func createPaymentMessage() -> String {
        """
        x402 Payment Authorization
        
        Agent: \(agent.name)
        Amount: \(paymentRequest.priceDisplay) USDC
        Recipient: \(paymentRequest.recipient)
        Nonce: \(paymentRequest.nonce)
        Expires: \(paymentRequest.expiresAt)
        """
    }
    
    /// Format wallet address for display
    private func formatAddress(_ address: String) -> String {
        guard address.count > 10 else { return address }
        let prefix = String(address.prefix(6))
        let suffix = String(address.suffix(4))
        return "\(prefix)...\(suffix)"
    }
}

// MARK: - Payment Detail Row

struct PaymentDetailRow: View {
    let label: String
    let value: String
    
    var body: some View {
        HStack {
            Text(label)
                .font(.subheadline)
                .foregroundStyle(Color.textSecondary)
            
            Spacer()
            
            Text(value)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(Color.textPrimary)
        }
    }
}

// MARK: - Preview

#Preview {
    PaymentSheet(
        agent: Agent.mockAgents[1],
        paymentRequest: PaymentRequest(
            agentId: "coffee-scout",
            amount: 10000,
            currency: "USDC",
            recipient: "0x1234567890abcdef1234567890abcdef12345678",
            description: "Message to Coffee Scout",
            expiresAt: ISO8601DateFormatter().string(from: Date().addingTimeInterval(3600)),
            nonce: UUID().uuidString
        ),
        onPaymentComplete: { _ in },
        onCancel: {}
    )
    .environmentObject(PrivyService.preview)
}
