import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAppStore } from "../store/appStore";
import { initVkUser } from "./initVk";

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useAppStore((s) => s.settings.theme);
  const hydrated = useAppStore((s) => s.hydrated);
  const hydrate = useAppStore((s) => s.hydrate);

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
          <Outlet />
        </main>

        <nav
          aria-label="Основная навигация"
          style={{
            position: "sticky",
            bottom: 0,
            padding: "8px 12px calc(10px + env(safe-area-inset-bottom, 0px))",
            background:
              theme === "dark"
                ? "linear-gradient(180deg, rgba(2,6,23,0) 0%, rgba(2,6,23,0.94) 24%, rgba(2,6,23,1) 100%)"
                : "linear-gradient(180deg, rgba(248,250,252,0) 0%, rgba(248,250,252,0.94) 24%, rgba(248,250,252,1) 100%)",
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
              <HomeIcon />
            </NavItem>
            <NavItem
              label="Программы"
              active={
                location.pathname.startsWith("/program") ||
                location.pathname.startsWith("/level-test")
              }
              onClick={() => navigate("/programs")}
            >
              <DumbbellIcon />
            </NavItem>
            <NavItem
              label="Прогресс"
              active={location.pathname.startsWith("/progress")}
              onClick={() => navigate("/progress")}
            >
              <ChartIcon />
            </NavItem>
            <NavItem
              label="Профиль"
              active={location.pathname.startsWith("/profile")}
              onClick={() => navigate("/profile")}
            >
              <ProfileIcon />
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
        padding: "10px 4px",
        background: active ? "var(--primary-color)" : "transparent",
        color: active ? "#ffffff" : "var(--muted-text-color)",
        cursor: "pointer",
        transition: "all 0.2s ease",
        display: "grid",
        placeItems: "center",
      }}
    >
      <span
        style={{
          display: "grid",
          placeItems: "center",
          width: 30,
          height: 30,
          lineHeight: 0,
        }}
      >
        {children}
      </span>
    </button>
  );
}

function NavIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="26"
      height="26"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.95"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

function HomeIcon() {
  return (
    <NavIcon>
      <path d="M3.5 10.5L12 4l8.5 6.5" />
      <path d="M6.5 9.5V20h11V9.5" />
      <path d="M10 20v-5h4v5" />
    </NavIcon>
  );
}

function DumbbellIcon() {
  return (
    <NavIcon>
      <path d="M3 9v6" />
      <path d="M6 7v10" />
      <path d="M9 9v6" />
      <path d="M15 9v6" />
      <path d="M18 7v10" />
      <path d="M21 9v6" />
      <path d="M9 12h6" />
      <path d="M6 12H3" />
      <path d="M21 12h-3" />
    </NavIcon>
  );
}

function ChartIcon() {
  return (
    <NavIcon>
      <path d="M5 19.5h14" />
      <path d="M7.5 16v-4" />
      <path d="M12 16v-8" />
      <path d="M16.5 16v-6" />
    </NavIcon>
  );
}

function ProfileIcon() {
  return (
    <NavIcon>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 19c1.8-3 4.1-4.5 6.5-4.5s4.7 1.5 6.5 4.5" />
    </NavIcon>
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
