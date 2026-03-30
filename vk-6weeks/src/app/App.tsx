import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Icon28GraphOutline,
  Icon28HomeOutline,
  Icon28ServicesOutline,
  Icon28UserCircleOutline,
} from "@vkontakte/icons";
import { useAppStore } from "../store/appStore";
import { initVkUser } from "./initVk";

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useAppStore((s) => s.settings.theme);
  const hydrated = useAppStore((s) => s.hydrated);
  const hydrate = useAppStore((s) => s.hydrate);
  const activeWorkoutSession = useAppStore((s) => s.activeWorkoutSession);
  const workoutReturnTarget = activeWorkoutSession
    ? `/workout/${activeWorkoutSession.programId}`
    : null;
  const hasWorkoutToReturn = workoutReturnTarget !== null && location.pathname !== workoutReturnTarget;

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated) {
      void initVkUser();
    }
  }, [hydrated]);

  useEffect(() => {
    document.body.classList.toggle("dark", theme === "dark");
  }, [theme]);

  if (!hydrated) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          color: "var(--text-color, #111)",
          background: "#f8fafc",
          fontSize: 16,
          fontWeight: 700,
        }}
      >
        Загрузка RepUp...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          theme === "dark"
            ? "linear-gradient(180deg, #0f172a 0%, #020617 220px, #020617 100%)"
            : "linear-gradient(180deg, #f5f3ff 0%, #f8fafc 220px, #f8fafc 100%)",
      }}
    >
      <div
        style={{
          maxWidth: 560,
          margin: "0 auto",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <header style={{ padding: "20px 16px 12px" }}>
          <div
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--border-color)",
              borderRadius: 24,
              padding: "16px 18px",
              boxShadow: "var(--card-shadow)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <RepUpMark />

              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--muted-text-color)",
                    marginBottom: 6,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Fitness Progress
                </div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 900,
                    color: "var(--text-color)",
                    lineHeight: 1,
                    marginBottom: 4,
                  }}
                >
                  RepUp
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--muted-text-color)",
                  }}
                >
                  Делай повторы. Повышай уровень.
                </div>
              </div>
            </div>

            <div
              style={{
                alignSelf: "flex-start",
                padding: "8px 10px",
                borderRadius: 999,
                background: "var(--primary-soft-2)",
                color: "var(--primary-strong)",
                fontSize: 12,
                fontWeight: 800,
                whiteSpace: "nowrap",
              }}
            >
              v1.0 MVP
            </div>
          </div>
        </header>

        <main
          style={{
            flex: 1,
            padding: "4px 16px calc(92px + env(safe-area-inset-bottom, 0px))",
          }}
        >
          {hasWorkoutToReturn && (
            <button
              onClick={() => {
                if (workoutReturnTarget) {
                  navigate(workoutReturnTarget);
                }
              }}
              style={{
                width: "100%",
                border: "none",
                borderRadius: 22,
                padding: "14px 18px",
                marginBottom: 14,
                background:
                  "linear-gradient(135deg, var(--primary-color) 0%, var(--primary-strong) 100%)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 14,
                boxShadow: "0 18px 30px rgba(99, 102, 241, 0.24)",
                cursor: "pointer",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 16,
                    display: "grid",
                    placeItems: "center",
                    background: "rgba(255,255,255,0.18)",
                    fontSize: 20,
                    flexShrink: 0,
                  }}
                >
                  ⏱
                </span>

                <span style={{ textAlign: "left" }}>
                  <span style={{ display: "block", fontSize: 12, opacity: 0.84, marginBottom: 2 }}>
                    Тренировка продолжается
                  </span>
                  <span style={{ display: "block", fontSize: 16, fontWeight: 800 }}>
                    Вернуться к подходам
                  </span>
                </span>
              </span>

              <span style={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>→</span>
            </button>
          )}

          <Outlet />
        </main>

        <nav
          aria-label="Основная навигация"
          style={{
            position: "sticky",
            bottom: 0,
            padding: "8px 12px calc(10px + env(safe-area-inset-bottom, 0px))",
            background: "transparent",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 6,
              background: "color-mix(in srgb, var(--card-bg) 88%, transparent)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              border: "1px solid var(--border-color)",
              borderRadius: 22,
              padding: 6,
              boxShadow: "var(--card-shadow)",
            }}
          >
            <NavItem
              label="Главная"
              active={location.pathname === "/"}
              onClick={() => navigate("/")}
            >
              <Icon28HomeOutline />
            </NavItem>
            <NavItem
              label="Программы"
              active={
                location.pathname.startsWith("/program") ||
                location.pathname.startsWith("/level-test")
              }
              onClick={() => navigate("/programs")}
            >
              <Icon28ServicesOutline />
            </NavItem>
            <NavItem
              label="Прогресс"
              active={location.pathname.startsWith("/progress")}
              onClick={() => navigate("/progress")}
            >
              <Icon28GraphOutline />
            </NavItem>
            <NavItem
              label="Профиль"
              active={location.pathname.startsWith("/profile")}
              onClick={() => navigate("/profile")}
            >
              <Icon28UserCircleOutline />
            </NavItem>
          </div>
        </nav>
      </div>
    </div>
  );
}

function NavItem({
  children,
  label,
  active,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        border: "none",
        borderRadius: 18,
        minHeight: 60,
        padding: "8px 4px",
        background: active ? "var(--primary-color)" : "transparent",
        color: active ? "#ffffff" : "color-mix(in srgb, var(--text-color) 74%, #64748b)",
        cursor: "pointer",
        transition: "all 0.2s ease",
        display: "grid",
        placeItems: "center",
        boxShadow: active ? "0 12px 22px rgba(99, 102, 241, 0.28)" : "none",
      }}
    >
      <span
        style={{
          display: "grid",
          placeItems: "center",
          width: 34,
          height: 34,
          lineHeight: 0,
        }}
      >
        {children}
      </span>
    </button>
  );
}

function RepUpMark() {
  return (
    <div
      aria-hidden
      style={{
        width: 54,
        height: 54,
        borderRadius: 18,
        background:
          "linear-gradient(135deg, var(--primary-color) 0%, var(--primary-strong) 100%)",
        boxShadow: "0 14px 28px rgba(124, 92, 255, 0.28)",
        display: "grid",
        placeItems: "center",
        color: "#fff",
        fontWeight: 900,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <span style={{ fontSize: 22, lineHeight: 1 }}>R</span>
      <span
        style={{
          position: "absolute",
          right: 10,
          top: 8,
          fontSize: 16,
          fontWeight: 900,
        }}
      >
        ↑
      </span>
    </div>
  );
}
