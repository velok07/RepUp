import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { buttonStyle, cardStyle, mutedTextStyle, pageTitleStyle } from "../components/ui";
import { programs } from "../data/programs";
import { useAppStore } from "../store/appStore";
import { getProgramTotalWorkouts } from "../utils/plan";

const WEEKS_TO_SHOW = 6;

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

  const weeklyActivity = useMemo(() => buildWeeklyActivity(logs), [logs]);

  useEffect(() => {
    if (activeProgram && activeProgram.id !== activeProgramId) {
      setActiveProgram(activeProgram.id);
    }
  }, [activeProgram, activeProgramId, setActiveProgram]);

  if (startedPrograms.length === 0) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <div style={cardStyle}>
          <h1 style={pageTitleStyle}>Прогресс</h1>
          <p style={mutedTextStyle}>
            Пока нет истории тренировок. Начни программу, чтобы отслеживать прогресс.
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

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section
        style={{
          ...cardStyle,
          padding: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <ArrowButton
            onClick={() =>
              setSelectedProgramId(startedPrograms[Math.max(activeIndex - 1, 0)]?.id ?? null)
            }
            disabled={activeIndex === 0}
          >
            ←
          </ArrowButton>

          <div style={{ textAlign: "center", minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, color: "var(--muted-text-color)", marginBottom: 4 }}>
              Текущая программа
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                lineHeight: 1.15,
                color: "var(--text-color)",
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
            →
          </ArrowButton>
        </div>

        <div
          style={{
            height: 10,
            borderRadius: 999,
            background: "var(--soft-bg)",
            overflow: "hidden",
            marginTop: 16,
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
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Активность по неделям</h2>
          <p style={{ ...mutedTextStyle, marginTop: 8 }}>
            Сколько тренировок ты сделал за последние 6 недель.
          </p>
        </div>

        <WeeklyChart items={weeklyActivity} />
      </section>

      <section style={cardStyle}>
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>История тренировок</h2>
          <p style={{ ...mutedTextStyle, marginTop: 8 }}>
            Только главное: когда была тренировка, какой был план и что получилось по факту.
          </p>
        </div>

        {logs.length === 0 ? (
          <div style={mutedTextStyle}>Для этой программы пока нет тренировок.</div>
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
        <MetricTile label="План" value={splitMetric(log.planned)} />
        <MetricTile
          label="Факт"
          value={splitMetric(log.actual)}
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
          whiteSpace: "pre-line",
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
    <div
      style={{
        display: "grid",
        gap: 10,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
          gap: 14,
          minHeight: 176,
        }}
      >
        {items.map((item) => {
          const height = item.count === 0 ? 18 : Math.max((item.count / maxCount) * 112, 28);

          return (
            <div
              key={item.label}
              style={{
                display: "grid",
                gridTemplateRows: "18px 1fr 20px",
                justifyItems: "center",
                alignItems: "end",
                gap: 10,
                minHeight: 176,
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
                  minHeight: 118,
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
        fontSize: 18,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

function splitMetric(values: number[]) {
  return values.length <= 4
    ? values.join(" / ")
    : `${values.slice(0, 4).join(" / ")}\n/ ${values.slice(4).join(" / ")}`;
}

function buildWeeklyActivity(
  logs: Array<{
    completedAt: string;
  }>
) {
  const currentWeekStart = startOfWeek(new Date());

  return Array.from({ length: WEEKS_TO_SHOW }, (_, index) => {
    const weekStart = addDays(currentWeekStart, -(WEEKS_TO_SHOW - 1 - index) * 7);
    const weekEnd = addDays(weekStart, 7);

    const count = logs.filter((log) => {
      const completedAt = new Date(log.completedAt);
      return completedAt >= weekStart && completedAt < weekEnd;
    }).length;

    return {
      label: formatShortDate(weekStart),
      count,
    };
  });
}

function startOfWeek(date: Date) {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() + diff);
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
