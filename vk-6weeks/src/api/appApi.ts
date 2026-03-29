import type {
  AppSettings,
  AppUser,
  ProgramType,
  UserProgramProgress,
  UserStats,
} from "../types";
import { vkSend } from "../lib/vkBridge";

const API_URL = import.meta.env.VITE_API_URL;

export type PersistedAppState = {
  user?: AppUser;
  activeProgramId: ProgramType | null;
  progress: Partial<Record<ProgramType, UserProgramProgress>>;
  settings: AppSettings;
  userStats: UserStats;
};

type AuthResponse = {
  token: string;
  user: {
    id: string;
    vkId: number;
    firstName?: string;
    lastName?: string;
  };
};

type VkUserInfo = {
  id: number;
  first_name: string;
  last_name: string;
};

const DEFAULT_STATE: PersistedAppState = {
  user: {
    id: null,
    vkId: null,
  },
  activeProgramId: null,
  progress: {},
  settings: {
    restSeconds: 60,
    autoFillTargetOnComplete: true,
    theme: "light",
  },
  userStats: {
    xp: 0,
    rewardedAchievementIds: [],
    pendingAchievementIds: [],
  },
};

function getStoredToken() {
  return localStorage.getItem("repup_token");
}

function setStoredToken(token: string) {
  localStorage.setItem("repup_token", token);
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = 5000
) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(`${label} timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      });
  });
}

async function ensureAuth(): Promise<string | null> {
  const existingToken = getStoredToken();
  if (existingToken) {
    console.log("[RepUp] using stored token");
    return existingToken;
  }

  let vkId = 999001;
  let firstName = "Dev";
  let lastName = "User";

  try {
    console.log("[RepUp] VK user request start");

    const vkUser = await withTimeout(
      vkSend<VkUserInfo>("VKWebAppGetUserInfo"),
      1500,
      "VKWebAppGetUserInfo"
    );

    vkId = vkUser.id;
    firstName = vkUser.first_name;
    lastName = vkUser.last_name;

    console.log("[RepUp] VK user received", { vkId, firstName, lastName });
  } catch (error) {
    console.warn("[RepUp] VK unavailable, using dev fallback", error);
  }

  try {
    console.log("[RepUp] auth request start");

    const res = await fetchWithTimeout(
      `${API_URL}/auth/vk`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vkId,
          firstName,
          lastName,
        }),
      },
      5000
    );

    console.log("[RepUp] auth response", res.status);

    if (!res.ok) {
      const text = await res.text();
      console.error("[RepUp] auth failed", text);
      return null;
    }

    const data = (await res.json()) as AuthResponse;
    setStoredToken(data.token);

    console.log("[RepUp] auth ok", data.user);

    return data.token;
  } catch (error) {
    console.error("[RepUp] auth request failed", error);
    return null;
  }
}

export const appApi = {
  async load(): Promise<PersistedAppState | null> {
    console.log("[RepUp] appApi.load start", API_URL);

    const token = await ensureAuth();

    if (!token) {
      console.warn("[RepUp] no token, using default state");
      return DEFAULT_STATE;
    }

    try {
      console.log("[RepUp] /me/state request start");

      const res = await fetchWithTimeout(
        `${API_URL}/me/state`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        5000
      );

      console.log("[RepUp] /me/state response", res.status);

      if (res.status === 404) {
        console.warn("[RepUp] no remote state yet");
        return DEFAULT_STATE;
      }

      if (!res.ok) {
        const text = await res.text();
        console.error("[RepUp] load failed", text);
        return DEFAULT_STATE;
      }

      const data = (await res.json()) as PersistedAppState;
      console.log("[RepUp] state loaded", data);
      return data;
    } catch (error) {
      console.error("[RepUp] load request failed", error);
      return DEFAULT_STATE;
    }
  },

  async save(state: PersistedAppState): Promise<void> {
    const token = await ensureAuth();

    if (!token) {
      console.warn("[RepUp] save skipped: no token");
      return;
    }

    try {
      const res = await fetchWithTimeout(
        `${API_URL}/me/state`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(state),
        },
        5000
      );

      console.log("[RepUp] save response", res.status);

      if (!res.ok) {
        const text = await res.text();
        console.error("[RepUp] save failed", text);
        return;
      }

      console.log("[RepUp] remote save ok");
    } catch (error) {
      console.error("[RepUp] save request failed", error);
    }
  },

  async clear(): Promise<void> {
    const token = await ensureAuth();

    if (!token) {
      console.warn("[RepUp] clear skipped: no token");
      return;
    }

    try {
      const res = await fetchWithTimeout(
        `${API_URL}/me/reset`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        5000
      );

      console.log("[RepUp] clear response", res.status);

      if (!res.ok) {
        const text = await res.text();
        console.error("[RepUp] clear failed", text);
        return;
      }

      console.log("[RepUp] remote reset ok");
    } catch (error) {
      console.error("[RepUp] clear request failed", error);
    }
  },
};