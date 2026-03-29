import { vkSend } from "../lib/vkBridge";
import { useAppStore } from "../store/appStore";

type VkUserInfo = {
  id: number;
  first_name: string;
  last_name: string;
};

export async function initVkUser() {
  try {
    const user = await vkSend<VkUserInfo>("VKWebAppGetUserInfo");

    useAppStore.getState().setUser({
      vkId: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
    });

    console.log("[RepUp] VK user loaded", user);
  } catch (error) {
    console.warn("[RepUp] VK init skipped", error);
  }
}
