import { Calendar, Clock, Zap, Coffee } from 'lucide-react';
import Timeline from '@/components/Timeline';
import { mockActivities, parseActivitiesToBlocks } from '@/lib/mock-data';

// Stats card component
function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string; 
  color: string;
}) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-text-muted">{label}</p>
      </div>
    </div>
  );
}

export default function TimelinePage() {
  // Parse mock activities into timeline blocks
  const blocks = parseActivitiesToBlocks(mockActivities);
  
  // Calculate stats
  const totalFocusMinutes = mockActivities
    .filter(a => a.type === 'focus' || a.type === 'coding')
    .reduce((sum, a) => sum + ((a.duration || 0) / 60), 0);
  
  const totalMeetingMinutes = mockActivities
    .filter(a => a.type === 'meeting')
    .reduce((sum, a) => sum + ((a.duration || 0) / 60), 0);
  
  const totalDistractionMinutes = mockActivities
    .filter(a => a.type === 'social_media')
    .reduce((sum, a) => sum + ((a.duration || 0) / 60), 0);
  
  const totalBreakMinutes = mockActivities
    .filter(a => a.type === 'break')
    .reduce((sum, a) => sum + ((a.duration || 0) / 60), 0);

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Today&apos;s Timeline</h1>
        <p className="text-text-muted flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          {today}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard 
          icon={Zap} 
          label="Focus Time" 
          value={`${Math.round(totalFocusMinutes / 60)}h ${Math.round(totalFocusMinutes % 60)}m`}
          color="bg-success/20 text-success" 
        />
        <StatCard 
          icon={Clock} 
          label="Meetings" 
          value={`${Math.round(totalMeetingMinutes)}m`}
          color="bg-warning/20 text-warning" 
        />
        <StatCard 
          icon={Coffee} 
          label="Breaks" 
          value={`${Math.round(totalBreakMinutes)}m`}
          color="bg-gray-500/20 text-gray-400" 
        />
        <StatCard 
          icon={Clock} 
          label="Distractions" 
          value={`${Math.round(totalDistractionMinutes)}m`}
          color="bg-danger/20 text-danger" 
        />
      </div>

      {/* Timeline */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-6">Hour by Hour</h2>
        <Timeline blocks={blocks} />
      </div>
    </div>
  );
}
