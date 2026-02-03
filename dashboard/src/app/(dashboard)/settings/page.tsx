'use client';

import { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  Download, 
  Target,
  Trash2,
  Plus,
  Save
} from 'lucide-react';
import { mockSettings, mockGoals } from '@/lib/mock-data';
import { Settings, Goal } from '@/lib/types';

function Toggle({ 
  enabled, 
  onChange, 
  label 
}: { 
  enabled: boolean; 
  onChange: (v: boolean) => void; 
  label: string;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-text">{label}</span>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          enabled ? 'bg-accent' : 'bg-surface-light'
        }`}
      >
        <div 
          className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
            enabled ? 'left-7' : 'left-1'
          }`}
        />
      </button>
    </div>
  );
}

function Select({ 
  value, 
  onChange, 
  options, 
  label 
}: { 
  value: string; 
  onChange: (v: string) => void; 
  options: { value: string; label: string }[];
  label: string;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-text">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-surface-light border border-surface-light rounded-lg px-3 py-2 text-text focus:outline-none focus:border-accent"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(mockSettings);
  const [goals, setGoals] = useState<Goal[]>(mockGoals);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // In real app, this would save to database
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/export');
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nudge-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const deleteGoal = (id: string) => {
    setGoals(goals.filter(g => g.id !== id));
  };

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-text-muted">Configure your Nudge experience</p>
        </div>
        <button 
          onClick={handleSave}
          className={`btn ${saved ? 'bg-success' : 'btn-primary'} flex items-center gap-2`}
        >
          <Save className="w-4 h-4" />
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Goals Configuration */}
      <div className="card mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-accent/20 rounded-lg">
            <Target className="w-5 h-5 text-accent" />
          </div>
          <h2 className="text-xl font-semibold">Goals</h2>
        </div>
        
        <div className="space-y-3 mb-4">
          {goals.map((goal) => (
            <div key={goal.id} className="flex items-center justify-between p-3 bg-surface-light rounded-lg">
              <div className="flex items-center gap-3">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: goal.color }}
                />
                <div>
                  <p className="font-medium">{goal.name}</p>
                  <p className="text-xs text-text-muted">{goal.target} {goal.unit} / {goal.type}</p>
                </div>
              </div>
              <button 
                onClick={() => deleteGoal(goal.id)}
                className="p-2 text-danger hover:bg-danger/20 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        
        <button className="btn btn-secondary flex items-center gap-2 w-full justify-center">
          <Plus className="w-4 h-4" />
          Add New Goal
        </button>
      </div>

      {/* Nudge Settings */}
      <div className="card mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-warning/20 rounded-lg">
            <Bell className="w-5 h-5 text-warning" />
          </div>
          <h2 className="text-xl font-semibold">Notifications</h2>
        </div>
        
        <Select
          label="Nudge Frequency"
          value={settings.nudgeFrequency}
          onChange={(v) => setSettings({ ...settings, nudgeFrequency: v as Settings['nudgeFrequency'] })}
          options={[
            { value: 'off', label: 'Off' },
            { value: 'low', label: 'Low (2x/day)' },
            { value: 'medium', label: 'Medium (4x/day)' },
            { value: 'high', label: 'High (hourly)' },
          ]}
        />
      </div>

      {/* Privacy Settings */}
      <div className="card mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-success/20 rounded-lg">
            <Shield className="w-5 h-5 text-success" />
          </div>
          <h2 className="text-xl font-semibold">Privacy & Data</h2>
        </div>
        
        <Toggle
          label="Collect Screenshots"
          enabled={settings.collectScreenshots}
          onChange={(v) => setSettings({ ...settings, collectScreenshots: v })}
        />
        <Toggle
          label="Collect Audio"
          enabled={settings.collectAudio}
          onChange={(v) => setSettings({ ...settings, collectAudio: v })}
        />
        <Toggle
          label="Collect Camera Snapshots"
          enabled={settings.collectCamera}
          onChange={(v) => setSettings({ ...settings, collectCamera: v })}
        />
        <Toggle
          label="Auto-generate Daily Summary"
          enabled={settings.autoSummarize}
          onChange={(v) => setSettings({ ...settings, autoSummarize: v })}
        />
      </div>

      {/* Export */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-accent/20 rounded-lg">
            <Download className="w-5 h-5 text-accent" />
          </div>
          <h2 className="text-xl font-semibold">Export Data</h2>
        </div>
        
        <p className="text-text-muted mb-4">
          Download all your Nudge data as a JSON file. This includes activities, 
          check-ins, media metadata, and summaries.
        </p>
        
        <button 
          onClick={handleExport}
          className="btn btn-primary flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export All Data
        </button>
      </div>
    </div>
  );
}
