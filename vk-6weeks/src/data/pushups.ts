import type { LevelRange, WorkoutDay } from "../types";

export const pushupLevels: LevelRange[] = [
  { min: 0, max: 5, level: 1 },
  { min: 6, max: 10, level: 2 },
  { min: 11, max: 20, level: 3 },
  { min: 21, max: 30, level: 4 },
  { min: 31, max: 999, level: 5 },
];

type PlanMap = Record<number, WorkoutDay[]>;

const withRest = (week: number, day: number, values: number[]): WorkoutDay => ({
  week,
  day,
  title: `Неделя ${week} · День ${day}`,
  steps: values.map((target, idx) => ({
    index: idx + 1,
    target,
    restSeconds: 60,
  })),
});

function generatePlan(base: number, weeklyGrowth: number): WorkoutDay[] {
  const days: WorkoutDay[] = [];

  for (let week = 1; week <= 8; week++) {
    for (let day = 1; day <= 3; day++) {
      const offset = (week - 1) * weeklyGrowth + (day - 1);

      const values = [
        base + offset,
        base + offset,
        base - 1 + offset,
        base - 1 + offset,
        base + 2 + offset,
      ].map((n) => Math.max(1, n));

      days.push(withRest(week, day, values));
    }
  }

  return days;
}

export const pushupPlan: PlanMap = {
  1: generatePlan(4, 1),
  2: generatePlan(7, 1),
  3: generatePlan(10, 2),
  4: generatePlan(14, 2),
  5: generatePlan(18, 2),
};