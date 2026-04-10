import { create } from "zustand";
import { appApi } from "../api/appApi";
import { programs } from "../data/programs";
import type {
  ActiveWorkoutSession,
  AppSettings,
  AppState,
  AppUser,
  UserProgramProgress,
  UserStats,
  WorkoutLogItem,
} from "../types";
import { ACHIEVEMENT_XP_REWARD } from "../utils/achievements";
import { makeWorkoutKey } from "../utils/plan";

const defaultSettings: AppSettings = {
  restSeconds: 60,
  autoFillTargetOnComplete: true,
  theme: "light",
};

const defaultUserStats: UserStats = {
  xp: 0,
  rewardedAchievementIds: [],
  pendingAchievementIds: [],
};

const defaultUser: AppUser = {
  id: null,
  vkId: null,
};

export const useAppStore = create<AppState>((set, get) => ({
  hydrated: false,
  user: defaultUser,
  activeProgramId: null,
  activeWorkoutSessions: {},
  progress: {},
  settings: defaultSettings,
  userStats: defaultUserStats,

  hydrate: async () => {
    if (get().hydrated) return;

    try {
      const persisted = await appApi.load();

      set((state) => ({
        hydrated: true,
        user: {
          ...state.user,
          ...(persisted?.user ?? {}),
        },
        activeProgramId: persisted?.activeProgramId ?? null,
        progress: normalizeProgressMap(persisted?.progress ?? {}),
        settings: {
          ...defaultSettings,
          ...(persisted?.settings ?? {}),
        },
        userStats: {
          ...defaultUserStats,
          ...(persisted?.userStats ?? {}),
          rewardedAchievementIds:
            persisted?.userStats?.rewardedAchievementIds ?? [],
          pendingAchievementIds:
            persisted?.userStats?.pendingAchievementIds ?? [],
        },
      }));

      console.log("[RepUp] hydrate ok");
    } catch (error) {
      console.error("[RepUp] hydrate failed", error);

      set({
        hydrated: true,
        user: defaultUser,
        activeProgramId: null,
        progress: {},
        settings: defaultSettings,
        userStats: defaultUserStats,
      });
    }
  },

  setUser: (userPatch) => {
    set((state) => ({
      user: {
        ...state.user,
        ...userPatch,
      },
    }));
    void saveStateSafely(get());
  },

  setActiveProgram: (programId) => {
    set({ activeProgramId: programId });
    void saveStateSafely(get());
  },

  setActiveWorkoutSession: (session: ActiveWorkoutSession | null) => {
    if (!session) {
      return;
    }

    set((state) => ({
      activeWorkoutSessions: {
        ...state.activeWorkoutSessions,
        [session.programId]: session,
      },
    }));
  },

  clearActiveWorkoutSession: (programId) => {
    if (!programId) {
      set({ activeWorkoutSessions: {} });
      return;
    }

    set((state) => {
      const nextSessions = { ...state.activeWorkoutSessions };
      delete nextSessions[programId];

      return {
        activeWorkoutSessions: nextSessions,
      };
    });
  },

  updateSettings: (patch) => {
    set((state) => ({
      settings: {
        ...state.settings,
        ...patch,
      },
    }));
    void saveStateSafely(get());
  },

  startProgram: (programId, level) => {
    set((state) => ({
      activeProgramId: programId,
      progress: {
        ...state.progress,
        [programId]: createInitialProgress(programId, level),
      },
    }));
    void saveStateSafely(get());
  },

  setProgramLoadAdjustment: (programId, loadAdjustment) => {
    const current = get().progress[programId];
    if (!current) return;

    set((state) => ({
      progress: {
        ...state.progress,
        [programId]: {
          ...current,
          loadAdjustment,
        },
      },
    }));
    void saveStateSafely(get());
  },

  completeWorkout: (programId, payload) => {
    const current = get().progress[programId];
    const program = programs.find((item) => item.id === programId);

    if (!current || current.finished || !program) return;

    const workoutKey = makeWorkoutKey(payload.week, payload.day);
    const plannedTotal = payload.planned.reduce((sum, value) => sum + value, 0);
    const actualTotal = payload.actual.reduce((sum, value) => sum + value, 0);

    let nextWeek = current.currentWeek;
    let nextDay = current.currentDay + 1;
    let finished = false;

    if (nextDay > program.workoutsPerWeek) {
      nextDay = 1;
      nextWeek += 1;
    }

    if (nextWeek > program.durationWeeks) {
      finished = true;
      nextWeek = program.durationWeeks;
      nextDay = program.workoutsPerWeek;
    }

    const nextLog: WorkoutLogItem = {
      key: workoutKey,
      week: payload.week,
      day: payload.day,
      planned: payload.planned,
      actual: payload.actual,
      plannedTotal,
      actualTotal,
      success: true,
      completedAt: new Date().toISOString(),
    };

    set((state) => ({
      progress: {
        ...state.progress,
        [programId]: {
          ...current,
          completedWorkouts: addUnique(current.completedWorkouts, workoutKey),
          failedWorkouts: removeValue(current.failedWorkouts, workoutKey),
          workoutLogs: upsertWorkoutLog(current.workoutLogs, nextLog),
          currentWeek: nextWeek,
          currentDay: nextDay,
          finished,
        },
      },
      userStats: {
        ...state.userStats,
        xp: state.userStats.xp + 10,
      },
    }));

    void saveStateSafely(get());
  },

  failWorkout: (programId, payload) => {
    const current = get().progress[programId];
    if (!current || current.finished) return;

    const workoutKey = makeWorkoutKey(payload.week, payload.day);
    const plannedTotal = payload.planned.reduce((sum, value) => sum + value, 0);
    const actualTotal = payload.actual.reduce((sum, value) => sum + value, 0);

    const nextLog: WorkoutLogItem = {
      key: workoutKey,
      week: payload.week,
      day: payload.day,
      planned: payload.planned,
      actual: payload.actual,
      plannedTotal,
      actualTotal,
      success: false,
      completedAt: new Date().toISOString(),
    };

    set((state) => ({
      progress: {
        ...state.progress,
        [programId]: {
          ...current,
          failedWorkouts: addUnique(current.failedWorkouts, workoutKey),
          completedWorkouts: removeValue(current.completedWorkouts, workoutKey),
          workoutLogs: upsertWorkoutLog(current.workoutLogs, nextLog),
        },
      },
      userStats: {
        ...state.userStats,
        xp: state.userStats.xp + 5,
      },
    }));

    void saveStateSafely(get());
  },

  syncAchievementRewards: (unlockedIds) => {
    const rewardedIds = get().userStats.rewardedAchievementIds ?? [];
    const pendingIds = get().userStats.pendingAchievementIds ?? [];

    const newRewardIds = unlockedIds.filter((id) => !rewardedIds.includes(id));
    if (newRewardIds.length === 0) return;

    const nextRewardedIds = [...rewardedIds, ...newRewardIds];
    const nextPendingIds = [...pendingIds, ...newRewardIds];
    const bonusXp = newRewardIds.length * ACHIEVEMENT_XP_REWARD;

    set((state) => ({
      userStats: {
        ...state.userStats,
        xp: state.userStats.xp + bonusXp,
        rewardedAchievementIds: nextRewardedIds,
        pendingAchievementIds: nextPendingIds,
      },
    }));

    void saveStateSafely(get());
  },

  clearPendingAchievements: () => {
    set((state) => ({
      userStats: {
        ...state.userStats,
        pendingAchievementIds: [],
      },
    }));
    void saveStateSafely(get());
  },

  resetAll: () => {
    const currentSettings = get().settings;
    const currentUser = get().user;

    set({
      hydrated: true,
      user: currentUser,
      activeProgramId: null,
      activeWorkoutSessions: {},
      progress: {},
      settings: currentSettings,
      userStats: {
        ...defaultUserStats,
      },
    });

    void appApi.clear().catch((error) => {
      console.error("Failed to clear backend state", error);
    });
  },
}));

