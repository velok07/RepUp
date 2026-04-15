import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { buttonStyle, cardStyle, mutedTextStyle, pageTitleStyle } from "../components/ui";
import { programs } from "../data/programs";
import { useAppStore } from "../store/appStore";
import { getProgramTotalWorkouts } from "../utils/plan";
import type { WorkoutLogItem } from "../types";

const DAYS_TO_SHOW = 7;

export default function ProgressScreen() {
  const navigate = useNavigate();
  const progressMap = useAppStore((s) => s.progress);
  const activeProgramId = useAppStore((s) => s.activeProgramId);
  const setActiveProgram = useAppStore((s) => s.setActiveProgram);

  const startedPrograms = useMemo(
    () => programs.filter((program) => progressMap[program.id]),
    [progressMap]
  );

  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(activeProgramId);

  const activeIndex = useMemo(() => {
    if (startedPrograms.length === 0) return 0;

    const preferredIds = [selectedProgramId, activeProgramId];

    for (const programId of preferredIds) {
      if (!programId) continue;
      const index = startedPrograms.findIndex((item) => item.id === programId);
      if (index >= 0) return index;
    }

    return 0;
  }, [activeProgramId, selectedProgramId, startedPrograms]);

  const activeProgram = startedPrograms[activeIndex] ?? null;
  const activeProgress = activeProgram ? progressMap[activeProgram.id] ?? null : null;

  const logs = useMemo(
    () =>
      [...(activeProgress?.workoutLogs ?? [])].sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      ),
    [activeProgress]
  );

  const allLogs = useMemo(() => {
    return Object.values(progressMap)
      .flatMap((item) => item?.workoutLogs ?? [])
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  }, [progressMap]);

  const monthlyActivity = useMemo(() => buildMonthlyActivity(allLogs), [allLogs]);

  useEffect(() => {
    if (activeProgram && activeProgram.id !== activeProgramId) {
      setActiveProgram(activeProgram.id);
    }
  }, [activeProgram, activeProgramId, setActiveProgram]);

  if (startedPrograms.length === 0 || allLogs.length === 0) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <div style={cardStyle}>
          <h1 style={pageTitleStyle}>Прогресс</h1>
          <p style={mutedTextStyle}>
            Пока нет истории тренировок. Начни программу и заверши хотя бы одну тренировку,
            чтобы увидеть графики и журнал попыток.
          </p>
          <div style={{ marginTop: 16 }}>
            <button style={buttonStyle} onClick={() => navigate("/programs")}>
              Выбрать программу
            </button>
          </div>
        </div>
      </div>
    );
  }

  const completed = activeProgress?.completedWorkouts.length ?? 0;
  const total = activeProgram ? getProgramTotalWorkouts(activeProgram) : 0;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const sliderWidthPercent = 100 / startedPrograms.length;

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
        <h2 style={{ ...pageTitleStyle, marginBottom: 0 }}>Статистика</h2>
      </div>

      <section style={cardStyle}>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Активность за месяц</h2>
          <p style={{ ...mutedTextStyle, marginTop: 8 }}>
            Сколько тренировок ты выполнил за последние 7 дней по всем программам вместе.
          </p>
        </div>

        <WeeklyChart items={monthlyActivity} />
      </section>

      <section
        style={{
          ...cardStyle,
          padding: 16,
          minHeight: 196,
          display: "grid",
          gridTemplateRows: "1fr auto auto",
          gap: 14,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "42px minmax(0, 1fr) 42px",
            gap: 12,
            alignItems: "center",
            minHeight: 108,
          }}
        >
          <ArrowButton
            onClick={() =>
              setSelectedProgramId(startedPrograms[Math.max(activeIndex - 1, 0)]?.id ?? null)
            }
            disabled={activeIndex === 0}
          >
            <ArrowLeftIcon />
          </ArrowButton>

          <div
            style={{
              textAlign: "center",
              minWidth: 0,
              minHeight: 108,
              display: "grid",
              alignContent: "center",
            }}
          >
            <div style={{ fontSize: 13, color: "var(--muted-text-color)", marginBottom: 6 }}>
              Текущая программа
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                lineHeight: 1.15,
                color: "var(--text-color)",
                minHeight: 76,
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 3,
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {activeProgram?.title}
            </div>
            <div style={{ ...mutedTextStyle, marginTop: 6, fontSize: 14 }}>
              {completed}/{total} тренировок · {percent}%
            </div>
          </div>

          <ArrowButton
            onClick={() =>
              setSelectedProgramId(
                startedPrograms[Math.min(activeIndex + 1, startedPrograms.length - 1)]?.id ?? null
              )
            }
            disabled={activeIndex === startedPrograms.length - 1}
          >
            <ArrowRightIcon />
          </ArrowButton>
        </div>

        <div
          style={{
            padding: 4,
            borderRadius: 999,
            background: "var(--soft-bg)",
            position: "relative",
            height: 14,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 2,
              bottom: 2,
              left: `calc(${sliderWidthPercent * activeIndex}% + 2px)`,
              width: `calc(${sliderWidthPercent}% - 4px)`,
              borderRadius: 999,
              background:
                "linear-gradient(90deg, var(--primary-color) 0%, var(--primary-strong) 100%)",
              transition: "left 0.2s ease, width 0.2s ease",
            }}
          />
        </div>

        <div
          style={{
            height: 10,
            borderRadius: 999,
            background: "var(--soft-bg)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${percent}%`,
              height: "100%",
              borderRadius: 999,
              background:
                "linear-gradient(90deg, var(--primary-color) 0%, var(--primary-strong) 100%)",
            }}
          />
        </div>
      </section>

      <section style={cardStyle}>
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>История тренировок</h2>
          <p style={{ ...mutedTextStyle, marginTop: 8 }}>
            Только главное: когда была тренировка, какой был план и что получилось по факту.
          </p>
        </div>

        {logs.length === 0 ? (
          <div style={mutedTextStyle}>Для этой программы пока нет завершённых тренировок.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {logs.map((log) => (
              <HistoryCard
                key={`${activeProgram?.id}-${log.key}-${log.completedAt}`}
                title={activeProgram?.title ?? "Тренировка"}
                log={log}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function HistoryCard({
  title,
  log,
}: {
  title: string;
  log: {
    week: number;
    day: number;
    planned: number[];
    actual: number[];
    plannedTotal: number;
    actualTotal: number;
    completedAt: string;
  };
}) {
  return (
    <div
      style={{
        borderRadius: 22,
        padding: 16,
        background:
          "linear-gradient(180deg, color-mix(in srgb, var(--card-bg) 96%, #ffffff 4%) 0%, var(--soft-bg) 100%)",
        border: "1px solid color-mix(in srgb, var(--border-color) 88%, transparent)",
      }}
    >
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1, marginBottom: 6 }}>
          {title}
        </div>
        <div style={{ fontSize: 14, color: "var(--muted-text-color)" }}>
          Неделя {log.week}, день {log.day} · {formatDateTime(log.completedAt)}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 10,
        }}
      >
        <MetricTile label="План" value={joinMetric(log.planned)} />
        <MetricTile
          label="Факт"
          value={joinMetric(log.actual)}
          tone={log.actualTotal < log.plannedTotal ? "danger" : "default"}
        />
        <MetricTile label="Итог" value={`${log.actualTotal}/${log.plannedTotal}`} />
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "danger";
}) {
  return (
    <div
      style={{
        minHeight: 88,
        borderRadius: 18,
        padding: 12,
        background: "color-mix(in srgb, var(--card-bg) 88%, var(--soft-bg) 12%)",
        border: "1px solid color-mix(in srgb, var(--border-color) 90%, transparent)",
        boxSizing: "border-box",
      }}
    >
      <div style={{ color: "var(--muted-text-color)", fontSize: 13, marginBottom: 8 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 16,
          lineHeight: 1.3,
          fontWeight: 700,
          color: tone === "danger" ? "#d14343" : "var(--text-color)",
          whiteSpace: "normal",
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function WeeklyChart({
  items,
}: {
  items: Array<{
    label: string;
    count: number;
  }>;
}) {
  const maxCount = Math.max(...items.map((item) => item.count), 1);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
          gap: 12,
          minHeight: 180,
        }}
      >
        {items.map((item) => {
          const height = item.count === 0 ? 14 : 14 + Math.round((item.count / maxCount) * 110);

          return (
            <div
              key={item.label}
              style={{
                display: "grid",
                gridTemplateRows: "18px 1fr 20px",
                justifyItems: "center",
                alignItems: "end",
                gap: 10,
                minHeight: 180,
              }}
            >
              <div
                style={{
                  width: "100%",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 13,
                  lineHeight: 1,
                  color: "var(--muted-text-color)",
                }}
              >
                {item.count}
              </div>

              <div
                style={{
                  width: "100%",
                  minHeight: 124,
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    maxWidth: 46,
                    minWidth: 22,
                    height,
                    borderRadius: 18,
                    background:
                      item.count > 0
                        ? "linear-gradient(180deg, #8b5cf6 0%, #4f8df7 100%)"
                        : "color-mix(in srgb, var(--soft-bg) 82%, var(--border-color) 18%)",
                    boxShadow:
                      item.count > 0 ? "0 10px 22px rgba(99, 102, 241, 0.22)" : "none",
                    transition: "height 0.2s ease",
                  }}
                />
              </div>

              <div style={{ fontSize: 13, color: "var(--muted-text-color)" }}>{item.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ArrowButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 42,
        height: 42,
        borderRadius: 14,
        border: "1px solid var(--border-color)",
        background: disabled ? "var(--soft-bg)" : "var(--card-bg)",
        color: disabled ? "var(--muted-text-color)" : "var(--text-color)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        flexShrink: 0,
        display: "grid",
        placeItems: "center",
        padding: 0,
      }}
    >
      {children}
    </button>
  );
}

function ArrowLeftIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12.5 4.5 7 10l5.5 5.5" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m7.5 4.5 5.5 5.5-5.5 5.5" />
    </svg>
  );
}

function joinMetric(values: number[]) {
  return values.join(" / ");
}

function buildMonthlyActivity(logs: WorkoutLogItem[]) {
  const today = startOfDay(new Date());

  return Array.from({ length: DAYS_TO_SHOW }, (_, index) => {
    const dayStart = addDays(today, -(DAYS_TO_SHOW - 1 - index));
    const dayEnd = addDays(dayStart, 1);

    const workoutCount = logs.filter((log) => {
      const completedAt = new Date(log.completedAt);
      return completedAt >= dayStart && completedAt < dayEnd;
    }).length;

    return {
      label: formatShortDate(dayStart),
      count: workoutCount,
    };
  });
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDate(value: Date) {
  return value.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
  });
}
