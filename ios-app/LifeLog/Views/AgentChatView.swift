//
//  AgentChatView.swift
//  LifeLog
//
//  Chat interface for talking to a specific AI agent
//  Handles x402 micropayment flows for paid agents
//

import SwiftUI

struct AgentChatView: View {
    let agent: Agent
    
    @StateObject private var viewModel: AgentChatViewModel
    @EnvironmentObject private var privyService: PrivyService
    @FocusState private var isInputFocused: Bool
    
    @State private var showPaymentSheet = false
    @State private var pendingPaymentRequest: PaymentRequest?
    @State private var pendingMessage: String?
    
    init(agent: Agent) {
        self.agent = agent
        _viewModel = StateObject(wrappedValue: AgentChatViewModel(agent: agent))
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Messages list
            messagesView
            
            // Input area
            inputArea
        }
        .background(Color.background)
        .navigationTitle(agent.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                HStack(spacing: 8) {
                    Text(agent.icon)
                        .font(.title3)
                    Text(agent.name)
                        .fontWeight(.semibold)
                }
            }
            
            ToolbarItem(placement: .topBarTrailing) {
                Text(agent.priceDisplay)
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundStyle(.white)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(
                        RoundedRectangle(cornerRadius: 8)
                            .fill(agent.isFree ? Color.success : Color.brandAccent)
                    )
            }
        }
        .sheet(isPresented: $showPaymentSheet) {
            if let request = pendingPaymentRequest {
                PaymentSheet(
                    agent: agent,
                    paymentRequest: request,
                    onPaymentComplete: { proof in
                        showPaymentSheet = false
                        // Retry the message with payment proof
                        if let message = pendingMessage {
                            Task {
                                await viewModel.sendMessage(message, paymentProof: proof)
                            }
                        }
                        pendingPaymentRequest = nil
                        pendingMessage = nil
                    },
                    onCancel: {
                        showPaymentSheet = false
                        pendingPaymentRequest = nil
                        pendingMessage = nil
                    }
                )
                .presentationDetents([.medium])
            }
        }
        .onAppear {
            viewModel.setPrivyService(privyService)
        }
    }
    
    // MARK: - Messages View
    
    private var messagesView: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 12) {
                    // Welcome message if no messages yet
                    if viewModel.messages.isEmpty && !viewModel.isLoading {
                        welcomeMessage
                    }
                    
                    ForEach(viewModel.messages) { message in
                        MessageBubble(message: message, agentIcon: agent.icon)
                            .id(message.id)
                    }
                    
                    // Typing indicator
                    if viewModel.isLoading {
                        TypingIndicator(agentIcon: agent.icon)
                            .id("typing")
                    }
                }
                .padding()
            }
            .onChange(of: viewModel.messages.count) { _, _ in
                scrollToBottom(proxy: proxy)
            }
            .onChange(of: viewModel.isLoading) { _, _ in
                scrollToBottom(proxy: proxy)
            }
        }
    }
    
    private func scrollToBottom(proxy: ScrollViewProxy) {
        withAnimation(.easeOut(duration: 0.2)) {
            if viewModel.isLoading {
                proxy.scrollTo("typing", anchor: .bottom)
            } else if let lastMessage = viewModel.messages.last {
                proxy.scrollTo(lastMessage.id, anchor: .bottom)
            }
        }
    }
    
    // MARK: - Welcome Message
    
    private var welcomeMessage: some View {
        VStack(spacing: 16) {
            Text(agent.icon)
                .font(.system(size: 64))
            
            Text("Hi! I'm \(agent.name)")
                .font(.title2)
                .fontWeight(.semibold)
                .foregroundStyle(Color.textPrimary)
            
            Text(agent.personality)
                .font(.subheadline)
                .foregroundStyle(Color.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
            
            if !agent.isFree {
                HStack(spacing: 4) {
                    Image(systemName: "creditcard")
                        .font(.caption)
                    Text(agent.priceDisplay)
                        .font(.caption)
                        .fontWeight(.medium)
                }
                .foregroundStyle(Color.brandInteractive)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(Color.mintLight)
                .clipShape(Capsule())
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }
    
    // MARK: - Input Area
    
    private var inputArea: some View {
        VStack(spacing: 0) {
            Divider()
            
            HStack(spacing: 12) {
                TextField("Message \(agent.name)...", text: $viewModel.inputText, axis: .vertical)
                    .textFieldStyle(.plain)
                    .lineLimit(1...5)
                    .focused($isInputFocused)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    .background(Color.inputBackground)
                    .clipShape(RoundedRectangle(cornerRadius: 20))
                
                // Send button
                Button {
                    sendMessage()
                } label: {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.system(size: 32))
                        .foregroundStyle(
                            viewModel.inputText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                            ? Color.gray
                            : Color.brandInteractive
                        )
                }
                .disabled(viewModel.inputText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || viewModel.isLoading)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(Color.cardBackground)
        }
    }
    
    // MARK: - Send Message
    
    private func sendMessage() {
        let message = viewModel.inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !message.isEmpty else { return }
        
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        
        Task {
            do {
                try await viewModel.sendMessageWithPaymentHandling(message)
            } catch let error as AgentServiceError {
                if case .paymentRequired(let request) = error {
                    // Show payment sheet
                    pendingMessage = message
                    pendingPaymentRequest = request
                    showPaymentSheet = true
                }
            } catch {
                // Other errors handled by view model
            }
        }
    }
}

// MARK: - Message Bubble

struct MessageBubble: View {
    let message: ChatMessage
    let agentIcon: String
    
    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            if message.isUser {
                Spacer(minLength: 60)
            } else {
                // Agent avatar
                Text(agentIcon)
                    .font(.title3)
                    .frame(width: 32, height: 32)
                    .background(Color.mintLight)
                    .clipShape(Circle())
            }
            
            VStack(alignment: message.isUser ? .trailing : .leading, spacing: 4) {
                Text(message.content)
                    .font(.body)
                    .foregroundStyle(message.isUser ? Color.white : Color.textPrimary)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(
                        message.isUser
                        ? Color.brandInteractive
                        : Color.cardBackground
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 18))
                
                Text(formatTime(message.timestamp))
                    .font(.caption2)
                    .foregroundStyle(Color.textSecondary)
            }
            
            if !message.isUser {
                Spacer(minLength: 60)
            }
        }
    }
    
    private func formatTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

