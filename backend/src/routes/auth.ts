import { Router } from "express";
import { prisma } from "../db/prisma";
import { signToken } from "../utils/jwt";

const router = Router();

router.post("/vk", async (req, res) => {
  try {
    const { vkId, firstName, lastName } = req.body as {
      vkId?: number;
      firstName?: string;
      lastName?: string;
    };

    if (!vkId) {
      return res.status(400).json({ message: "vkId is required" });
    }

    const normalizedVkId = BigInt(vkId);

    let user = await prisma.user.findUnique({
      where: { vkId: normalizedVkId },
      include: {
        settings: true,
        stats: true,
      },
    });

    if (!user) {
      try {
        user = await prisma.user.create({
          data: {
            vkId: normalizedVkId,
            firstName,
            lastName,
            settings: {
              create: {
                restSeconds: 60,
                autoFillTargetOnComplete: true,
                theme: "light",
              },
            },
            stats: {
              create: {
                xp: 0,
                rewardedAchievementIds: [],
                pendingAchievementIds: [],
              },
            },
          },
          include: {
            settings: true,
            stats: true,
          },
        });
      } catch (error) {
        // Если другой параллельный запрос уже создал этого пользователя
        user = await prisma.user.findUnique({
          where: { vkId: normalizedVkId },
          include: {
            settings: true,
            stats: true,
          },
        });

        if (!user) {
          console.error("[backend] auth create failed", error);
          return res.status(500).json({ message: "Failed to create user" });
        }
      }
    }

    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        firstName,
        lastName,
      },
      include: {
        settings: true,
        stats: true,
      },
    });

    const token = signToken({
      userId: user.id,
      vkId: user.vkId.toString(),
    });

    return res.json({
      token,
      user: {
        id: user.id,
        vkId: Number(user.vkId),
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (error) {
    console.error("[backend] POST /auth/vk failed", error);
    return res.status(500).json({ message: "Failed to authenticate user" });
  }
});

export default router;