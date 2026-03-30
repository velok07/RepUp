import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAppStore } from "../store/appStore";
import { getWorkoutByProgress } from "../utils/plan";
import {
  calculateAchievementProgress,
  ACHIEVEMENT_XP_REWARD,
} from "../utils/achievements";
import { achievements } from "../data/achievements";
import { programs } from "../data/programs";
import type { ProgramType } from "../types";
import {
  buttonStyle,
  cardStyle,
  inputStyle,
  mutedTextStyle,
  pageTitleStyle,
  secondaryButtonStyle,
} from "../components/ui";

export default function WorkoutScreen() {
  const { id } = useParams();
  const navigate = useNavigate();

  const completeWorkout = useAppStore((s) => s.completeWorkout);
  const failWorkout = useAppStore((s) => s.failWorkout);
  const settings = useAppStore((s) => s.settings);
  const pendingAchievementIds = useAppStore((s) => s.userStats.pendingAchievementIds);
  const clearPendingAchievements = useAppStore((s) => s.clearPendingAchievements);
  const syncAchievementRewards = useAppStore((s) => s.syncAchievementRewards);

  const program = programs.find((p) => p.id === id);

  const progress = useAppStore((s) =>
    id ? s.progress[id as keyof typeof s.progress] ?? null : null
  );

  const [currentStep, setCurrentStep] = useState(0);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [resting, setResting] = useState(false);
  const [restLeft, setRestLeft] = useState(0);
  const [success, setSuccess] = useState<boolean | null>(null);
  const [editActual, setEditActual] = useState(false);
  const [actualValue, setActualValue] = useState("");
  const [actuals, setActuals] = useState<number[]>([]);
  const [showAchievementToast, setShowAchievementToast] = useState(false);
  const [completedWorkoutInfo, setCompletedWorkoutInfo] = useState<{
    week: number;
    day: number;
    title: string;
    plannedTotal: number;
    actualTotal: number;
    gainedXp: number;
    unlockedCount: number;
  } | null>(null);

  const workout = useMemo(() => {
    if (!progress || !id) return null;
    return getWorkoutByProgress(
      id as ProgramType,
      progress.level,
      progress.currentWeek,
      progress.currentDay
    );
  }, [progress, id]);

  const unlockedAchievementItems = useMemo(() => {
    const pendingSet = new Set(pendingAchievementIds);
    return achievements.filter((item) => pendingSet.has(item.id));
  }, [pendingAchievementIds]);

  const currentWorkoutProgressPercent = workout
    ? Math.round((actuals.length / workout.steps.length) * 100)
    : 0;
  const completedSets = actuals.length;
  const remainingSets = workout ? Math.max(workout.steps.length - completedSets, 0) : 0;
  const plannedValues = workout?.steps.map((step) => step.target) ?? [];
  const plannedTotal = plannedValues.reduce((sum, value) => sum + value, 0);
  const actualTotalSoFar = actuals.reduce((sum, value) => sum + value, 0);
  const nextStep = workout?.steps[currentStep + 1] ?? null;
  const previewActualValue = editActual ? Number(actualValue) : null;
  const currentStepPreviewValue =
    previewActualValue !== null && !Number.isNaN(previewActualValue) && previewActualValue >= 0
      ? previewActualValue
      : currentTargetValue(workout, currentStep);

  useEffect(() => {
    if (!resting || restLeft <= 0) return;

    const timer = window.setTimeout(() => {
      setRestLeft((prev) => {
        if (prev <= 1) {
          setResting(false);
          setCurrentStep((current) => current + 1);
          setActualValue("");
          setEditActual(false);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [resting, restLeft]);

  useEffect(() => {
    if (!showAchievementToast) return;

    const timer = window.setTimeout(() => {
      setShowAchievementToast(false);
    }, 3500);

    return () => clearTimeout(timer);
  }, [showAchievementToast]);

  useEffect(() => {
    if (!(started && !finished)) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [started, finished]);

  if (!program) {
    return <div style={cardStyle}>Программа не найдена</div>;
  }

  if (!progress || !id) {
    return <div style={cardStyle}>Сначала начни программу</div>;
  }

  if (progress.finished) {
    return (
      <div style={cardStyle}>
        <h2 style={pageTitleStyle}>Программа завершена</h2>
        <p style={mutedTextStyle}>
          Эта программа уже полностью пройдена. Можно посмотреть прогресс или выбрать новую.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button style={buttonStyle} onClick={() => navigate("/progress")}>Прогресс</button>
          <button style={secondaryButtonStyle} onClick={() => navigate("/programs")}>Все программы</button>
        </div>
      </div>
    );
  }

  if (!workout) {
    return <div style={cardStyle}>Тренировка не найдена</div>;
  }

  const currentTarget = workout.steps[currentStep].target;
  const unitLabel = program.unit === "seconds" ? "секунд" : "повторений";
  const shortUnitLabel = program.unit === "seconds" ? "сек" : "повт";

  const finishOrContinue = (nextActuals: number[]) => {
    const isLast = currentStep >= workout.steps.length - 1;

    if (isLast) {
      const passed = workout.steps.every((step, idx) => {
        return (nextActuals[idx] ?? 0) >= step.target;
      });

      const finalPlannedTotal = plannedValues.reduce((sum, value) => sum + value, 0);
      const finalActualTotal = nextActuals.reduce((sum, value) => sum + value, 0);

      if (passed) {
        completeWorkout(id as ProgramType, {
          week: workout.week,
          day: workout.day,
          planned: plannedValues,
          actual: nextActuals,
        });
      } else {
        failWorkout(id as ProgramType, {
          week: workout.week,
          day: workout.day,
          planned: plannedValues,
          actual: nextActuals,
        });
      }

      const nextProgress = useAppStore.getState().progress;
      const unlockedIds = calculateAchievementProgress({
        progress: nextProgress,
      }).unlockedIds;

      const rewardedBefore = new Set(useAppStore.getState().userStats.rewardedAchievementIds);
      const newUnlockedIds = unlockedIds.filter((achievementId) => !rewardedBefore.has(achievementId));

      syncAchievementRewards(unlockedIds);
      setShowAchievementToast(newUnlockedIds.length > 0);

      setCompletedWorkoutInfo({
        week: workout.week,
        day: workout.day,
        title: workout.title,
        plannedTotal: finalPlannedTotal,
        actualTotal: finalActualTotal,
        gainedXp: (passed ? 10 : 5) + newUnlockedIds.length * ACHIEVEMENT_XP_REWARD,
        unlockedCount: newUnlockedIds.length,
      });

      setSuccess(passed);
      setFinished(true);
      return;
    }

    setRestLeft(settings.restSeconds);
    setResting(true);
  };

  const onStart = () => {
    setStarted(true);
    setCurrentStep(0);
    setFinished(false);
    setResting(false);
    setActuals([]);
    setActualValue("");
    setEditActual(false);
    setSuccess(null);
    setShowAchievementToast(false);
  };

  const onDoneDefault = () => {
    if (!settings.autoFillTargetOnComplete) {
      setEditActual(true);
      setActualValue(String(currentTarget));
      return;
    }

    const nextActuals = [...actuals, currentTarget];
    setActuals(nextActuals);
    finishOrContinue(nextActuals);
  };

  const onDoneCustom = () => {
    const actual = Number(actualValue);
    if (Number.isNaN(actual) || actual < 0) return;

    const nextActuals = [...actuals, actual];
    setActuals(nextActuals);
    finishOrContinue(nextActuals);
  };

  const skipRest = () => {
    setRestLeft(0);
  };

  const leaveScreen = (path: string) => {
    clearPendingAchievements();
    setShowAchievementToast(false);
    navigate(path);
  };

  const leaveToResult = () => {
    const firstAchievementTitle = unlockedAchievementItems[0]?.title;

    clearPendingAchievements();
    setShowAchievementToast(false);
    navigate("/result", {
      state: {
        title: completedWorkoutInfo?.title ?? workout.title,
        week: completedWorkoutInfo?.week ?? workout.week,
        day: completedWorkoutInfo?.day ?? workout.day,
        plannedTotal: completedWorkoutInfo?.plannedTotal ?? plannedTotal,
        actualTotal: completedWorkoutInfo?.actualTotal ?? actualTotalSoFar,
        gainedXp: completedWorkoutInfo?.gainedXp ?? 0,
        achievementTitle: firstAchievementTitle,
      },
    });
  };

  const handleExitAttempt = () => {
    if (started && !finished) {
      const confirmed = window.confirm(
        "Тренировка еще не завершена. Выйти без сохранения текущего подхода?"
      );

      if (!confirmed) return;
    }

    leaveScreen(`/plan/${id}`);
  };

  if (finished && completedWorkoutInfo) {
    return (
      <div style={{ display: "grid", gap: 16, position: "relative" }}>
        {showAchievementToast && unlockedAchievementItems.length > 0 && (
          <div
            style={{
              position: "sticky",
              top: 8,
              zIndex: 20,
            }}
          >
            <div
              style={{
                border: "1px solid var(--success-border)",
                background: "var(--success-bg-soft)",
                color: "var(--text-color)",
                borderRadius: 18,
                padding: 14,
                boxShadow: "var(--card-shadow)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: "var(--success-color)",
                      marginBottom: 6,
                    }}
                  >
                    🏆 Новое достижение
                  </div>

                  {unlockedAchievementItems.map((item) => (
                    <div key={item.id} style={{ marginBottom: 6 }}>
                      <div style={{ fontWeight: 800 }}>{item.title}</div>
                      <div style={{ ...mutedTextStyle, fontSize: 14 }}>
                        {item.description}
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: 999,
                    background: "var(--success-bg)",
                    color: "var(--success-color)",
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                  }}
                >
                  +{unlockedAchievementItems.length * ACHIEVEMENT_XP_REWARD} XP
                </div>
              </div>
            </div>
          </div>
        )}

        <div
          style={{
            ...cardStyle,
            background: success
              ? "linear-gradient(135deg, var(--success-color) 0%, #166534 100%)"
              : "linear-gradient(135deg, var(--danger-color) 0%, #7f1d1d 100%)",
            color: "#fff",
            border: "none",
          }}
        >
          <h2 style={{ marginTop: 0 }}>
            {success ? "Тренировка завершена 🎉" : "Тренировка не засчитана"}
          </h2>

          <p style={{ marginBottom: 4 }}>{completedWorkoutInfo.title}</p>
          <p>
            Неделя {completedWorkoutInfo.week}, день {completedWorkoutInfo.day}
          </p>

          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              marginTop: 16,
              marginBottom: 16,
            }}
          >
            <ResultStat label="По плану" value={`${completedWorkoutInfo.plannedTotal} ${shortUnitLabel}`} />
            <ResultStat label="Сделано" value={`${completedWorkoutInfo.actualTotal} ${shortUnitLabel}`} />
            <ResultStat label="Получено XP" value={`+${completedWorkoutInfo.gainedXp}`} />
            <ResultStat label="Достижений" value={String(completedWorkoutInfo.unlockedCount)} />
          </div>

          {success ? (
            <p style={{ opacity: 0.95 }}>
              Отлично. Следующий раз откроется следующая тренировка.
            </p>
          ) : (
            <p style={{ opacity: 0.95 }}>
              В одном или нескольких подходах цель не выполнена. Следующая попытка останется на этой же тренировке.
            </p>
          )}

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
            <button
              style={{
                ...buttonStyle,
                background: "#fff",
                color: success ? "var(--success-color)" : "var(--danger-color)",
                boxShadow: "none",
              }}
              onClick={leaveToResult}
            >
              Продолжить
            </button>

            <button
              style={{
                ...secondaryButtonStyle,
                background: "rgba(255,255,255,0.14)",
                border: "1px solid rgba(255,255,255,0.35)",
                color: "#fff",
              }}
              onClick={() => leaveScreen("/progress")}
            >
              Посмотреть прогресс
            </button>
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Результат по подходам</h3>
          <div style={{ display: "grid", gap: 10 }}>
            {workout.steps.map((step, idx) => {
              const actual = actuals[idx] ?? 0;
              const done = actual >= step.target;

              return (
                <div
                  key={step.index}
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    background: done ? "var(--success-bg-soft)" : "var(--soft-bg)",
                    border: `1px solid ${done ? "var(--success-border)" : "var(--border-color)"}`,
                  }}
                >
                  Подход {step.index}: цель {step.target} {shortUnitLabel}, выполнено {actual} {shortUnitLabel}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          <div>
            <h2 style={pageTitleStyle}>{program.title}</h2>
            <p style={mutedTextStyle}>
              Неделя {workout.week} · День {workout.day} · {workout.title}
            </p>
          </div>

          {(started || finished) && (
            <button style={secondaryButtonStyle} onClick={handleExitAttempt}>
              Выйти
            </button>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            fontSize: 14,
            marginBottom: 8,
          }}
        >
          <span>Прогресс тренировки: {currentWorkoutProgressPercent}%</span>
          <span>
            Подходов готово: {completedSets}/{workout.steps.length}
          </span>
        </div>

        <div
          style={{
            height: 12,
            borderRadius: 999,
            background: "var(--soft-bg)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${currentWorkoutProgressPercent}%`,
              height: "100%",
              borderRadius: 999,
              background: "linear-gradient(90deg, var(--primary-color) 0%, var(--primary-strong) 100%)",
            }}
          />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        }}
      >
        <MiniWorkoutStat label="Сделано подходов" value={String(completedSets)} helper={`Осталось ${remainingSets}`} />
        <MiniWorkoutStat label="План на тренировку" value={`${plannedTotal} ${shortUnitLabel}`} helper={`${workout.steps.length} подходов`} />
        <MiniWorkoutStat label="Факт сейчас" value={`${actualTotalSoFar} ${shortUnitLabel}`} helper={started ? "Обновляется после каждого подхода" : "Начни тренировку"} />
      </div>

      <div style={cardStyle}>
        <div style={{ marginBottom: 10, fontWeight: 700 }}>Структура тренировки</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(58px, 1fr))",
            gap: 8,
          }}
        >
          {workout.steps.map((step, index) => {
            const isDone = index < completedSets;
            const isCurrent = index === currentStep && started && !resting && !finished;
            const isUpcoming = index > completedSets;
            const actualDone = actuals[index] ?? null;
            const isUnderTarget = actualDone !== null && actualDone < step.target;

            return (
              <div
                key={step.index}
                style={{
                  padding: "12px 8px",
                  borderRadius: 14,
                  textAlign: "center",
                  background: isUnderTarget
                    ? "rgba(239, 68, 68, 0.10)"
                    : isDone
                    ? "var(--success-bg-soft)"
                    : isCurrent
                    ? "var(--primary-soft-2)"
                    : "var(--card-bg)",
                  border: `1px solid ${
                    isUnderTarget
                      ? "rgba(239, 68, 68, 0.35)"
                      : isDone
                      ? "var(--success-border)"
                      : isCurrent
                      ? "#93c5fd"
                      : "var(--border-color)"
                  }`,
                  opacity: isUpcoming && started ? 0.95 : 1,
                }}
              >
                <div style={{ fontSize: 12, color: "var(--muted-text-color)", marginBottom: 4 }}>
                  {step.index}
                </div>
                <div style={{ fontWeight: 800 }}>
                  {index === currentStep && started && !finished && editActual
                    ? currentStepPreviewValue
                    : step.target}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    marginTop: 4,
                    color: isUnderTarget ? "#dc2626" : "inherit",
                    fontWeight: isUnderTarget ? 800 : 500,
                  }}
                >
                  {isDone ? `Факт ${actuals[index] ?? step.target}` : isCurrent ? "Сейчас" : "Дальше"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {!started && (
        <div
          style={{
            ...cardStyle,
            textAlign: "center",
            paddingTop: 28,
            paddingBottom: 28,
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 10 }}>
            {program.unit === "seconds" ? "⏱️" : "💪"}
          </div>

          <h3 style={{ marginTop: 0 }}>Готов к тренировке?</h3>

          <p style={{ ...mutedTextStyle, marginBottom: 16 }}>
            Тебя ждут {workout.steps.length} подходов на {plannedTotal} {shortUnitLabel}
          </p>

          <button style={buttonStyle} onClick={onStart}>
            Начать тренировку
          </button>
        </div>
      )}

      {started && !resting && !finished && (
        <div
          style={{
            ...cardStyle,
            textAlign: "center",
            paddingTop: 22,
            paddingBottom: 24,
            position: "sticky",
            top: 8,
            zIndex: 5,
          }}
        >
          <div
            style={{
              color: "var(--muted-text-color)",
              marginBottom: 10,
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            Подход {workout.steps[currentStep].index} из {workout.steps.length}
          </div>

          <div
            style={{
              fontSize: 68,
              fontWeight: 900,
              lineHeight: 0.95,
              marginBottom: 10,
              color: "var(--text-color)",
            }}
          >
            {editActual ? currentStepPreviewValue : currentTarget}
          </div>

          <div
            style={{
              ...mutedTextStyle,
              marginBottom: 16,
              fontSize: 15,
            }}
          >
            {unitLabel}
          </div>

          <div
            style={{
              display: "grid",
              gap: 10,
              gridTemplateColumns: "1fr",
              maxWidth: 320,
              margin: "0 auto 18px",
            }}
          >
            <div
              style={{
                borderRadius: 18,
                padding: "14px 16px",
                background: "var(--soft-bg)",
                border: "1px solid var(--border-color)",
              }}
            >
              <div style={{ fontSize: 12, color: "var(--muted-text-color)", marginBottom: 6 }}>
                Готово подходов
              </div>
              <div style={{ fontSize: 28, fontWeight: 900 }}>
                {completedSets}/{workout.steps.length}
              </div>
            </div>
          </div>

          {editActual && (
            <div
              style={{
                marginBottom: 12,
                fontSize: 14,
                fontWeight: 700,
                color: "var(--primary-strong)",
              }}
            >
              Предпросмотр факта: {currentStepPreviewValue} {shortUnitLabel}
            </div>
          )}

          <div style={{ ...mutedTextStyle, fontSize: 14, marginBottom: 18 }}>
            Выполнено сейчас: {actualTotalSoFar} {shortUnitLabel}
            {nextStep ? ` · Следующий подход: ${nextStep.target} ${shortUnitLabel}` : " · Это финальный подход"}
          </div>

          {!editActual && (
            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <button style={buttonStyle} onClick={onDoneDefault}>
                Подход выполнен
              </button>

              <button
                onClick={() => {
                  setEditActual(true);
                  setActualValue(String(currentTarget));
                }}
                aria-label="Изменить фактическое количество"
                title="Изменить фактическое количество"
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  border: "1px solid color-mix(in srgb, var(--primary-color) 28%, transparent)",
                  background: "var(--primary-soft-2)",
                  color: "var(--primary-strong)",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  boxShadow: "0 10px 24px rgba(124, 92, 255, 0.18)",
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="24"
                  height="24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
                </svg>
              </button>
            </div>
          )}

          {editActual && (
            <div style={{ marginTop: 12 }}>
              <label style={{ display: "block", marginBottom: 8 }}>
                Сколько реально сделал:
              </label>

              <input
                type="number"
                value={actualValue}
                onChange={(e) => setActualValue(e.target.value)}
                placeholder={`Введи число (${shortUnitLabel})`}
                style={{ ...inputStyle, maxWidth: 260, margin: "0 auto 12px" }}
              />

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                <button style={buttonStyle} onClick={onDoneCustom}>
                  Подтвердить
                </button>

                <button
                  style={secondaryButtonStyle}
                  onClick={() => {
                    setEditActual(false);
                    setActualValue("");
                  }}
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {started && resting && (
        <div
          style={{
            ...cardStyle,
            textAlign: "center",
            paddingTop: 28,
            paddingBottom: 28,
            background:
              "linear-gradient(135deg, var(--primary-soft-2) 0%, var(--primary-soft) 100%)",
          }}
        >
          <div style={{ fontSize: 42, marginBottom: 10 }}>⏳</div>
          <h3 style={{ marginTop: 0 }}>Отдых</h3>
          <div style={{ fontSize: 56, fontWeight: 800, lineHeight: 1, marginBottom: 10 }}>
            {restLeft}
          </div>
          <p style={{ ...mutedTextStyle, marginBottom: 14 }}>Восстановись перед следующим подходом.</p>
          <p style={{ ...mutedTextStyle, fontSize: 14, marginBottom: 18 }}>
            Следующий подход: {nextStep ? `${nextStep.target} ${shortUnitLabel}` : "финальный"}
          </p>

          <button style={secondaryButtonStyle} onClick={skipRest}>
            Пропустить отдых
          </button>
        </div>
      )}
    </div>
  );
}

function MiniWorkoutStat({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div style={cardStyle}>
      <div style={{ color: "var(--muted-text-color)", fontSize: 13, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>{value}</div>
      <div style={{ ...mutedTextStyle, fontSize: 13 }}>{helper}</div>
    </div>
  );
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 16,
        background: "rgba(255,255,255,0.14)",
        border: "1px solid rgba(255,255,255,0.22)",
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800 }}>{value}</div>
    </div>
  );
}


function currentTargetValue(workout: NonNullable<ReturnType<typeof getWorkoutByProgress>> | null, currentStep: number) {
  return workout?.steps[currentStep]?.target ?? 0;
}
