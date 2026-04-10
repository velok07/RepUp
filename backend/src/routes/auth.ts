import { Router } from "express";
import { prisma } from "../db/prisma";
import { signToken } from "../utils/jwt";
import { verifyVkLaunchParams } from "../utils/vkAuth";

const router = Router();
const VK_APP_SECRET = process.env.VK_APP_SECRET?.trim();
const IS_PRODUCTION = process.env.NODE_ENV === "production";

router.post("/vk", async (req, res) => {
  try {
    const { vkId, firstName, lastName } = req.body as {
      vkId?: number;
      firstName?: string;
      lastName?: string;
    };
    const authHeader = req.header("Authorization");
    const rawLaunchParams = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : null;
    const isDevBypass =
      !IS_PRODUCTION &&
      req.header("X-RepUp-Dev-Auth") === "1" &&
      typeof vkId === "number";

    let normalizedVkId: bigint;

    if (rawLaunchParams) {
      if (!VK_APP_SECRET) {
        console.error("[backend] VK_APP_SECRET is not configured");
        return res.status(500).json({ message: "VK auth is not configured" });
      }

      const verifiedParams = verifyVkLaunchParams(rawLaunchParams, VK_APP_SECRET);

      if (!verifiedParams) {
        return res.status(401).json({ message: "Invalid launch params" });
      }

      normalizedVkId = BigInt(verifiedParams.vkUserId);
    } else if (isDevBypass) {
      normalizedVkId = BigInt(vkId);
    } else {
      return res.status(401).json({ message: "VK auth data is required" });
    }

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
        // If another parallel request created the user first, reuse it.
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
