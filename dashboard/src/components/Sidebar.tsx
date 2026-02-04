'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Calendar, 
  Target, 
  BarChart3, 
  Settings, 
  Activity,
  Users,
  Wallet,
  Store
} from 'lucide-react';

const navItems = [
  { href: '/timeline', label: 'Timeline', icon: Calendar },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/insights', label: 'Insights', icon: BarChart3 },
  { href: '/marketplace', label: 'Marketplace', icon: Store },
  { href: '/wellness', label: 'Wellness Agents', icon: Users },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-surface border-r border-surface-light p-6">
      <div className="flex items-center gap-3 mb-10">
        <div className="p-2 bg-accent/20 rounded-lg">
          <Activity className="w-6 h-6 text-accent" />
        </div>
        <h1 className="text-xl font-bold">Nudge</h1>
      </div>
      
      <nav className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-accent/20 text-accent'
                  : 'text-text-muted hover:bg-surface-light hover:text-text'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="absolute bottom-6 left-6 right-6">
        <div className="card bg-surface-light p-4">
          <p className="text-sm text-text-muted">Phase 4 Dashboard</p>
          <p className="text-xs text-text-muted/60 mt-1">v0.1.0</p>
        </div>
      </div>
    </aside>
  );
}
