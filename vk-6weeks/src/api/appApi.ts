import type {
  AppSettings,
  AppUser,
  ProgramType,
  UserProgramProgress,
  UserStats,
} from "../types";
import { parseURLSearchParamsForGetLaunchParams } from "@vkontakte/vk-bridge";
import { vkSend } from "../lib/vkBridge";
import { useAppStore } from "../store/appStore";

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

function getStoredVkId() {
  const raw = localStorage.getItem("repup_vk_id");
  if (!raw) return null;

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function setStoredToken(token: string, vkId?: number | null) {
  localStorage.setItem("repup_token", token);

  if (typeof vkId === "number") {
    localStorage.setItem("repup_vk_id", String(vkId));
  }
}

function clearStoredToken() {
  localStorage.removeItem("repup_token");
  localStorage.removeItem("repup_vk_id");
}

function clearSessionIdentity() {
  clearStoredToken();

  useAppStore.setState((state) => ({
    user: {
      ...state.user,
      id: null,
    },
  }));
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

function isLocalDevelopmentHost() {
  const { hostname } = window.location;
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function getLaunchParamsVkId() {
  try {
    const params = parseURLSearchParamsForGetLaunchParams(window.location.search);
    const rawVkId =
      "vk_user_id" in params && typeof params.vk_user_id === "string"
        ? params.vk_user_id
        : null;

    if (!rawVkId) return null;

    const vkId = Number(rawVkId);
    return Number.isFinite(vkId) ? vkId : null;
  } catch (error) {
    console.warn("[RepUp] failed to parse launch params", error);
    return null;
  }
}

async function resolveVkIdentity() {
  const stateUser = useAppStore.getState().user;
  if (stateUser.vkId) {
    return {
      vkId: stateUser.vkId,
      firstName: stateUser.firstName ?? "VK",
      lastName: stateUser.lastName ?? "User",
    };
  }

  try {
    console.log("[RepUp] VK user request start");

    const vkUser = await withTimeout(
      vkSend<VkUserInfo>("VKWebAppGetUserInfo"),
      4000,
      "VKWebAppGetUserInfo"
    );

    console.log("[RepUp] VK user received", {
      vkId: vkUser.id,
      firstName: vkUser.first_name,
      lastName: vkUser.last_name,
    });

    return {
      vkId: vkUser.id,
      firstName: vkUser.first_name,
      lastName: vkUser.last_name,
    };
  } catch (error) {
    console.warn("[RepUp] VK user request failed", error);
  }

  const launchVkId = getLaunchParamsVkId();
  if (launchVkId) {
    console.log("[RepUp] using launch params vkId", launchVkId);
    return {
      vkId: launchVkId,
      firstName: stateUser.firstName ?? "VK",
      lastName: stateUser.lastName ?? "User",
    };
  }

  if (isLocalDevelopmentHost()) {
    console.warn("[RepUp] VK unavailable on localhost, using dev fallback");
    return {
      vkId: 999001,
      firstName: "Dev",
      lastName: "User",
    };
  }

  return null;
}

async function ensureAuth(): Promise<string | null> {
  const vkIdentity = await resolveVkIdentity();
  const existingToken = getStoredToken();
  const storedVkId = getStoredVkId();
  const isProdFallbackToken =
    !isLocalDevelopmentHost() && storedVkId === 999001;

  if (isProdFallbackToken) {
    console.warn("[RepUp] clearing legacy fallback token in production");
    clearStoredToken();
  }

  if (
    existingToken &&
    !isProdFallbackToken &&
    (!vkIdentity || storedVkId === null || storedVkId === vkIdentity.vkId)
  ) {
    console.log("[RepUp] using stored token");
    return existingToken;
  }

  if (existingToken && vkIdentity && storedVkId !== vkIdentity.vkId) {
    console.warn("[RepUp] stored token belongs to another vkId, re-auth");
    clearStoredToken();
  }

  if (!vkIdentity) {
    console.warn("[RepUp] VK identity unavailable, auth skipped");
    return null;
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
          vkId: vkIdentity.vkId,
          firstName: vkIdentity.firstName,
          lastName: vkIdentity.lastName,
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
    setStoredToken(data.token, data.user.vkId);

    console.log("[RepUp] auth ok", data.user);

    return data.token;
  } catch (error) {
    console.error("[RepUp] auth request failed", error);
    return null;
  }
}

async function authorizedRequest(
  input: RequestInfo | URL,
  init?: RequestInit,
  allowRetry = true
) {
  const token = await ensureAuth();

  if (!token) {
    return null;
  }

  const res = await fetchWithTimeout(
    input,
    {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${token}`,
      },
    },
    5000
  );

  if (res.status === 401 && allowRetry) {
    console.warn("[RepUp] token rejected, re-auth");
    clearSessionIdentity();
    return authorizedRequest(input, init, false);
  }

  if (res.status === 401) {
    console.warn("[RepUp] session is still invalid after retry");
    clearSessionIdentity();
  }

  return res;
}

export const appApi = {
  async load(): Promise<PersistedAppState | null> {
    console.log("[RepUp] appApi.load start", API_URL);

    const res = await authorizedRequest(`${API_URL}/me/state`);

    if (!res) {
      console.warn("[RepUp] no token, using default state");
      return DEFAULT_STATE;
    }

    try {
      console.log("[RepUp] /me/state response", res.status);

      if (res.status === 404) {
        console.warn("[RepUp] no remote state yet");
        return DEFAULT_STATE;
      }

      if (res.status === 401) {
        console.warn("[RepUp] invalid session on load, fallback to default state");
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
    const res = await authorizedRequest(
      `${API_URL}/me/state`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(state),
      }
    );

    if (!res) {
      console.warn("[RepUp] save skipped: no token");
      return;
    }

    try {
      console.log("[RepUp] save response", res.status);

      if (res.status === 401) {
        console.warn("[RepUp] invalid session on save, waiting for next auth cycle");
        return;
      }

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
    const res = await authorizedRequest(
      `${API_URL}/me/reset`,
      {
        method: "POST",
      }
    );

    if (!res) {
      console.warn("[RepUp] clear skipped: no token");
      return;
    }

    try {
      console.log("[RepUp] clear response", res.status);

      if (res.status === 401) {
        console.warn("[RepUp] invalid session on clear, waiting for next auth cycle");
        return;
      }

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
