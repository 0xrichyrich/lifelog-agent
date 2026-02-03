//
//  ContentView.swift
//  LifeLog
//
//  Created by Joshua Rich on 2026-02-02.
//

import SwiftUI

struct ContentView: View {
    @Environment(AppState.self) private var appState
    @State private var selectedTab: Tab = .checkIn
    
    enum Tab {
        case checkIn
        case timeline
        case goals
        case settings
    }
    
    var body: some View {
        TabView(selection: $selectedTab) {
            CheckInView()
                .tabItem {
                    Label("Check In", systemImage: "square.and.pencil")
                }
                .tag(Tab.checkIn)
            
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
        .tint(Color.accent)
        .onOpenURL { url in
            // Handle deep links for notifications
            if url.scheme == "lifelog" && url.host == "checkin" {
                selectedTab = .checkIn
            }
        }
    }
}

#Preview {
    ContentView()
        .environment(AppState())
}
