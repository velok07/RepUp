import { levelsByProgram, plansByProgram } from "../data/plans";
import type { Program, ProgramType, WorkoutDay } from "../types";

export const LOAD_ADJUSTMENT_PRESETS = [
  { value: 0.9, label: "Мягче" },
  { value: 1, label: "Стандарт" },
  { value: 1.1, label: "Интенсивнее" },
] as const;

const MIN_LOAD_ADJUSTMENT = 0.1;
const MAX_LOAD_ADJUSTMENT = 1.3;

export function getLevelByResult(programId: ProgramType, result: number): number {
  const levels = levelsByProgram[programId] ?? [];
  const found = levels.find((item) => result >= item.min && result <= item.max);
  if (found) return found.level;

  if (levels.length === 0) return 1;

  const sortedLevels = levels.slice().sort((a, b) => a.min - b.min);
  const firstLevel = sortedLevels[0];
  const lastLevel = sortedLevels[sortedLevels.length - 1];

  if (result < firstLevel.min) return firstLevel.level;
  if (result > lastLevel.max) return lastLevel.level;

  return 1;
}

export function getInitialLoadAdjustment(programId: ProgramType, result: number) {
  const level = getLevelByResult(programId, result);
  const firstWorkout = plansByProgram[programId]?.[level]?.[0] ?? null;

  if (!firstWorkout) return 1;

  const targets = firstWorkout.steps.map((step) => step.target);
  const maxTarget = Math.max(...targets);

  if (result <= maxTarget) {
    return clampLoadAdjustment(result / maxTarget);
  }

  const overshootRatio = (result - maxTarget) / Math.max(maxTarget, 1);
  return clampLoadAdjustment(1 + Math.min(0.3, overshootRatio * 0.18));
}

export function applyLoadAdjustmentPreset(baseLoadAdjustment = 1, loadAdjustmentPreset = 1) {
  return clampLoadAdjustment(baseLoadAdjustment * loadAdjustmentPreset);
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

  const workoutIndex = plan.findIndex((w) => w.week === currentWeek && w.day === currentDay);
  if (workoutIndex < 0) return null;

  const initialCap = getEarlyWorkoutCap(plan, loadAdjustment);
  return applyLoadAdjustmentToWorkout(
    plan[workoutIndex],
    getProgressiveLoadAdjustment(loadAdjustment, workoutIndex, plan.length),
    workoutIndex < 3 ? initialCap : null
  );
}

export function getAdjustedPlanByLevel(
  programId: ProgramType,
  level: number,
  loadAdjustment = 1
) {
  const plan = plansByProgram[programId]?.[level] ?? [];
  const initialCap = getEarlyWorkoutCap(plan, loadAdjustment);

  return plan.map((workout, index) =>
    applyLoadAdjustmentToWorkout(
      workout,
      getProgressiveLoadAdjustment(loadAdjustment, index, plan.length),
      index < 3 ? initialCap : null
    )
  );
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
  if (loadAdjustment < 0.9) return "Щадящий старт";

  const preset = LOAD_ADJUSTMENT_PRESETS.find((item) => item.value === loadAdjustment);
  return preset?.label ?? "Стандарт";
}

export function getLoadAdjustmentPresetLabel(loadAdjustmentPreset = 1) {
  const preset = LOAD_ADJUSTMENT_PRESETS.find((item) => item.value === loadAdjustmentPreset);
  return preset?.label ?? "Стандарт";
}

function applyLoadAdjustmentToWorkout(
  workout: WorkoutDay,
  loadAdjustment: number,
  maxCap: number | null = null
): WorkoutDay {
  if (loadAdjustment === 1) return workout;

  return {
    ...workout,
    steps: workout.steps.map((step) => ({
      ...step,
      target: clampWorkoutTarget(Math.round(step.target * loadAdjustment), maxCap),
    })),
  };
}

function getEarlyWorkoutCap(plan: WorkoutDay[], loadAdjustment: number) {
  if (loadAdjustment >= 1 || plan.length === 0) return null;

  const firstWorkoutMax = Math.max(...plan[0].steps.map((step) => step.target));
  const testedMaxEstimate = clampWorkoutTarget(Math.round(firstWorkoutMax * loadAdjustment), null);

  if (testedMaxEstimate > 5) return null;

  return testedMaxEstimate;
}

function clampWorkoutTarget(value: number, maxCap: number | null) {
  const minValue = Math.max(1, value);
  return maxCap ? Math.min(minValue, maxCap) : minValue;
}

function getProgressiveLoadAdjustment(
  baseLoadAdjustment: number,
  workoutIndex: number,
  totalWorkouts: number
) {
  const progress = totalWorkouts <= 1 ? 1 : workoutIndex / (totalWorkouts - 1);

  if (baseLoadAdjustment < 1) {
    const finalAdjustment = Math.min(1, baseLoadAdjustment + (1 - baseLoadAdjustment) * 0.45);
    return clampLoadAdjustment(
      baseLoadAdjustment + (finalAdjustment - baseLoadAdjustment) * progress
    );
  }

  if (baseLoadAdjustment > 1) {
    const finalAdjustment = 1 + (baseLoadAdjustment - 1) * 0.7;
    return clampLoadAdjustment(
      baseLoadAdjustment - (baseLoadAdjustment - finalAdjustment) * progress
    );
  }

  return 1;
}

function clampLoadAdjustment(value: number) {
  return Math.min(MAX_LOAD_ADJUSTMENT, Math.max(MIN_LOAD_ADJUSTMENT, Number(value.toFixed(2))));
}

export const TOTAL_WEEKS = 8;
export const WORKOUTS_PER_WEEK = 3;
export const TOTAL_WORKOUTS = TOTAL_WEEKS * WORKOUTS_PER_WEEK;
