import { achievements } from "../data/achievements";
import type {
  AchievementCategory,
  AchievementDefinition,
  AchievementProgress,
  AppState,
  ProgramType,
  WorkoutLogItem,
} from "../types";

export const ACHIEVEMENT_XP_REWARD = 50;

type NormalizedWorkoutLog = WorkoutLogItem & {
  programId: ProgramType;
};

const categoryPrograms: Record<Exclude<AchievementCategory, "special">, ProgramType[]> = {
  push: ["pushups", "dips", "bench_pushups"],
  pull: ["pullups_classic", "pullups_reverse", "pullups_parallel"],
  core: ["abs", "crunches"],
  legs: ["squats", "bulgarian_split_squats"],
  static: ["plank", "wall_sit"],
};

export function calculateAchievementProgress(
  state: Pick<AppState, "progress">
): AchievementProgress {
  const allPrograms = Object.values(state.progress).filter(Boolean);

  const normalizedLogs = allPrograms.flatMap((program) =>
    (program?.workoutLogs ?? []).map((log) => ({
      ...log,
      programId: program!.programId,
    }))
  );

  const uniqueLogs = dedupeLogs(normalizedLogs);
  const successLogs = uniqueLogs.filter((item) => item.success);

  const successCount = successLogs.length;
  const totalVolume = uniqueLogs.reduce((sum, item) => sum + (item.actualTotal ?? 0), 0);
  const bestStreak = calculateBestStreak(uniqueLogs);
  const finishedPrograms = allPrograms.filter((item) => item?.finished).length;

  const unlockedIds: string[] = [];

  if (successCount >= 1) unlockedIds.push("first_workout");
  if (successCount >= 5) unlockedIds.push("workout_5");
  if (successCount >= 10) unlockedIds.push("workout_10");
  if (successCount >= 25) unlockedIds.push("workout_25");

  if (totalVolume >= 100) unlockedIds.push("volume_100");
  if (totalVolume >= 500) unlockedIds.push("volume_500");
  if (totalVolume >= 1000) unlockedIds.push("volume_1000");

  if (bestStreak >= 3) unlockedIds.push("streak_3");
  if (bestStreak >= 7) unlockedIds.push("streak_7");

  if (finishedPrograms >= 1) unlockedIds.push("first_program_finished");

  const successCountByCategory = getSuccessCountByCategory(successLogs);

  if ((successCountByCategory.push ?? 0) >= 1) unlockedIds.push("push_first");
  if ((successCountByCategory.pull ?? 0) >= 1) unlockedIds.push("pull_first");
  if ((successCountByCategory.core ?? 0) >= 1) unlockedIds.push("core_first");
  if ((successCountByCategory.legs ?? 0) >= 1) unlockedIds.push("legs_first");
  if ((successCountByCategory.static ?? 0) >= 1) unlockedIds.push("static_first");

  if ((successCountByCategory.push ?? 0) >= 5) unlockedIds.push("push_5");
  if ((successCountByCategory.pull ?? 0) >= 5) unlockedIds.push("pull_5");
  if ((successCountByCategory.core ?? 0) >= 5) unlockedIds.push("core_5");
  if ((successCountByCategory.legs ?? 0) >= 5) unlockedIds.push("legs_5");
  if ((successCountByCategory.static ?? 0) >= 5) unlockedIds.push("static_5");

  for (const achievement of achievements) {
    const date = achievement.exclusiveDate;
    if (!date) continue;

    const matched = successLogs.some((log) => isSameMonthDay(log.completedAt, date.month, date.day));
    if (matched) {
      unlockedIds.push(achievement.id);
    }
  }

  return { unlockedIds };
}

export function isExclusiveAchievementLocked(
  achievement: AchievementDefinition,
  unlockedSet: Set<string>,
  now: Date = new Date()
) {
  if (!achievement.exclusiveDate) return false;
  if (unlockedSet.has(achievement.id)) return false;

  const unlocksAt = new Date(now.getFullYear(), achievement.exclusiveDate.month - 1, achievement.exclusiveDate.day);
  return startOfDay(now) < startOfDay(unlocksAt);
}

export function getAchievementPresentation(
  achievement: AchievementDefinition,
  unlockedSet: Set<string>,
  now: Date = new Date()
) {
  const lockedSecret = isExclusiveAchievementLocked(achievement, unlockedSet, now);

  if (!lockedSecret) {
    return {
      title: achievement.title,
      description: achievement.description,
      icon: achievement.icon,
      spotlight: achievement.spotlight,
      isSecret: false,
    };
  }

  return {
    title: "Секретное достижение",
    description: "Откроется только в особый день. Следи за событием и возвращайся вовремя.",
    icon: "❔",
    spotlight: "Секрет",
    isSecret: true,
  };
}

export function getTodayExclusiveAchievements(now: Date = new Date()) {
  return achievements.filter((achievement) => {
    const date = achievement.exclusiveDate;
    if (!date) return false;
    return now.getMonth() + 1 === date.month && now.getDate() === date.day;
  });
}

function dedupeLogs(logs: NormalizedWorkoutLog[]) {
  const map = new Map<string, NormalizedWorkoutLog>();

  for (const log of logs) {
    map.set(`${log.programId}:${log.key}`, log);
  }

  return [...map.values()].sort((a, b) => {
    const timeA = Date.parse(a.completedAt || "") || 0;
    const timeB = Date.parse(b.completedAt || "") || 0;

    if (timeA !== timeB) {
      return timeA - timeB;
    }

    if (a.week !== b.week) {
      return a.week - b.week;
    }

    return a.day - b.day;
  });
}

function calculateBestStreak(logs: NormalizedWorkoutLog[]) {
  let best = 0;
  let current = 0;

  for (const item of logs) {
    if (item.success) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }

  return best;
}

function getSuccessCountByCategory(logs: NormalizedWorkoutLog[]) {
  const counts: Partial<Record<AchievementCategory, number>> = {};

  for (const log of logs) {
    const category = getAchievementCategoryByProgram(log.programId);
    if (!category) continue;
    counts[category] = (counts[category] ?? 0) + 1;
  }

  return counts;
}

function getAchievementCategoryByProgram(programId: ProgramType) {
  for (const [category, ids] of Object.entries(categoryPrograms) as Array<
    [Exclude<AchievementCategory, "special">, ProgramType[]]
  >) {
    if (ids.includes(programId)) {
      return category;
    }
  }

  return null;
}

function isSameMonthDay(value: string, month: number, day: number) {
  const date = new Date(value);
  return date.getMonth() + 1 === month && date.getDate() === day;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
