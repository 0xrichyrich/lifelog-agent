/**
 * Goal Management System
 * CRUD operations for user goals with streak tracking
 */

import fs from 'fs';
import path from 'path';
import { format, parseISO, differenceInDays, startOfWeek, endOfWeek, subDays, isWithinInterval } from 'date-fns';
import { Config, DailySummaryContent, ActivityCategory } from '../types/index.js';
import { LifeLogDatabase } from '../storage/database.js';

export type GoalType = 'daily' | 'weekly' | 'streak';

export interface Goal {
  id: string;
  name: string;
  type: GoalType;
  target: number; // minutes for time-based, count for frequency-based
  frequency: 'daily' | 'weekly';
  category?: ActivityCategory; // optional: track specific category
  created: string;
  lastHit: string | null;
  currentStreak: number;
  longestStreak: number;
}

export interface GoalProgress {
  goal: Goal;
  current: number;
  target: number;
  percentage: number;
  met: boolean;
  streak: number;
  daysRemaining?: number; // for weekly goals
}

export class GoalManager {
  private config: Config;
  private db: LifeLogDatabase;
  private goalsPath: string;
  private goals: Goal[];

  constructor(config: Config, db: LifeLogDatabase) {
    this.config = config;
    this.db = db;
    this.goalsPath = path.join(process.cwd(), 'goals.json');
    this.goals = this.loadGoals();
  }

