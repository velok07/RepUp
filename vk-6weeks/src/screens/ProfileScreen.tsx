import { useMemo, useState } from "react";
import { useAppStore } from "../store/appStore";
import {
  buttonStyle,
  cardStyle,
  inputStyle,
  mutedTextStyle,
  pageTitleStyle,
  secondaryButtonStyle,
} from "../components/ui";

export default function ProfileScreen() {
  const resetAll = useAppStore((s) => s.resetAll);
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const progress = useAppStore((s) => s.progress);

  const [confirmReset, setConfirmReset] = useState(false);

  const hasAnyProgress = useMemo(() => {
    return Object.values(progress).some(Boolean);
  }, [progress]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={cardStyle}>
        <h2 style={pageTitleStyle}>Профиль и настройки</h2>
        <p style={mutedTextStyle}>
          Настрой поведение тренировки, оформление и подготовь RepUp к ежедневному использованию.
        </p>
      </div>

      <div
        style={{
          ...cardStyle,
          background:
            "linear-gradient(135deg, var(--primary-color) 0%, var(--primary-strong) 100%)",
          color: "#fff",
          border: "none",
        }}
      >
        <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>О приложении</div>
        <h3 style={{ margin: 0, fontSize: 26, lineHeight: 1.1 }}>RepUp</h3>
        <p style={{ marginTop: 12, marginBottom: 0, opacity: 0.95, lineHeight: 1.5 }}>
          Мини-приложение для прогресса в тренировках с XP, уровнями, достижениями и статистикой.
        </p>
      </div>

      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Тема</h3>
        <p style={mutedTextStyle}>Выбери светлую или тёмную тему приложения.</p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            style={{
              ...secondaryButtonStyle,
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              background:
                settings.theme === "light" ? "var(--primary-soft)" : "var(--card-bg)",
              border:
                settings.theme === "light"
                  ? "1px solid var(--primary-color)"
                  : "1px solid var(--border-color)",
              color:
                settings.theme === "light"
                  ? "var(--primary-strong)"
                  : "var(--text-color)",
            }}
            onClick={() => updateSettings({ theme: "light" })}
          >
            <SunIcon />
            Светлая
          </button>

          <button
            style={{
              ...secondaryButtonStyle,
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              background:
                settings.theme === "dark" ? "var(--primary-soft-2)" : "var(--card-bg)",
              border:
                settings.theme === "dark"
                  ? "1px solid var(--primary-color)"
                  : "1px solid var(--border-color)",
              color: "var(--text-color)",
            }}
            onClick={() => updateSettings({ theme: "dark" })}
          >
            <MoonIcon />
            Тёмная
          </button>
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Отдых между подходами</h3>
        <p style={mutedTextStyle}>Сейчас: {settings.restSeconds} сек</p>

        <input
          type="number"
          min={0}
          step={5}
          value={settings.restSeconds}
          onChange={(e) =>
            updateSettings({
              restSeconds: Math.max(0, Number(e.target.value) || 0),
            })
          }
          style={{ ...inputStyle, maxWidth: 220 }}
        />
      </div>

      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Автозачёт цели</h3>
        <p style={mutedTextStyle}>
          Если включено, кнопка «Подход выполнен» автоматически засчитывает целевое количество.
        </p>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          <input
            type="checkbox"
            checked={settings.autoFillTargetOnComplete}
            onChange={(e) =>
              updateSettings({
                autoFillTargetOnComplete: e.target.checked,
              })
            }
          />
          Включить автозачёт цели
        </label>
      </div>

      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Сброс прогресса</h3>
        <p style={mutedTextStyle}>
          Это удалит тренировки и историю, но сохранит тему, XP и основные настройки.
        </p>

        {!hasAnyProgress ? (
          <button
            style={{
              ...secondaryButtonStyle,
              opacity: 0.5,
              cursor: "not-allowed",
            }}
            disabled
          >
            Нет прогресса для сброса
          </button>
        ) : !confirmReset ? (
          <button style={secondaryButtonStyle} onClick={() => setConfirmReset(true)}>
            Сбросить прогресс
          </button>
        ) : (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              style={{
                ...buttonStyle,
                background: "var(--danger-color)",
                boxShadow: "0 8px 20px rgba(220, 38, 38, 0.25)",
              }}
              onClick={() => {
                resetAll();
                setConfirmReset(false);
              }}
            >
              Да, удалить всё
            </button>

            <button style={secondaryButtonStyle} onClick={() => setConfirmReset(false)}>
              Отмена
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M4.93 4.93l1.41 1.41" />
      <path d="M17.66 17.66l1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="M6.34 17.66l-1.41 1.41" />
      <path d="M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z" />
    </svg>
  );
}