// MARK: - Typing Indicator

struct TypingIndicator: View {
    let agentIcon: String
    
    @State private var animating = false
    
    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            Text(agentIcon)
                .font(.title3)
                .frame(width: 32, height: 32)
                .background(Color.mintLight)
                .clipShape(Circle())
            
            HStack(spacing: 4) {
                ForEach(0..<3, id: \.self) { index in
                    Circle()
                        .fill(Color.textSecondary)
                        .frame(width: 8, height: 8)
                        .scaleEffect(animating ? 1.0 : 0.5)
                        .animation(
                            Animation.easeInOut(duration: 0.4)
                                .repeatForever(autoreverses: true)
                                .delay(Double(index) * 0.15),
                            value: animating
                        )
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(Color.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 18))
            
            Spacer(minLength: 60)
        }
        .onAppear {
            animating = true
        }
    }
}

// MARK: - View Model

@MainActor
class AgentChatViewModel: ObservableObject {
    let agent: Agent
    
    @Published var messages: [ChatMessage] = []
    @Published var inputText = ""
    @Published var isLoading = false
    @Published var error: String?
    
    private let agentService = AgentService.shared
    private var conversationId: String?
    private var privyService: PrivyService?
    
    init(agent: Agent) {
        self.agent = agent
    }
    
    func setPrivyService(_ service: PrivyService) {
        self.privyService = service
    }
    
    private var userId: String {
        privyService?.userId ?? "anonymous"
    }
    
    /// Send message with automatic payment handling
    func sendMessageWithPaymentHandling(_ message: String) async throws {
        // Add user message to UI immediately
        let userMessage = ChatMessage(content: message, isUser: true)
        messages.append(userMessage)
        inputText = ""
        
        isLoading = true
        
        do {
            let (response, convId) = try await agentService.sendMessage(
                agentId: agent.id,
                message: message,
                userId: userId,
                conversationId: conversationId
            )
            
            conversationId = convId
            
            // Add agent response
            let agentMessage = ChatMessage(
                content: response,
                isUser: false,
                agentId: agent.id
            )
            messages.append(agentMessage)
            
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            
        } catch let error as AgentServiceError {
            if case .paymentRequired = error {
                // Remove the user message since we need payment
                if messages.last?.isUser == true {
                    messages.removeLast()
                }
                throw error
            }
            
            self.error = error.localizedDescription
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            
        } catch {
            self.error = error.localizedDescription
            UINotificationFeedbackGenerator().notificationOccurred(.error)
        }
        
        isLoading = false
    }
    
    /// Send message with payment proof (after payment is complete)
    func sendMessage(_ message: String, paymentProof: PaymentProof) async {
        // Add user message to UI
        let userMessage = ChatMessage(content: message, isUser: true)
        messages.append(userMessage)
        inputText = ""
        
        isLoading = true
        
        do {
            let (response, convId) = try await agentService.sendMessage(
                agentId: agent.id,
                message: message,
                userId: userId,
                conversationId: conversationId,
                paymentProof: paymentProof
            )
            
            conversationId = convId
            
            // Add agent response
            let agentMessage = ChatMessage(
                content: response,
                isUser: false,
                agentId: agent.id
            )
            messages.append(agentMessage)
            
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            
        } catch {
            self.error = error.localizedDescription
            UINotificationFeedbackGenerator().notificationOccurred(.error)
        }
        
        isLoading = false
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        AgentChatView(agent: Agent.mockAgents[0])
            .environmentObject(PrivyService.preview)
    }
}