  /**
   * Load goals from JSON file
   */
  private loadGoals(): Goal[] {
    try {
      if (fs.existsSync(this.goalsPath)) {
        const data = fs.readFileSync(this.goalsPath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading goals:', error);
    }
    return [];
  }

  /**
   * Save goals to JSON file
   */
  private saveGoals(): void {
    fs.writeFileSync(this.goalsPath, JSON.stringify(this.goals, null, 2));
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  /**
   * Create a new goal
   */
  createGoal(
    name: string,
    type: GoalType,
    target: number,
    category?: ActivityCategory
  ): Goal {
    const goal: Goal = {
      id: this.generateId(),
      name,
      type,
      target,
      frequency: type === 'weekly' ? 'weekly' : 'daily',
      category,
      created: format(new Date(), 'yyyy-MM-dd'),
      lastHit: null,
      currentStreak: 0,
      longestStreak: 0,
    };

    this.goals.push(goal);
    this.saveGoals();
    return goal;
  }

  /**
   * Get all goals
   */
  getAllGoals(): Goal[] {
    return this.goals;
  }

  /**
   * Get a goal by ID
   */
  getGoal(id: string): Goal | undefined {
    return this.goals.find(g => g.id === id);
  }

  /**
   * Update a goal
   */
  updateGoal(id: string, updates: Partial<Omit<Goal, 'id' | 'created'>>): Goal | undefined {
    const index = this.goals.findIndex(g => g.id === id);
    if (index === -1) return undefined;

    this.goals[index] = { ...this.goals[index], ...updates };
    this.saveGoals();
    return this.goals[index];
  }

  /**
   * Delete a goal
   */
  deleteGoal(id: string): boolean {
    const index = this.goals.findIndex(g => g.id === id);
    if (index === -1) return false;

    this.goals.splice(index, 1);
    this.saveGoals();
    return true;
  }

  /**
   * Get progress for a specific goal on a date
   */
  async getGoalProgress(goal: Goal, date: string = format(new Date(), 'yyyy-MM-dd')): Promise<GoalProgress> {
    const summary = this.getSummary(date);
    let current = 0;
    let daysRemaining: number | undefined;

    if (goal.type === 'daily' || goal.type === 'streak') {
      // Daily goals: check single day
      if (summary) {
        current = this.calculateProgressFromSummary(summary, goal);
      }
    } else if (goal.type === 'weekly') {
      // Weekly goals: aggregate over the week
      const weekStart = startOfWeek(parseISO(date), { weekStartsOn: 1 }); // Monday
      const weekEnd = endOfWeek(parseISO(date), { weekStartsOn: 1 });
      
      // Calculate days remaining in the week
      const today = parseISO(date);
      daysRemaining = differenceInDays(weekEnd, today);

      // Aggregate from all days this week
      for (let d = weekStart; d <= today; d = new Date(d.getTime() + 86400000)) {
        const dayDate = format(d, 'yyyy-MM-dd');
        const daySummary = this.getSummary(dayDate);
        if (daySummary) {
          current += this.calculateProgressFromSummary(daySummary, goal);
        }
      }
    }

    const percentage = Math.min(100, Math.round((current / goal.target) * 100));
    const met = current >= goal.target;

    // Update streak if goal is met
    if (met && goal.lastHit !== date) {
      this.updateStreak(goal, date);
    }

    return {
      goal,
      current,
      target: goal.target,
      percentage,
      met,
      streak: goal.currentStreak,
      daysRemaining,
    };
  }

  /**
   * Get progress for all goals
   */
  async getAllGoalsProgress(date: string = format(new Date(), 'yyyy-MM-dd')): Promise<GoalProgress[]> {
    const progressList: GoalProgress[] = [];
    for (const goal of this.goals) {
      const progress = await this.getGoalProgress(goal, date);
      progressList.push(progress);
    }
    return progressList;
  }

  /**
   * Calculate progress from a daily summary based on goal type
   */
  private calculateProgressFromSummary(summary: DailySummaryContent, goal: Goal): number {
    // Check goal name to determine what to track
    const nameLower = goal.name.toLowerCase();

    // Deep work goals
    if (nameLower.includes('deep work') || nameLower.includes('focus')) {
      return summary.deepWorkMinutes;
    }

    // Category-specific goals
    if (goal.category) {
      return summary.categoryBreakdown[goal.category] || 0;
    }

    // Coding goals
    if (nameLower.includes('coding') || nameLower.includes('code') || nameLower.includes('programming')) {
      return summary.categoryBreakdown.coding || 0;
    }

    // Exercise/fitness goals (track as a count from check-ins)
    if (nameLower.includes('exercise') || nameLower.includes('workout') || nameLower.includes('gym')) {
      const exerciseCheckIns = summary.checkIns.filter(ci => 
        ci.toLowerCase().includes('exercise') || 
        ci.toLowerCase().includes('workout') ||
        ci.toLowerCase().includes('gym')
      );
      return exerciseCheckIns.length;
    }

    // Check-in/streak goals
    if (nameLower.includes('check-in') || nameLower.includes('streak') || goal.type === 'streak') {
      return summary.checkIns.length > 0 ? 1 : 0;
    }

    // Focus score goals
    if (nameLower.includes('focus score')) {
      return summary.focusScore;
    }

    // Default: return total tracked minutes
    return summary.totalTrackedMinutes;
  }

  /**
   * Update streak for a goal
   */
  private updateStreak(goal: Goal, date: string): void {
    const yesterday = format(subDays(parseISO(date), 1), 'yyyy-MM-dd');
    
    if (goal.lastHit === yesterday) {
      // Consecutive day - increment streak
      goal.currentStreak += 1;
    } else if (goal.lastHit !== date) {
      // Gap in days - reset streak
      goal.currentStreak = 1;
    }

    // Update longest streak
    if (goal.currentStreak > goal.longestStreak) {
      goal.longestStreak = goal.currentStreak;
    }

    goal.lastHit = date;
    this.saveGoals();
  }

  /**
   * Check if a streak is at risk (would break tomorrow)
   */
  isStreakAtRisk(goal: Goal, date: string = format(new Date(), 'yyyy-MM-dd')): boolean {
    if (goal.type !== 'streak' && goal.currentStreak === 0) return false;
    
    const today = date;
    const lastHit = goal.lastHit;
    
    if (!lastHit) return goal.currentStreak > 0;
    
    const daysSinceLastHit = differenceInDays(parseISO(today), parseISO(lastHit));
    return daysSinceLastHit >= 1 && goal.currentStreak > 0;
  }

  /**
   * Get summary from database
   */
  private getSummary(date: string): DailySummaryContent | null {
    const summary = this.db.getSummary(date);
    if (!summary) return null;

    try {
      return JSON.parse(summary.content_json);
    } catch {
      return null;
    }
  }

  /**
   * Format goals for CLI display
   */
  formatGoalsForCLI(): string {
    if (this.goals.length === 0) {
      return '\n📋 No goals set. Add one with: lifelog goals add "Goal Name" --type daily --target 240\n';
    }

    let output = '\n📋 Your Goals\n';
    output += '═'.repeat(60) + '\n\n';

    // Get today's progress for all goals
    const today = format(new Date(), 'yyyy-MM-dd');

    for (const goal of this.goals) {
      const typeIcon = goal.type === 'daily' ? '📅' : goal.type === 'weekly' ? '📆' : '🔥';
      const streakText = goal.currentStreak > 0 ? ` (${goal.currentStreak}🔥)` : '';
      
      output += `${typeIcon} ${goal.name}${streakText}\n`;
      output += `   Type: ${goal.type} | Target: ${goal.target}${goal.category ? ` (${goal.category})` : ''}\n`;
      output += `   Created: ${goal.created} | Best streak: ${goal.longestStreak} days\n`;
      output += '\n';
    }

    return output;
  }

  /**
   * Format progress for CLI display
   */
  async formatProgressForCLI(date: string = format(new Date(), 'yyyy-MM-dd')): Promise<string> {
    const progressList = await this.getAllGoalsProgress(date);

    if (progressList.length === 0) {
      return '\n📋 No goals set. Add one with: lifelog goals add "Goal Name" --type daily --target 240\n';
    }

    let output = `\n📊 Goal Progress for ${date}\n`;
    output += '═'.repeat(60) + '\n\n';

    for (const progress of progressList) {
      const statusIcon = progress.met ? '✅' : progress.percentage >= 50 ? '🔶' : '⭕';
      const typeIcon = progress.goal.type === 'daily' ? '📅' : progress.goal.type === 'weekly' ? '📆' : '🔥';
      
      // Progress bar
      const barLength = 20;
      const filled = Math.round((progress.percentage / 100) * barLength);
      const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);

      output += `${statusIcon} ${progress.goal.name}\n`;
      output += `   ${typeIcon} [${bar}] ${progress.percentage}%\n`;
      output += `   Progress: ${progress.current}/${progress.target}`;
      
      if (progress.goal.type === 'weekly' && progress.daysRemaining !== undefined) {
        output += ` (${progress.daysRemaining} days left this week)`;
      }
      
      if (progress.streak > 0) {
        output += ` | Streak: ${progress.streak}🔥`;
      }
      
      output += '\n\n';
    }

    return output;
  }
}
