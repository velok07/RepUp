import { vkSend } from "../lib/vkBridge";
import { useAppStore } from "../store/appStore";
import { getTodayExclusiveAchievements } from "../utils/achievements";

type VkUserInfo = {
  id: number;
  first_name: string;
  last_name: string;
  photo_200?: string;
};

export async function initVkUser() {
  try {
    const user = await vkSend<VkUserInfo>("VKWebAppGetUserInfo");

    useAppStore.getState().setUser({
      vkId: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      photoUrl: user.photo_200,
    });

    console.log("[RepUp] VK user loaded", user);
  } catch (error) {
    console.warn("[RepUp] VK init skipped", error);
  }

  void notifyAboutExclusiveAchievementDay();
}

async function notifyAboutExclusiveAchievementDay() {
  const todayAchievements = getTodayExclusiveAchievements(new Date());
  if (todayAchievements.length === 0) return;

  const dateKey = new Date().toISOString().slice(0, 10);
  const storageKey = `repup-exclusive-achievement-${dateKey}`;

  if (window.localStorage.getItem(storageKey) === "shown") {
    return;
  }

  const text =
    todayAchievements.length === 1
      ? `Сегодня можно открыть достижение: ${todayAchievements[0].title}`
      : `Сегодня доступны ${todayAchievements.length} эксклюзивных достижения`;

  try {
    await vkSend("VKWebAppShowSnackbar", { text });
    window.localStorage.setItem(storageKey, "shown");
  } catch (error) {
    console.warn("[RepUp] exclusive day notice skipped", error);
  }
}
