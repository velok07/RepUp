export type ProgramType =
  | "pushups"
  | "abs"
  | "crunches"
  | "pullups_classic"
  | "pullups_reverse"
  | "pullups_parallel"
  | "dips"
  | "bench_pushups"
  | "squats"
  | "bulgarian_split_squats"
  | "plank"
  | "wall_sit";

export type ProgramUnit = "reps" | "seconds";
export type ThemeMode = "light" | "dark";

export interface Program {
  id: ProgramType;
  title: string;
  description: string;
  goal: string;
  durationWeeks: number;
  workoutsPerWeek: number;
  unit: ProgramUnit;
}

export interface LevelRange {
  min: number;
  max: number;
  level: number;
}

export interface WorkoutStep {
  index: number;
  target: number;
  restSeconds: number;
}

export interface WorkoutDay {
  week: number;
  day: number;
  title: string;
  steps: WorkoutStep[];
}

export interface WorkoutLogItem {
  key: string;
  week: number;
  day: number;
  planned: number[];
  actual: number[];
  plannedTotal: number;
  actualTotal: number;
  success: boolean;
  completedAt: string;
}

export interface AppSettings {
  restSeconds: number;
  autoFillTargetOnComplete: boolean;
  theme: ThemeMode;
}

export interface UserStats {
  xp: number;
  rewardedAchievementIds: string[];
  pendingAchievementIds: string[];
}

export interface UserProgramProgress {
  programId: ProgramType;
  level: number;
  startedAt: string;
  currentWeek: number;
  currentDay: number;
  completedWorkouts: string[];
  failedWorkouts: string[];
  workoutLogs: WorkoutLogItem[];
  finished: boolean;
}

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

export interface AchievementProgress {
  unlockedIds: string[];
}

export interface AppUser {
  id: string | null;
  vkId: number | null;
  firstName?: string;
  lastName?: string;
}

export interface AppState {
  hydrated: boolean;
  user: AppUser;
  activeProgramId: ProgramType | null;
  progress: Partial<Record<ProgramType, UserProgramProgress>>;
  settings: AppSettings;
  userStats: UserStats;

  hydrate: () => Promise<void>;
  setUser: (user: Partial<AppUser>) => void;
  setActiveProgram: (programId: ProgramType | null) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  startProgram: (programId: ProgramType, level: number) => void;
  completeWorkout: (
    programId: ProgramType,
    payload: {
      week: number;
      day: number;
      planned: number[];
      actual: number[];
    }
  ) => void;
  failWorkout: (
    programId: ProgramType,
    payload: {
      week: number;
      day: number;
      planned: number[];
      actual: number[];
    }
  ) => void;
  syncAchievementRewards: (unlockedIds: string[]) => void;
  clearPendingAchievements: () => void;
  resetAll: () => void;
}