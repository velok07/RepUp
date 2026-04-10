import { levelsByProgram, plansByProgram } from "../data/plans";
import type { Program, ProgramType, WorkoutDay } from "../types";

export const LOAD_ADJUSTMENT_PRESETS = [
  { value: 0.9, label: "Мягче" },
  { value: 1, label: "Стандарт" },
  { value: 1.1, label: "Интенсивнее" },
] as const;

export function getLevelByResult(programId: ProgramType, result: number): number {
  const levels = levelsByProgram[programId] ?? [];
  const found = levels.find((item) => result >= item.min && result <= item.max);
  return found?.level ?? 1;
}

export function getWorkoutByProgress(
  programId: ProgramType,
  level: number,
  currentWeek: number,
  currentDay: number,
  loadAdjustment = 1
): WorkoutDay | null {
  const plan = plansByProgram[programId]?.[level];
  if (!plan) return null;

  const workout = plan.find((w) => w.week === currentWeek && w.day === currentDay) ?? null;
  return workout ? applyLoadAdjustmentToWorkout(workout, loadAdjustment) : null;
}

export function getAdjustedPlanByLevel(
  programId: ProgramType,
  level: number,
  loadAdjustment = 1
) {
  const plan = plansByProgram[programId]?.[level] ?? [];
  return plan.map((workout) => applyLoadAdjustmentToWorkout(workout, loadAdjustment));
}

export function getProgramTotalWorkouts(
  program: Pick<Program, "durationWeeks" | "workoutsPerWeek">
) {
  return program.durationWeeks * program.workoutsPerWeek;
}

export function makeWorkoutKey(week: number, day: number) {
  return `${week}-${day}`;
}

export function getLoadAdjustmentLabel(loadAdjustment = 1) {
  const preset = LOAD_ADJUSTMENT_PRESETS.find((item) => item.value === loadAdjustment);
  return preset?.label ?? "Стандарт";
}

function applyLoadAdjustmentToWorkout(workout: WorkoutDay, loadAdjustment: number): WorkoutDay {
  if (loadAdjustment === 1) return workout;

  return {
    ...workout,
    steps: workout.steps.map((step) => ({
      ...step,
      target: Math.max(1, Math.round(step.target * loadAdjustment)),
    })),
  };
}

export const TOTAL_WEEKS = 8;
export const WORKOUTS_PER_WEEK = 3;
export const TOTAL_WORKOUTS = TOTAL_WEEKS * WORKOUTS_PER_WEEK;
