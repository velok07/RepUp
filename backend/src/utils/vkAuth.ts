import crypto from "crypto";

export type VerifiedVkLaunchParams = {
  vkAppId?: string;
  vkUserId: string;
};

function toBase64Url(value: Buffer) {
  return value
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function safeCompare(expected: string, actual: string) {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

export function verifyVkLaunchParams(
  rawLaunchParams: string,
  appSecret: string
): VerifiedVkLaunchParams | null {
  const trimmed = rawLaunchParams.startsWith("?")
    ? rawLaunchParams.slice(1)
    : rawLaunchParams;

  if (!trimmed) {
    return null;
  }

  const searchParams = new URLSearchParams(trimmed);
  const sign = searchParams.get("sign");
  const vkUserId = searchParams.get("vk_user_id");

  if (!sign || !vkUserId) {
    return null;
  }

  const signaturePayload = Array.from(searchParams.entries())
    .filter(([key]) => key.startsWith("vk_"))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  if (!signaturePayload) {
    return null;
  }

  const expectedSign = toBase64Url(
    crypto.createHmac("sha256", appSecret).update(signaturePayload).digest()
  );

  if (!safeCompare(expectedSign, sign)) {
    return null;
  }

  return {
    vkAppId: searchParams.get("vk_app_id") ?? undefined,
    vkUserId,
  };
}
