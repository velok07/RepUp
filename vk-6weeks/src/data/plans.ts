import type { LevelRange, ProgramType, WorkoutDay } from "../types";

type PlanMap = Record<number, WorkoutDay[]>;

const repLevels: LevelRange[] = [
  { min: 0, max: 5, level: 1 },
  { min: 6, max: 10, level: 2 },
  { min: 11, max: 20, level: 3 },
  { min: 21, max: 30, level: 4 },
  { min: 31, max: 999, level: 5 },
];

const timeLevels: LevelRange[] = [
  { min: 0, max: 20, level: 1 },
  { min: 21, max: 40, level: 2 },
  { min: 41, max: 60, level: 3 },
  { min: 61, max: 90, level: 4 },
  { min: 91, max: 9999, level: 5 },
];

const withRest = (
  week: number,
  day: number,
  values: number[],
  restSeconds: number
): WorkoutDay => ({
  week,
  day,
  title: `Неделя ${week} · День ${day}`,
  steps: values.map((target, idx) => ({
    index: idx + 1,
    target,
    restSeconds,
  })),
});

function generateRepPlan(base: number, weeklyGrowth: number): PlanMap {
  const result: PlanMap = {};

  for (let level = 1; level <= 5; level++) {
    const levelBase = base + (level - 1) * 3;
    const days: WorkoutDay[] = [];

    for (let week = 1; week <= 8; week++) {
      for (let day = 1; day <= 3; day++) {
        const offset = (week - 1) * weeklyGrowth + (day - 1);

        const values = [
          levelBase + offset,
          levelBase + offset,
          levelBase - 1 + offset,
          levelBase - 1 + offset,
          levelBase + 2 + offset,
        ].map((n) => Math.max(1, n));

        days.push(withRest(week, day, values, 60));
      }
    }

    result[level] = days;
  }

  return result;
}

function generateTimePlan(base: number, weeklyGrowth: number): PlanMap {
  const result: PlanMap = {};

  for (let level = 1; level <= 5; level++) {
    const levelBase = base + (level - 1) * 10;
    const days: WorkoutDay[] = [];

    for (let week = 1; week <= 8; week++) {
      for (let day = 1; day <= 3; day++) {
        const offset = (week - 1) * weeklyGrowth + (day - 1) * 2;

        const values = [
          levelBase + offset,
          levelBase + 5 + offset,
          levelBase + 10 + offset,
        ];

        days.push(withRest(week, day, values, 45));
      }
    }

    result[level] = days;
  }

  return result;
}

export const levelsByProgram: Record<ProgramType, LevelRange[]> = {
  pushups: repLevels,
  abs: repLevels,
  crunches: repLevels,
  pullups_classic: repLevels,
  pullups_reverse: repLevels,
  pullups_parallel: repLevels,
  dips: repLevels,
  bench_pushups: repLevels,
  squats: repLevels,
  bulgarian_split_squats: repLevels,
  plank: timeLevels,
  wall_sit: timeLevels,
};

export const plansByProgram: Record<ProgramType, PlanMap> = {
  pushups: generateRepPlan(4, 1),
  abs: generateRepPlan(6, 2),
  crunches: generateRepPlan(8, 2),
  pullups_classic: generateRepPlan(2, 1),
  pullups_reverse: generateRepPlan(3, 1),
  pullups_parallel: generateRepPlan(3, 1),
  dips: generateRepPlan(3, 1),
  bench_pushups: generateRepPlan(6, 2),
  squats: generateRepPlan(10, 3),
  bulgarian_split_squats: generateRepPlan(4, 1),
  plank: generateTimePlan(20, 4),
  wall_sit: generateTimePlan(25, 4),
};