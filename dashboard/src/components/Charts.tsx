'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { InsightData } from '@/lib/types';

interface ChartProps {
  data: InsightData;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface border border-surface-light rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-xs" style={{ color: entry.color }}>
            {entry.name}: {entry.value}min
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function ProductivityChart({ data }: { data: InsightData['dailyProductivity'] }) {
  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Daily Productivity</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="date" stroke="#a3a3a3" fontSize={12} />
            <YAxis stroke="#a3a3a3" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar 
              dataKey="focusMinutes" 
              name="Focus Time" 
              fill="#10b981" 
              radius={[4, 4, 0, 0]} 
            />
            <Bar 
              dataKey="distractionMinutes" 
              name="Distractions" 
              fill="#ef4444" 
              radius={[4, 4, 0, 0]} 
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function CategoryPieChart({ data }: { data: InsightData['categoryBreakdown'] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Time Distribution</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-surface border border-surface-light rounded-lg p-3 shadow-lg">
                      <p className="text-sm font-medium">{data.name}</p>
                      <p className="text-xs text-text-muted">
                        {data.value}min ({Math.round((data.value / total) * 100)}%)
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {data.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }} 
            />
            <span className="text-xs text-text-muted">{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WeeklyTrendChart({ data }: { data: InsightData['weeklyTrends'] }) {
  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Productivity Trend</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="week" stroke="#a3a3a3" fontSize={12} />
            <YAxis stroke="#a3a3a3" fontSize={12} domain={[0, 100]} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-surface border border-surface-light rounded-lg p-3 shadow-lg">
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-accent">
                        Productivity: {payload[0].value}%
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line 
              type="monotone" 
              dataKey="productivity" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function HeatmapChart({ data }: { data: InsightData['hourlyHeatmap'] }) {
  const maxValue = Math.max(...data.map(d => d.value));
  
  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Productivity by Hour</h3>
      <div className="grid grid-cols-12 gap-1">
        {data.slice(6, 22).map((item, index) => (
          <div key={index} className="text-center">
            <div 
              className="w-full h-10 rounded transition-all"
              style={{
                backgroundColor: item.value === 0 
                  ? '#1a1a1a'
                  : `rgba(59, 130, 246, ${0.2 + (item.value / maxValue) * 0.8})`,
              }}
              title={`${item.hour}:00 - ${item.value} minutes`}
            />
            <span className="text-xs text-text-muted mt-1 block">
              {item.hour}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-text-muted text-center mt-4">
        Showing 6 AM - 10 PM (hover for details)
      </p>
    </div>
  );
}
