'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { 
  Calendar, 
  Target, 
  BarChart3, 
  Settings,
  Users,
  Wallet,
  Store,
  PlusCircle
} from 'lucide-react';

const navItems = [
  // Simplified for hackathon - focus on agent submission
  { href: '/submit-agent', label: 'Add Agent', icon: PlusCircle },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
  // Shelved for now:
  // { href: '/marketplace', label: 'Marketplace', icon: Store },
  // { href: '/timeline', label: 'Timeline', icon: Calendar },
  // { href: '/goals', label: 'Goals', icon: Target },
  // { href: '/insights', label: 'Insights', icon: BarChart3 },
  // { href: '/wellness', label: 'Wellness Agents', icon: Users },
  // { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-card-border p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-10">
        <Image
          src="/mascot.png"
          alt="Nudge mascot"
          width={40}
          height={40}
          className="rounded-xl"
        />
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
    </aside>
  );
}
