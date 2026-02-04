//
//  ContentView.swift
//  LifeLog
//
//  Created by Joshua Rich on 2026-02-02.
//

import SwiftUI

struct ContentView: View {
    @Environment(AppState.self) private var appState
    @EnvironmentObject private var privyService: PrivyService
    @State private var selectedTab: Tab = ContentView.initialTab()
    
    enum Tab: String {
        case checkIn = "checkin"
        case wellness = "wellness"
        case agents = "agents"
        case timeline = "timeline"
        case settings = "settings"
    }
    
    static func initialTab() -> Tab {
        // Check for -tab argument in launch arguments
        let args = ProcessInfo.processInfo.arguments
        if let tabIndex = args.firstIndex(of: "-tab"),
           tabIndex + 1 < args.count,
           let tab = Tab(rawValue: args[tabIndex + 1]) {
            return tab
        }
        return .checkIn
    }
    
    var body: some View {
        TabView(selection: $selectedTab) {
            CheckInView()
                .tabItem {
                    Label("Check In", systemImage: "square.and.pencil")
                }
                .tag(Tab.checkIn)
            
            WellnessView()
                .tabItem {
                    Label("Wellness", systemImage: "leaf.fill")
                }
                .tag(Tab.wellness)
            
            AgentsView()
                .environmentObject(privyService)
                .tabItem {
                    Label("Agents", systemImage: "person.3.fill")
                }
                .tag(Tab.agents)
            
            TimelineView()
                .tabItem {
                    Label("Timeline", systemImage: "calendar.day.timeline.left")
                }
                .tag(Tab.timeline)
            
            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gear")
                }
                .tag(Tab.settings)
        }
        .tint(Color.brandInteractive)
        .onOpenURL { url in
            // Handle Privy OAuth callbacks
            if url.scheme == "nudge" {
                Task {
                    await privyService.handleCallback(url: url)
                }
                return
            }
            
            // Handle deep links for tab navigation
            if url.scheme == "lifelog" {
                switch url.host {
                case "checkin": selectedTab = .checkIn
                case "wellness": selectedTab = .wellness
                case "agents": selectedTab = .agents
                case "timeline": selectedTab = .timeline
                case "settings": selectedTab = .settings
                default: break
                }
            }
        }
    }
}

#Preview {
    ContentView()
        .environment(AppState())
        .environmentObject(PrivyService.preview)
}
