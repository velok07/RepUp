import { Router } from "express";
import { prisma } from "../db/prisma";
import { authMiddleware } from "../middleware/auth";

type SaveStateBody = {
  user?: {
    firstName?: string;
    lastName?: string;
  };
  activeProgramId: string | null;
  progress: Record<string, unknown>;
  settings: {
    restSeconds: number;
    autoFillTargetOnComplete: boolean;
    theme: string;
  };
  userStats: {
    xp: number;
    rewardedAchievementIds: string[];
    pendingAchievementIds: string[];
  };
};

type IncomingWorkoutLog = {
  key: string;
  week: number;
  day: number;
  planned: number[];
  actual: number[];
  plannedTotal: number;
  actualTotal: number;
  success: boolean;
  completedAt: string;
};

type IncomingProgressItem = {
  programId: string;
  level: number;
  startedAt: string;
  currentWeek: number;
  currentDay: number;
  completedWorkouts?: string[];
  failedWorkouts?: string[];
  workoutLogs?: IncomingWorkoutLog[];
  finished?: boolean;
};

type DbProgressItem = {
  programId: string;
  level: number;
  startedAt: Date;
  currentWeek: number;
  currentDay: number;
  completedWorkouts: unknown;
  failedWorkouts: unknown;
  finished: boolean;
};

type DbWorkoutLog = {
  programId: string;
  key: string;
  week: number;
  day: number;
  planned: unknown;
  actual: unknown;
  plannedTotal: number;
  actualTotal: number;
  success: boolean;
  completedAt: Date;
};

const router = Router();

async function userExists(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  return Boolean(user);
}

router.get("/state", authMiddleware, async (req, res) => {
  try {
    const userId = req.auth!.userId;
    console.log("[backend] GET /me/state", { userId });

    const exists = await userExists(userId);
    if (!exists) {
      console.log("[backend] stale session: user not found");
      return res.status(401).json({ message: "Invalid session" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        settings: true,
        stats: true,
        progresses: true,
        workoutLogs: {
          orderBy: {
            completedAt: "asc",
          },
        },
      },
    });

    if (!user || !user.settings || !user.stats) {
      console.log("[backend] user state not found");
      return res.status(401).json({ message: "Invalid session" });
    }

    const progresses = user.progresses as unknown as DbProgressItem[];
    const workoutLogs = user.workoutLogs as unknown as DbWorkoutLog[];

    const progress = Object.fromEntries(
      progresses.map((item: DbProgressItem) => [
        item.programId,
        {
          programId: item.programId,
          level: item.level,
          startedAt: item.startedAt.toISOString(),
          currentWeek: item.currentWeek,
          currentDay: item.currentDay,
          completedWorkouts: Array.isArray(item.completedWorkouts)
            ? item.completedWorkouts
            : [],
          failedWorkouts: Array.isArray(item.failedWorkouts)
            ? item.failedWorkouts
            : [],
          workoutLogs: workoutLogs
            .filter((log: DbWorkoutLog) => log.programId === item.programId)
            .map((log: DbWorkoutLog) => ({
              key: log.key,
              week: log.week,
              day: log.day,
              planned: Array.isArray(log.planned) ? log.planned : [],
              actual: Array.isArray(log.actual) ? log.actual : [],
              plannedTotal: log.plannedTotal,
              actualTotal: log.actualTotal,
              success: log.success,
              completedAt: log.completedAt.toISOString(),
            })),
          finished: item.finished,
        },
      ])
    );

    return res.json({
      user: {
        id: user.id,
        vkId: Number(user.vkId),
        firstName: user.firstName,
        lastName: user.lastName,
      },
      activeProgramId: user.activeProgramId,
      progress,
      settings: {
        restSeconds: user.settings.restSeconds,
        autoFillTargetOnComplete: user.settings.autoFillTargetOnComplete,
        theme: user.settings.theme,
      },
      userStats: {
        xp: user.stats.xp,
        rewardedAchievementIds: Array.isArray(user.stats.rewardedAchievementIds)
          ? user.stats.rewardedAchievementIds
          : [],
        pendingAchievementIds: Array.isArray(user.stats.pendingAchievementIds)
          ? user.stats.pendingAchievementIds
          : [],
      },
    });
  } catch (error) {
    console.error("[backend] GET /me/state failed", error);
    return res.status(500).json({ message: "Failed to load user state" });
  }
});

