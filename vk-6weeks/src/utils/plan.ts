import { levelsByProgram, plansByProgram } from "../data/plans";
import type { Program, ProgramType, WorkoutDay } from "../types";

export function getLevelByResult(programId: ProgramType, result: number): number {
  const levels = levelsByProgram[programId] ?? [];
  const found = levels.find((item) => result >= item.min && result <= item.max);
  return found?.level ?? 1;
}

export function getWorkoutByProgress(
  programId: ProgramType,
  level: number,
  currentWeek: number,
  currentDay: number
): WorkoutDay | null {
  const plan = plansByProgram[programId]?.[level];
  if (!plan) return null;
  return plan.find((w) => w.week === currentWeek && w.day === currentDay) ?? null;
}

export function makeWorkoutKey(week: number, day: number) {
  return `${week}-${day}`;
}

export function getProgramTotalWorkouts(
  program: Pick<Program, "durationWeeks" | "workoutsPerWeek">
) {
  return program.durationWeeks * program.workoutsPerWeek;
}

// Legacy constants are kept for compatibility with older screens and helpers.
export const TOTAL_WEEKS = 8;
export const WORKOUTS_PER_WEEK = 3;
export const TOTAL_WORKOUTS = TOTAL_WEEKS * WORKOUTS_PER_WEEK;
