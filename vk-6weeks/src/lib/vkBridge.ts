import bridgeModule from "@vkontakte/vk-bridge";

type VkSend = <T = unknown>(
  method: string,
  params?: Record<string, unknown>
) => Promise<T>;

type BridgeModuleShape = {
  send?: VkSend;
  default?: {
    send?: VkSend;
  };
};

const bridge = bridgeModule as unknown as BridgeModuleShape;

const resolvedSend: VkSend | undefined =
  typeof bridge.send === "function"
    ? bridge.send.bind(bridge)
    : typeof bridge.default?.send === "function"
      ? bridge.default.send.bind(bridge.default)
      : undefined;

export async function vkSend<T = unknown>(
  method: string,
  params?: Record<string, unknown>
): Promise<T> {
  if (!resolvedSend) {
    throw new Error("VK Bridge is unavailable");
  }

  return resolvedSend<T>(method, params);
}
