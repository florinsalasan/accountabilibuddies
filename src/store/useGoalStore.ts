import { create } from 'zustand';
import * as Haptics from 'expo-haptics';
import { GoalRepo, SettingsRepo } from '../db/repo.ts';
import type * as schema from '../db/schema.ts';
import type { Category, GoalType, Cadence, Rating, ProgressSource } from '../domain/types.ts';
import { scheduleGoalReminder, cancelGoalReminders, sendImmediateCheckInNotification } from '../services/notifications.ts';
import { effectiveHealth, healthState } from '../domain/health.ts';

interface GoalDetailState {
  goal: schema.GoalRecord;
  milestones: schema.MilestoneRecord[];
  recentLogs: schema.ProgressLogRecord[];
  recentCheckIns: schema.CheckInRecord[];
  events: schema.EventRecord[];
}

interface GoalStore {
  goals: schema.GoalRecord[];
  activeGoalDetail: GoalDetailState | null;
  isLoading: boolean;
  devMode: boolean;
  simulatedTimeOffsetMs: number;

  init: () => Promise<void>;
  loadGoals: () => Promise<void>;
  loadGoalDetail: (id: string) => Promise<void>;

  createGoal: (data: {
    title: string;
    why?: string;
    category: Category;
    type: GoalType;
    cadence: Cadence;
    cadenceDay?: number;
    reminderMinutes?: number;
    targetValue?: number;
    unit?: string;
    targetDate?: number;
    stake?: string;
    milestoneTitles?: string[];
  }) => Promise<string>;

  checkIn: (goalId: string, rating: Exclude<Rating, 'missed'>, note?: string) => Promise<void>;
  logProgress: (data: {
    goalId: string;
    amount?: number;
    milestoneId?: string;
    note?: string;
    source?: ProgressSource;
  }) => Promise<void>;

  toggleMilestone: (goalId: string, milestoneId: string, done: boolean) => Promise<void>;
  pauseGoal: (goalId: string, reason?: string, until?: number | null) => Promise<void>;
  resumeGoal: (goalId: string) => Promise<void>;
  completeGoal: (goalId: string) => Promise<void>;
  abandonGoal: (goalId: string) => Promise<void>;
  updateGoal: (
    goalId: string,
    data: {
      title?: string;
      why?: string;
      reminderMinutes?: number;
      targetValue?: number;
      unit?: string;
      targetDate?: number;
      stake?: string;
    },
  ) => Promise<void>;
  payStake: (goalId: string, paid: boolean) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;

  setDevMode: (enabled: boolean) => Promise<void>;
  setGoalHealth: (id: string, health: number) => Promise<void>;
  triggerDevNotification: (goalId: string) => Promise<void>;
  timeTravel: (days: number) => Promise<void>;
  resetTimeTravel: () => Promise<void>;
}

