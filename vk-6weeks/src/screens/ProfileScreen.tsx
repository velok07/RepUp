import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "../store/appStore";
import { clampNumber, parsePositiveInt, sanitizeDigitsInput } from "../utils/numeric";
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
  const user = useAppStore((s) => s.user);

  const [confirmReset, setConfirmReset] = useState(false);
  const [restInput, setRestInput] = useState(String(settings.restSeconds));
  const [saveMessage, setSaveMessage] = useState("");

  const hasAnyProgress = useMemo(() => {
    return Object.values(progress).some(Boolean);
  }, [progress]);

  useEffect(() => {
    setRestInput(String(settings.restSeconds));
  }, [settings.restSeconds]);

  const parsedRestInput = parsePositiveInt(restInput);
  const hasValidRestInput =
    restInput.length > 0 && parsedRestInput !== null && parsedRestInput >= 0;

  const persistRestSeconds = (nextValue: string) => {
    const parsed = parsePositiveInt(nextValue);
    const normalized = clampNumber(parsed ?? 0, 0, 600);

    updateSettings({ restSeconds: normalized });
    setRestInput(String(normalized));
    setSaveMessage("Сохранено");

    window.setTimeout(() => {
      setSaveMessage((current) => (current === "Сохранено" ? "" : current));
    }, 1500);
  };

  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || "Пользователь VK";

  const initials = [user.firstName?.[0], user.lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase();

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          ...cardStyle,
          minHeight: 96,
          display: "flex",
          alignItems: "center",
        }}
      >
        <h2 style={{ ...pageTitleStyle, marginBottom: 0 }}>Профиль и настройки</h2>
      </div>

      <div
        style={{
          ...cardStyle,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        {user.photoUrl ? (
          <img
            src={user.photoUrl}
            alt={displayName}
            style={{
              width: 68,
              height: 68,
              borderRadius: "50%",
              objectFit: "cover",
              flexShrink: 0,
              border: "2px solid color-mix(in srgb, var(--primary-color) 24%, transparent)",
            }}
          />
        ) : (
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: "50%",
              flexShrink: 0,
              display: "grid",
              placeItems: "center",
              background:
                "linear-gradient(135deg, var(--primary-color) 0%, var(--primary-strong) 100%)",
              color: "#fff",
              fontSize: 24,
              fontWeight: 800,
            }}
          >
            {initials || "VK"}
          </div>
        )}

        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, color: "var(--muted-text-color)", marginBottom: 6 }}>
            Профиль VK
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              lineHeight: 1.15,
              color: "var(--text-color)",
              marginBottom: 6,
            }}
          >
            {displayName}
          </div>
          <div style={{ ...mutedTextStyle, fontSize: 14 }}>
            {user.vkId ? `VK ID: ${user.vkId}` : "Данные профиля загрузятся после авторизации"}
          </div>
        </div>
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
              background: settings.theme === "light" ? "var(--primary-soft)" : "var(--card-bg)",
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
              background: settings.theme === "dark" ? "var(--primary-soft-2)" : "var(--card-bg)",
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

        <div style={{ display: "grid", gap: 12, maxWidth: 260 }}>
          <div style={{ display: "grid", gridTemplateColumns: "56px minmax(0, 1fr) 56px", gap: 10 }}>
            <button
              type="button"
              style={{ ...secondaryButtonStyle, paddingInline: 0, minHeight: 48 }}
              onClick={() => persistRestSeconds(String(clampNumber(settings.restSeconds - 5, 0, 600)))}
            >
              -5
            </button>

            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={restInput}
              onChange={(e) => {
                setRestInput(sanitizeDigitsInput(e.target.value, 3));
                setSaveMessage("");
              }}
              onBlur={() => persistRestSeconds(restInput)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                }
              }}
              aria-invalid={restInput.length > 0 && !hasValidRestInput}
              style={{
                ...inputStyle,
                textAlign: "center",
                border:
                  restInput.length > 0 && !hasValidRestInput
                    ? "1px solid var(--danger-color)"
                    : inputStyle.border,
              }}
            />

            <button
              type="button"
              style={{ ...secondaryButtonStyle, paddingInline: 0, minHeight: 48 }}
              onClick={() => persistRestSeconds(String(clampNumber(settings.restSeconds + 5, 0, 600)))}
            >
              +5
            </button>
          </div>

          <div style={{ ...mutedTextStyle, minHeight: 20 }}>
            {saveMessage || "Можно ввести от 0 до 600 секунд"}
          </div>
        </div>
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
