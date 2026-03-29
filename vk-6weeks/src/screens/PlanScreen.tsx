import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { plansByProgram } from "../data/plans";
import { programs } from "../data/programs";
import { useAppStore } from "../store/appStore";
import type { ProgramType } from "../types";
import { makeWorkoutKey } from "../utils/plan";
import {
  buttonStyle,
  cardStyle,
  mutedTextStyle,
  pageTitleStyle,
  secondaryButtonStyle,
} from "../components/ui";

export default function PlanScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const setActiveProgram = useAppStore((s) => s.setActiveProgram);

  const program = programs.find((item) => item.id === id);
  const progress = useAppStore((s) =>
    id ? s.progress[id as keyof typeof s.progress] ?? null : null
  );

  const allWorkouts = useMemo(() => {
    if (!progress || !id) return [];
    return plansByProgram[id as ProgramType]?.[progress.level] ?? [];
  }, [progress, id]);

  if (!progress || !id || !program) {
    return (
      <div style={cardStyle}>
        <h2 style={pageTitleStyle}>План</h2>
        <p style={mutedTextStyle}>Сначала начни программу и пройди тест.</p>
      </div>
    );
  }

  const completedSet = new Set(progress.completedWorkouts);
  const currentKey = makeWorkoutKey(progress.currentWeek, progress.currentDay);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          ...cardStyle,
          background:
            "linear-gradient(135deg, var(--primary-color) 0%, var(--primary-strong) 100%)",
          color: "#fff",
          border: "none",
        }}
      >
        <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>План программы</div>
        <h2 style={{ margin: 0, fontSize: 28, lineHeight: 1.1 }}>
          {program.durationWeeks} недель
        </h2>
        <p style={{ marginTop: 12, marginBottom: 14, opacity: 0.95 }}>
          Сейчас открыта: неделя {progress.currentWeek}, день {progress.currentDay}
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            style={{
              ...buttonStyle,
              background: "#fff",
              color: "var(--primary-strong)",
              boxShadow: "none",
            }}
            onClick={() => {
              setActiveProgram(program.id);
              navigate(`/workout/${id}`);
            }}
          >
            К тренировке
          </button>

          <button
            style={{
              ...secondaryButtonStyle,
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.3)",
              color: "#fff",
            }}
            onClick={() => navigate("/progress")}
          >
            Прогресс
          </button>
        </div>
      </div>

      {Array.from({ length: program.durationWeeks }, (_, weekIndex) => {
        const week = weekIndex + 1;
        const weekDays = allWorkouts.filter((item) => item.week === week);

        return (
          <div key={week} style={cardStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
                marginBottom: 14,
                flexWrap: "wrap",
              }}
            >
              <h3 style={{ margin: 0 }}>Неделя {week}</h3>
              <span
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: "var(--primary-soft-2)",
                  color: "var(--primary-strong)",
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                {program.workoutsPerWeek} тренировки
              </span>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {weekDays.map((dayWorkout) => {
                const key = makeWorkoutKey(dayWorkout.week, dayWorkout.day);
                const isCompleted = completedSet.has(key);
                const isCurrent = !progress.finished && key === currentKey;
                const log = progress.workoutLogs.find((item) => item.key === key);

                let status = "Ожидает";
                let bg = "var(--card-bg)";
                let border = "var(--border-color)";
                let badgeBg = "var(--soft-bg)";
                let badgeColor = "var(--muted-text-color)";

                if (isCompleted) {
                  status = "Пройдено";
                  bg = "var(--success-bg-soft)";
                  border = "var(--success-border)";
                  badgeBg = "var(--success-bg)";
                  badgeColor = "var(--success-color)";
                } else if (isCurrent) {
                  status = "Текущая";
                  bg = "var(--primary-soft-2)";
                  border = "#93c5fd";
                  badgeBg = "var(--primary-soft)";
                  badgeColor = "var(--primary-strong)";
                }

                return (
                  <div
                    key={key}
                    style={{
                      border: `1px solid ${border}`,
                      background: bg,
                      borderRadius: 16,
                      padding: 14,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800 }}>День {dayWorkout.day}</div>
                        <div style={{ color: "var(--muted-text-color)", marginTop: 4 }}>
                          {dayWorkout.title}
                        </div>
                      </div>

                      <span
                        style={{
                          padding: "6px 10px",
                          borderRadius: 999,
                          background: badgeBg,
                          color: badgeColor,
                          fontWeight: 700,
                          fontSize: 13,
                        }}
                      >
                        {status}
                      </span>
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <div style={{ color: "var(--muted-text-color)", fontSize: 13, marginBottom: 8 }}>
                        Подходы
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(48px, 1fr))",
                          gap: 8,
                        }}
                      >
                        {dayWorkout.steps.map((step) => (
                          <div
                            key={step.index}
                            style={{
                              textAlign: "center",
                              padding: "10px 8px",
                              borderRadius: 12,
                              background: "var(--card-bg)",
                              border: "1px solid var(--border-color)",
                              fontWeight: 700,
                            }}
                          >
                            {step.target}
                          </div>
                        ))}
                      </div>
                    </div>

                    {log && (
                      <div style={{ ...mutedTextStyle, marginTop: 12, fontSize: 14 }}>
                        Результат: {log.actualTotal} / {log.plannedTotal}
                      </div>
                    )}

                    {(isCurrent || isCompleted) && (
                      <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
                        {isCurrent && (
                          <button
                            style={buttonStyle}
                            onClick={() => {
                              setActiveProgram(program.id);
                              navigate(`/workout/${id}`);
                            }}
                          >
                            Начать эту тренировку
                          </button>
                        )}

                        {isCompleted && (
                          <button
                            style={secondaryButtonStyle}
                            onClick={() => {
                              setActiveProgram(program.id);
                              navigate(`/workout/${id}?week=${dayWorkout.week}&day=${dayWorkout.day}&repeat=1`);
                            }}
                          >
                            Повторить
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
