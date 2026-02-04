//
//  ContentView.swift
//  LifeLog
//
//  Created by Joshua Rich on 2026-02-02.
//

import SwiftUI

struct ContentView: View {
    @Environment(AppState.self) private var appState
    @State private var selectedTab: Tab = ContentView.initialTab()
    
    enum Tab: String {
        case checkIn = "checkin"
        case wellness = "wellness"
        case timeline = "timeline"
        case goals = "goals"
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
            
            TimelineView()
                .tabItem {
                    Label("Timeline", systemImage: "calendar.day.timeline.left")
                }
                .tag(Tab.timeline)
            
            GoalsView()
                .tabItem {
                    Label("Goals", systemImage: "target")
                }
                .tag(Tab.goals)
            
            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gear")
                }
                .tag(Tab.settings)
        }
        .tint(Color.brandInteractive)
        .onOpenURL { url in
            // Handle deep links for tab navigation
            if url.scheme == "lifelog" {
                switch url.host {
                case "checkin": selectedTab = .checkIn
                case "wellness": selectedTab = .wellness
                case "timeline": selectedTab = .timeline
                case "goals": selectedTab = .goals
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
}
