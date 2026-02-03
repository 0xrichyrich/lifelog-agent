'use client';

import { useState } from 'react';
import { TimeBlock, ParsedActivity } from '@/lib/types';
import { getCategoryColor } from '@/lib/mock-data';
import { Clock, Monitor, Mic, Camera } from 'lucide-react';

interface TimelineProps {
  blocks: TimeBlock[];
}

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

function ActivityDetails({ activity }: { activity: ParsedActivity }) {
  const metadata = activity.metadata as Record<string, string | number | boolean>;
  
  return (
    <div className="p-3 bg-surface rounded-lg border border-surface-light">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium capitalize">{activity.type.replace('_', ' ')}</span>
        {activity.duration && (
          <span className="text-xs text-text-muted">
            {Math.round(activity.duration / 60)}min
          </span>
        )}
      </div>
      {Object.keys(metadata).length > 0 && (
        <div className="text-xs text-text-muted space-y-1">
          {metadata.app && <p>📱 {String(metadata.app)}</p>}
          {metadata.project && <p>📁 {String(metadata.project)}</p>}
          {metadata.meeting && <p>📅 {String(metadata.meeting)}</p>}
          {metadata.activity && <p>☕ {String(metadata.activity)}</p>}
        </div>
      )}
    </div>
  );
}

export default function Timeline({ blocks }: TimelineProps) {
  const [expandedHour, setExpandedHour] = useState<number | null>(null);
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-success" />
          <span className="text-sm text-text-muted">Deep Work</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-warning" />
          <span className="text-sm text-text-muted">Meetings</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-danger" />
          <span className="text-sm text-text-muted">Distractions</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-500" />
          <span className="text-sm text-text-muted">Breaks</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-1">
        {blocks.map((block) => {
          const isExpanded = expandedHour === block.hour;
          const isHovered = hoveredHour === block.hour;
          const hasActivities = block.activities.length > 0;
          
          return (
            <div key={block.hour} className="group">
              <div 
                className={`flex items-center gap-4 p-3 rounded-lg transition-all cursor-pointer ${
                  isExpanded ? 'bg-surface-light' : 'hover:bg-surface'
                }`}
                onClick={() => setExpandedHour(isExpanded ? null : block.hour)}
                onMouseEnter={() => setHoveredHour(block.hour)}
                onMouseLeave={() => setHoveredHour(null)}
              >
                {/* Hour label */}
                <div className="w-16 text-sm text-text-muted font-mono">
                  {formatHour(block.hour)}
                </div>
                
                {/* Activity bar */}
                <div className="flex-1 h-10 bg-surface-light rounded-lg overflow-hidden relative">
                  {hasActivities ? (
                    <div
                      className={`h-full ${getCategoryColor(block.dominantCategory)} transition-all duration-300`}
                      style={{ width: `${Math.min(100, (block.totalMinutes / 60) * 100)}%` }}
                    />
                  ) : (
                    <div className="h-full bg-gray-800" />
                  )}
                  
                  {/* Hover tooltip */}
                  {isHovered && hasActivities && !isExpanded && (
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-10 bg-background border border-surface-light rounded-lg p-2 shadow-lg min-w-48">
                      <p className="text-sm font-medium">{block.activities.length} activit{block.activities.length === 1 ? 'y' : 'ies'}</p>
                      <p className="text-xs text-text-muted">{Math.round(block.totalMinutes)} minutes logged</p>
                    </div>
                  )}
                </div>
                
                {/* Activity count badge */}
                {hasActivities && (
                  <div className="flex items-center gap-2 text-text-muted">
                    <span className="text-xs bg-surface-light px-2 py-1 rounded">
                      {block.activities.length}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Expanded details */}
              {isExpanded && hasActivities && (
                <div className="ml-20 mt-2 mb-4 space-y-2">
                  {block.activities.map((activity, idx) => (
                    <ActivityDetails key={idx} activity={activity} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
