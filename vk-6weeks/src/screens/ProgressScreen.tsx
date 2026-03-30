import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { buttonStyle, cardStyle, mutedTextStyle, pageTitleStyle } from "../components/ui";
import { programs } from "../data/programs";
import { useAppStore } from "../store/appStore";
import { getProgramTotalWorkouts } from "../utils/plan";

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
      <section style={cardStyle}>
        <h1 style={pageTitleStyle}>Прогресс</h1>
      </section>

      <section style={cardStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 14,
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
            <div style={{ fontSize: 20, fontWeight: 900, lineHeight: 1.15 }}>
              {activeProgram?.title}
            </div>
            <div style={{ ...mutedTextStyle, marginTop: 6 }}>
              Неделя {activeProgress?.currentWeek} · День {activeProgress?.currentDay}
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
            borderRadius: 18,
            padding: 16,
            background: "var(--soft-bg)",
            border: "1px solid var(--border-color)",
            marginBottom: 14,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
            <div style={{ fontWeight: 800 }}>Готово тренировок</div>
            <div style={{ fontWeight: 900 }}>{completed}/{total}</div>
          </div>

          <div
            style={{
              height: 10,
              borderRadius: 999,
              background: "var(--card-bg)",
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
        </div>
      </section>

      <section style={cardStyle}>
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ margin: 0 }}>История</h2>
          <p style={{ ...mutedTextStyle, marginTop: 8 }}>
            Только главное: дата, план и фактический результат.
          </p>
        </div>

        {logs.length === 0 ? (
          <div style={{ ...mutedTextStyle }}>Для этой программы пока нет тренировок.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {logs.map((log) => (
              <div
                key={`${activeProgram?.id}-${log.key}-${log.completedAt}`}
                style={{
                  borderRadius: 18,
                  padding: 16,
                  background: "var(--soft-bg)",
                  border: "1px solid var(--border-color)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                  <div style={{ fontWeight: 800 }}>
                    Неделя {log.week} · День {log.day}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--muted-text-color)" }}>
                    {formatDate(log.completedAt)}
                  </div>
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <InfoRow label="План" value={log.planned.join(" / ")} />
                  <InfoRow label="Факт" value={log.actual.join(" / ")} tone={log.actualTotal < log.plannedTotal ? "danger" : "default"} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function InfoRow({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "danger";
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
      <div style={{ color: "var(--muted-text-color)", fontSize: 14 }}>{label}</div>
      <div style={{ fontWeight: 800, color: tone === "danger" ? "#dc2626" : "var(--text-color)", textAlign: "right" }}>{value}</div>
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
        fontWeight: 900,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
