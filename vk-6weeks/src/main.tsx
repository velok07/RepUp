import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import bridgeImport from "@vkontakte/vk-bridge";
import "./index.css";
import { router } from "./app/router";

const bridge = (bridgeImport as unknown as { default?: { send?: (method: string, params?: unknown) => Promise<unknown> | unknown }; send?: (method: string, params?: unknown) => Promise<unknown> | unknown }).default
  ?? (bridgeImport as unknown as { send?: (method: string, params?: unknown) => Promise<unknown> | unknown });

function initVKBridge() {
  try {
    const maybePromise = bridge?.send?.("VKWebAppInit");

    if (maybePromise && typeof (maybePromise as Promise<unknown>).catch === "function") {
      (maybePromise as Promise<unknown>).catch((error) => {
        console.error("VK Bridge init error:", error);
      });
    }
  } catch (error) {
    console.error("VK Bridge init error:", error);
  }
}

const rootEl = document.getElementById("root");

if (!rootEl) {
  throw new Error('Element "#root" not found');
}

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);

initVKBridge();
