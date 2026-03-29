import type { AchievementProgress, AppState, WorkoutLogItem } from "../types";

export const ACHIEVEMENT_XP_REWARD = 50;

type NormalizedWorkoutLog = WorkoutLogItem & {
  programId: string;
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
  const totalVolume = uniqueLogs.reduce(
    (sum, item) => sum + (item.actualTotal ?? 0),
    0
  );
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

  return { unlockedIds };
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