function createInitialProgress(
  programId: UserProgramProgress["programId"],
  level: number
): UserProgramProgress {
  return {
    programId,
    level,
    loadAdjustment: 1,
    startedAt: new Date().toISOString(),
    currentWeek: 1,
    currentDay: 1,
    completedWorkouts: [],
    failedWorkouts: [],
    workoutLogs: [],
    finished: false,
  };
}

function normalizeProgressMap(progressMap: Partial<AppState["progress"]>) {
  return Object.fromEntries(
    Object.entries(progressMap).map(([programId, progress]) => [
      programId,
      progress
        ? {
            ...progress,
            loadAdjustment: progress.loadAdjustment ?? 1,
          }
        : progress,
    ])
  ) as AppState["progress"];
}

async function saveStateSafely(state: AppState) {
  try {
    console.log("[RepUp] saving state", {
      activeProgramId: state.activeProgramId,
      progressKeys: Object.keys(state.progress),
      xp: state.userStats.xp,
      vkId: state.user.vkId,
    });

    await appApi.save({
      user: state.user,
      activeProgramId: state.activeProgramId,
      progress: state.progress,
      settings: state.settings,
      userStats: state.userStats,
    });

    console.log("[RepUp] state saved");
  } catch (error) {
    console.error("[RepUp] failed to save state", error);
  }
}

function upsertWorkoutLog(items: WorkoutLogItem[], nextItem: WorkoutLogItem) {
  const filtered = items.filter((item) => item.key !== nextItem.key);
  return [...filtered, nextItem].sort(
    (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
  );
}

function addUnique(items: string[], value: string) {
  return items.includes(value) ? items : [...items, value];
}

function removeValue(items: string[], value: string) {
  return items.filter((item) => item !== value);
}