router.put("/state", authMiddleware, async (req, res) => {
  try {
    const userId = req.auth!.userId;
    console.log("[backend] PUT /me/state", { userId });

    const exists = await userExists(userId);
    if (!exists) {
      console.log("[backend] stale session on save: user not found");
      return res.status(401).json({ message: "Invalid session" });
    }

    const { user, activeProgramId, progress, settings, userStats } =
      req.body as SaveStateBody;

    const progressItems = Object.values(progress ?? {}) as IncomingProgressItem[];
    const incomingProgramIds = progressItems.map(
      (item: IncomingProgressItem) => item.programId
    );

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          activeProgramId,
          firstName: user?.firstName,
          lastName: user?.lastName,
        },
      });

      await tx.userSettings.upsert({
        where: { userId },
        update: {
          restSeconds: settings.restSeconds,
          autoFillTargetOnComplete: settings.autoFillTargetOnComplete,
          theme: settings.theme,
        },
        create: {
          userId,
          restSeconds: settings.restSeconds,
          autoFillTargetOnComplete: settings.autoFillTargetOnComplete,
          theme: settings.theme,
        },
      });

      await tx.userStats.upsert({
        where: { userId },
        update: {
          xp: userStats.xp,
          rewardedAchievementIds: userStats.rewardedAchievementIds,
          pendingAchievementIds: userStats.pendingAchievementIds,
        },
        create: {
          userId,
          xp: userStats.xp,
          rewardedAchievementIds: userStats.rewardedAchievementIds,
          pendingAchievementIds: userStats.pendingAchievementIds,
        },
      });

      if (incomingProgramIds.length > 0) {
        await tx.programProgress.deleteMany({
          where: {
            userId,
            programId: {
              notIn: incomingProgramIds,
            },
          },
        });

        await tx.workoutLog.deleteMany({
          where: {
            userId,
            programId: {
              notIn: incomingProgramIds,
            },
          },
        });
      } else {
        await tx.programProgress.deleteMany({
          where: { userId },
        });

        await tx.workoutLog.deleteMany({
          where: { userId },
        });
      }

      for (const progressItem of progressItems) {
        await tx.programProgress.upsert({
          where: {
            userId_programId: {
              userId,
              programId: progressItem.programId,
            },
          },
          update: {
            level: progressItem.level,
            startedAt: new Date(progressItem.startedAt),
            currentWeek: progressItem.currentWeek,
            currentDay: progressItem.currentDay,
            completedWorkouts: progressItem.completedWorkouts ?? [],
            failedWorkouts: progressItem.failedWorkouts ?? [],
            finished: progressItem.finished ?? false,
          },
          create: {
            userId,
            programId: progressItem.programId,
            level: progressItem.level,
            startedAt: new Date(progressItem.startedAt),
            currentWeek: progressItem.currentWeek,
            currentDay: progressItem.currentDay,
            completedWorkouts: progressItem.completedWorkouts ?? [],
            failedWorkouts: progressItem.failedWorkouts ?? [],
            finished: progressItem.finished ?? false,
          },
        });

        await tx.workoutLog.deleteMany({
          where: {
            userId,
            programId: progressItem.programId,
          },
        });

        for (const log of progressItem.workoutLogs ?? []) {
          await tx.workoutLog.create({
            data: {
              userId,
              programId: progressItem.programId,
              key: log.key,
              week: log.week,
              day: log.day,
              planned: log.planned,
              actual: log.actual,
              plannedTotal: log.plannedTotal,
              actualTotal: log.actualTotal,
              success: log.success,
              completedAt: new Date(log.completedAt),
            },
          });
        }
      }
    }, {
      maxWait: 10000,
      timeout: 20000,
    });

    return res.json({ ok: true });
  } catch (error) {
    console.error("[backend] PUT /me/state failed", error);
    return res.status(500).json({ message: "Failed to save user state" });
  }
});

router.post("/reset", authMiddleware, async (req, res) => {
  try {
    const userId = req.auth!.userId;
    console.log("[backend] POST /me/reset", { userId });

    const exists = await userExists(userId);
    if (!exists) {
      console.log("[backend] stale session on reset: user not found");
      return res.status(401).json({ message: "Invalid session" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.programProgress.deleteMany({
        where: { userId },
      });

      await tx.workoutLog.deleteMany({
        where: { userId },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          activeProgramId: null,
        },
      });

      await tx.userStats.upsert({
        where: { userId },
        update: {
          xp: 0,
          rewardedAchievementIds: [],
          pendingAchievementIds: [],
        },
        create: {
          userId,
          xp: 0,
          rewardedAchievementIds: [],
          pendingAchievementIds: [],
        },
      });
    }, {
      maxWait: 10000,
      timeout: 20000,
    });

    return res.json({ ok: true });
  } catch (error) {
    console.error("[backend] POST /me/reset failed", error);
    return res.status(500).json({ message: "Failed to reset user state" });
  }
});

export default router;