export const useGoalStore = create<GoalStore>((set, get) => ({
  goals: [],
  activeGoalDetail: null,
  isLoading: false,
  devMode: false,
  simulatedTimeOffsetMs: 0,

  init: async () => {
    set({ isLoading: true });
    try {
      const devModeSetting = await SettingsRepo.get('dev_mode', 'false');
      set({ devMode: devModeSetting === 'true' });
      await get().loadGoals();
    } finally {
      set({ isLoading: false });
    }
  },

  loadGoals: async () => {
    const currentNow = Date.now() + get().simulatedTimeOffsetMs;
    // Reconcile and tick all goals against the current moment
    await GoalRepo.syncAll(currentNow);
    const all = await GoalRepo.getAll();
    set({ goals: all });
  },

  loadGoalDetail: async (id: string) => {
    const detail = await GoalRepo.getById(id);
    set({ activeGoalDetail: detail });
  },

  createGoal: async (data) => {
    const id = await GoalRepo.create(data);
    await get().loadGoals();

    // Schedule notification
    const created = (await GoalRepo.getAll()).find((g) => g.id === id);
    if (created) {
      await scheduleGoalReminder(created as any, created.title);
    }
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    return id;
  },

  checkIn: async (goalId, rating, note) => {
    const now = Date.now() + get().simulatedTimeOffsetMs;
    await GoalRepo.checkIn(goalId, rating, note, now);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await get().loadGoals();
    if (get().activeGoalDetail?.goal.id === goalId) {
      await get().loadGoalDetail(goalId);
    }
  },

  logProgress: async (data) => {
    const now = Date.now() + get().simulatedTimeOffsetMs;
    await GoalRepo.logProgress({ ...data, now });
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (get().activeGoalDetail?.goal.id === data.goalId) {
      await get().loadGoalDetail(data.goalId);
    }
  },

  toggleMilestone: async (goalId, milestoneId, done) => {
    await GoalRepo.toggleMilestone(milestoneId, done);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (get().activeGoalDetail?.goal.id === goalId) {
      await get().loadGoalDetail(goalId);
    }
  },

  pauseGoal: async (goalId, reason, until) => {
    const now = Date.now() + get().simulatedTimeOffsetMs;
    await GoalRepo.pause(goalId, reason, until ?? null, now);
    await cancelGoalReminders(goalId);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await get().loadGoals();
    if (get().activeGoalDetail?.goal.id === goalId) {
      await get().loadGoalDetail(goalId);
    }
  },

  resumeGoal: async (goalId) => {
    const now = Date.now() + get().simulatedTimeOffsetMs;
    await GoalRepo.resume(goalId, now);
    const updated = (await GoalRepo.getAll()).find((g) => g.id === goalId);
    if (updated) {
      await scheduleGoalReminder(updated as any, updated.title);
    }
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await get().loadGoals();
    if (get().activeGoalDetail?.goal.id === goalId) {
      await get().loadGoalDetail(goalId);
    }
  },

  completeGoal: async (goalId) => {
    const now = Date.now() + get().simulatedTimeOffsetMs;
    await GoalRepo.complete(goalId, now);
    await cancelGoalReminders(goalId);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await get().loadGoals();
    if (get().activeGoalDetail?.goal.id === goalId) {
      await get().loadGoalDetail(goalId);
    }
  },

  abandonGoal: async (goalId) => {
    const now = Date.now() + get().simulatedTimeOffsetMs;
    await GoalRepo.abandon(goalId, now);
    await cancelGoalReminders(goalId);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await get().loadGoals();
    if (get().activeGoalDetail?.goal.id === goalId) {
      await get().loadGoalDetail(goalId);
    }
  },

  updateGoal: async (goalId, data) => {
    const detail = await GoalRepo.update(goalId, data);
    if (detail) {
      await scheduleGoalReminder(detail.goal as any, detail.goal.title);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await get().loadGoals();
      if (get().activeGoalDetail?.goal.id === goalId) {
        await get().loadGoalDetail(goalId);
      }
    }
  },

  payStake: async (goalId, paid) => {
    await GoalRepo.markStakePaid(goalId, paid);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await get().loadGoals();
    if (get().activeGoalDetail?.goal.id === goalId) {
      await get().loadGoalDetail(goalId);
    }
  },

  deleteGoal: async (goalId) => {
    await cancelGoalReminders(goalId);
    await GoalRepo.delete(goalId);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await get().loadGoals();
  },

  setDevMode: async (enabled) => {
    await SettingsRepo.set('dev_mode', enabled ? 'true' : 'false');
    set({ devMode: enabled });
  },

  setGoalHealth: async (id, health) => {
    await GoalRepo.setHealth(id, health);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await get().loadGoals();
    if (get().activeGoalDetail && get().activeGoalDetail!.goal.id === id) {
      await get().loadGoalDetail(id);
    }
  },

  triggerDevNotification: async (goalId) => {
    const detail = await GoalRepo.getById(goalId);
    if (!detail) return;
    const { goal } = detail;
    const now = Date.now() + get().simulatedTimeOffsetMs;
    const currentHealth = effectiveHealth(goal as any, now);
    const hState = healthState(currentHealth);
    await sendImmediateCheckInNotification(goal.title, goal.category, hState, goal.id);
  },

  timeTravel: async (days) => {
    const addMs = days * 86400_000;
    const newOffset = get().simulatedTimeOffsetMs + addMs;
    set({ simulatedTimeOffsetMs: newOffset });
    await get().loadGoals();
    if (get().activeGoalDetail) {
      await get().loadGoalDetail(get().activeGoalDetail!.goal.id);
    }
  },

  resetTimeTravel: async () => {
    set({ simulatedTimeOffsetMs: 0 });
    await get().loadGoals();
    if (get().activeGoalDetail) {
      await get().loadGoalDetail(get().activeGoalDetail!.goal.id);
    }
  },
}));
