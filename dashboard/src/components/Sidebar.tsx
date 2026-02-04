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
  Store,
  PlusCircle
} from 'lucide-react';

const navItems = [
  { href: '/timeline', label: 'Timeline', icon: Calendar },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/insights', label: 'Insights', icon: BarChart3 },
  { href: '/marketplace', label: 'Marketplace', icon: Store },
  { href: '/submit-agent', label: 'Submit Agent', icon: PlusCircle },
  { href: '/wellness', label: 'Wellness Agents', icon: Users },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-card-border p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-10">
        <div className="p-2 bg-accent/10 rounded-xl">
          <Activity className="w-6 h-6 text-accent" />
        </div>
        <h1 className="text-xl font-bold text-text">Nudge</h1>
      </div>
      
      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-accent text-white shadow-md'
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
        <div className="bg-accent/5 border border-accent/20 rounded-xl p-4">
          <p className="text-sm text-text font-medium">Phase 4 Dashboard</p>
          <p className="text-xs text-text-muted mt-1">v0.1.0</p>
        </div>
      </div>
    </aside>
  );
}
