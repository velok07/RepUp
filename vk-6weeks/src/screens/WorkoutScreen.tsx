import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAppStore } from "../store/appStore";
import { getAdjustedPlanByLevel, getWorkoutByProgress } from "../utils/plan";
import {
  calculateAchievementProgress,
  ACHIEVEMENT_XP_REWARD,
} from "../utils/achievements";
import { achievements } from "../data/achievements";
import { programs } from "../data/programs";
import type { ProgramType } from "../types";
import { parsePositiveInt, sanitizeDigitsInput } from "../utils/numeric";
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
  const [searchParams] = useSearchParams();

  const completeWorkout = useAppStore((s) => s.completeWorkout);
  const failWorkout = useAppStore((s) => s.failWorkout);
  const settings = useAppStore((s) => s.settings);
  const activeWorkoutSessions = useAppStore((s) => s.activeWorkoutSessions);
  const setActiveWorkoutSession = useAppStore((s) => s.setActiveWorkoutSession);
  const clearActiveWorkoutSession = useAppStore((s) => s.clearActiveWorkoutSession);
  const clearPendingAchievements = useAppStore((s) => s.clearPendingAchievements);
  const syncAchievementRewards = useAppStore((s) => s.syncAchievementRewards);

  const program = programs.find((p) => p.id === id);

  const progress = useAppStore((s) =>
    id ? s.progress[id as keyof typeof s.progress] ?? null : null
  );
  const sessionForProgram = id
    ? activeWorkoutSessions[id as ProgramType] ?? null
    : null;

  const [currentStep, setCurrentStep] = useState(sessionForProgram?.currentStep ?? 0);
  const [started, setStarted] = useState(Boolean(sessionForProgram));
  const [finished, setFinished] = useState(false);
  const [stepTimerRunning, setStepTimerRunning] = useState(
    Boolean(sessionForProgram?.stepTimerRunning)
  );
  const [stepTimeLeft, setStepTimeLeft] = useState(sessionForProgram?.stepTimeLeft ?? 0);
  const [stepTimerEndsAt, setStepTimerEndsAt] = useState<string | null>(
    sessionForProgram?.stepTimerEndsAt ?? null
  );
  const [resting, setResting] = useState(Boolean(sessionForProgram?.resting));
  const [restLeft, setRestLeft] = useState(sessionForProgram?.restLeft ?? 0);
  const [restEndsAt, setRestEndsAt] = useState<string | null>(
    sessionForProgram?.restEndsAt ?? null
  );
  const [success, setSuccess] = useState<boolean | null>(null);
  const [editActual, setEditActual] = useState(Boolean(sessionForProgram?.editActual));
  const [actualValue, setActualValue] = useState(sessionForProgram?.actualValue ?? "");
  const [actuals, setActuals] = useState<number[]>(sessionForProgram?.actuals ?? []);
  const [showAchievementToast, setShowAchievementToast] = useState(false);
  const [toastAchievementIds, setToastAchievementIds] = useState<string[]>([]);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [completedWorkoutInfo, setCompletedWorkoutInfo] = useState<{
    week: number;
    day: number;
    title: string;
    plannedTotal: number;
    actualTotal: number;
    gainedXp: number;
    unlockedCount: number;
  } | null>(null);

  const requestedWeek = Number(searchParams.get("week"));
  const requestedDay = Number(searchParams.get("day"));
  const isRepeatMode = searchParams.get("repeat") === "1";

  const workout = useMemo(() => {
    if (!progress || !id) return null;

    if (
      isRepeatMode &&
      Number.isFinite(requestedWeek) &&
      requestedWeek > 0 &&
      Number.isFinite(requestedDay) &&
      requestedDay > 0
    ) {
      return (
        getAdjustedPlanByLevel(
          id as ProgramType,
          progress.level,
          progress.loadAdjustment ?? 1
        ).find((item) => item.week === requestedWeek && item.day === requestedDay) ?? null
      );
    }

    return getWorkoutByProgress(
      id as ProgramType,
      progress.level,
      progress.currentWeek,
      progress.currentDay,
      progress.loadAdjustment ?? 1
    );
  }, [id, isRepeatMode, progress, requestedDay, requestedWeek]);

  const unlockedAchievementItems = useMemo(() => {
    const pendingSet = new Set(toastAchievementIds);
    return achievements.filter((item) => pendingSet.has(item.id));
  }, [toastAchievementIds]);

  const currentWorkoutProgressPercent = workout
    ? Math.round((actuals.length / workout.steps.length) * 100)
    : 0;
  const completedSets = actuals.length;
  const remainingSets = workout ? Math.max(workout.steps.length - completedSets, 0) : 0;
  const plannedValues = workout?.steps.map((step) => step.target) ?? [];
  const plannedTotal = plannedValues.reduce((sum, value) => sum + value, 0);
  const actualTotalSoFar = actuals.reduce((sum, value) => sum + value, 0);
  const nextStep = workout?.steps[currentStep + 1] ?? null;
  const isTimedWorkout = program?.unit === "seconds";
  const previewActualValue = editActual ? Number(actualValue) : null;
  const currentStepPreviewValue =
    previewActualValue !== null && !Number.isNaN(previewActualValue) && previewActualValue >= 0
      ? previewActualValue
      : currentTargetValue(workout, currentStep);
  const parsedActualValue = parsePositiveInt(actualValue);
  const hasValidActualValue =
    actualValue.length > 0 && parsedActualValue !== null && parsedActualValue >= 0;

  const completeRest = () => {
    setRestLeft(0);
    setRestEndsAt(null);
    setResting(false);
    setCurrentStep((current) => current + 1);
    setActualValue("");
    setEditActual(false);
  };

  const resetStepTimer = () => {
    setStepTimerRunning(false);
    setStepTimeLeft(0);
    setStepTimerEndsAt(null);
  };

  useEffect(() => {
    if (!resting || !restEndsAt) return;

    const updateRestState = () => {
      const nextRestLeft = Math.max(
        0,
        Math.ceil((new Date(restEndsAt).getTime() - Date.now()) / 1000)
      );

      if (nextRestLeft <= 0) {
        completeRest();
        return;
      }

      setRestLeft(nextRestLeft);
    };

    updateRestState();

    const timer = window.setInterval(updateRestState, 250);
    return () => clearInterval(timer);
  }, [restEndsAt, resting]);

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

  useEffect(() => {
    if (!workout || !sessionForProgram) return;
    if (sessionForProgram.week === workout.week && sessionForProgram.day === workout.day) return;
    clearActiveWorkoutSession(id as ProgramType);
  }, [clearActiveWorkoutSession, id, sessionForProgram, workout]);

  useEffect(() => {
    if (!id || !workout || !started || finished) return;

    setActiveWorkoutSession({
      programId: id as ProgramType,
      week: workout.week,
      day: workout.day,
      title: workout.title,
      currentStep,
      actuals,
      stepTimerRunning,
      stepTimeLeft,
      stepTimerEndsAt,
      resting,
      restLeft,
      restEndsAt,
      editActual,
      actualValue,
    });
  }, [
    actualValue,
    actuals,
    currentStep,
    editActual,
    finished,
    id,
    stepTimeLeft,
    stepTimerEndsAt,
    stepTimerRunning,
    restEndsAt,
    restLeft,
    resting,
    setActiveWorkoutSession,
    started,
    workout,
  ]);

  if (!program) {
    return <div style={cardStyle}>Программа не найдена</div>;
  }

  if (!progress || !id) {
    return <div style={cardStyle}>Сначала начни программу</div>;
  }

  if (progress.finished && !isRepeatMode && !sessionForProgram) {
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
  const unitLabel = program.unit === "seconds" ? "секунд" : getRepetitionWord(currentTarget);
  const shortUnitLabel = program.unit === "seconds" ? "сек" : "повт";

  const finishOrContinue = (nextActuals: number[]) => {
    const isLast = currentStep >= workout.steps.length - 1;

    if (isLast) {
      const finalPlannedTotal = plannedValues.reduce((sum, value) => sum + value, 0);
      const finalActualTotal = nextActuals.reduce((sum, value) => sum + value, 0);
      const passed = finalActualTotal >= finalPlannedTotal;

      if (passed) {
        completeWorkout(id as ProgramType, {
          week: workout.week,
          day: workout.day,
          planned: plannedValues,
          actual: nextActuals,
        }, { preserveProgress: isRepeatMode });
      } else {
        failWorkout(id as ProgramType, {
          week: workout.week,
          day: workout.day,
          planned: plannedValues,
          actual: nextActuals,
        }, { preserveProgress: isRepeatMode });
      }

      const nextProgress = useAppStore.getState().progress;
      const unlockedIds = calculateAchievementProgress({
        progress: nextProgress,
      }).unlockedIds;

      const rewardedBefore = new Set(useAppStore.getState().userStats.rewardedAchievementIds);
      const newUnlockedIds = unlockedIds.filter((achievementId) => !rewardedBefore.has(achievementId));

      syncAchievementRewards(unlockedIds);
      setShowAchievementToast(newUnlockedIds.length > 0);
      setToastAchievementIds(newUnlockedIds);

      setCompletedWorkoutInfo({
        week: workout.week,
        day: workout.day,
        title: workout.title,
        plannedTotal: finalPlannedTotal,
        actualTotal: finalActualTotal,
        gainedXp: (passed ? 10 : 5) + newUnlockedIds.length * ACHIEVEMENT_XP_REWARD,
        unlockedCount: newUnlockedIds.length,
      });

      clearActiveWorkoutSession(id as ProgramType);
      resetStepTimer();
      setSuccess(passed);
      setFinished(true);
      return;
    }

    const nextRestEndsAt = new Date(Date.now() + settings.restSeconds * 1000).toISOString();
    setRestLeft(settings.restSeconds);
    setRestEndsAt(nextRestEndsAt);
    setResting(true);
    resetStepTimer();
  };

  useEffect(() => {
    if (!stepTimerRunning || !stepTimerEndsAt) return;

    const updateStepTimerState = () => {
      const nextStepTimeLeft = Math.max(
        0,
        Math.ceil((new Date(stepTimerEndsAt).getTime() - Date.now()) / 1000)
      );

      if (nextStepTimeLeft <= 0) {
        const nextActuals = [...actuals, currentTarget];
        setActuals(nextActuals);
        resetStepTimer();
        finishOrContinue(nextActuals);
        return;
      }

      setStepTimeLeft(nextStepTimeLeft);
    };

    updateStepTimerState();

    const timer = window.setInterval(updateStepTimerState, 250);
    return () => clearInterval(timer);
  }, [actuals, currentTarget, finishOrContinue, stepTimerEndsAt, stepTimerRunning]);

  const onStart = () => {
    setStarted(true);
    setCurrentStep(0);
    setFinished(false);
    resetStepTimer();
    setResting(false);
    setActuals([]);
    setRestEndsAt(null);
    setActualValue("");
    setEditActual(false);
    setSuccess(null);
    setShowAchievementToast(false);
    setToastAchievementIds([]);
  };

  const onDoneDefault = () => {
    if (isTimedWorkout) {
      const nextStepTimerEndsAt = new Date(Date.now() + currentTarget * 1000).toISOString();
      setStepTimerRunning(true);
      setStepTimeLeft(currentTarget);
      setStepTimerEndsAt(nextStepTimerEndsAt);
      setEditActual(false);
      setActualValue("");
      return;
    }

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
    if (!hasValidActualValue) return;

    const nextActuals = [...actuals, parsedActualValue];
    setActuals(nextActuals);
    resetStepTimer();
    finishOrContinue(nextActuals);
  };

  const stopTimedAttemptEarly = () => {
    const elapsed = Math.max(0, currentTarget - stepTimeLeft);

    resetStepTimer();
    setEditActual(true);
    setActualValue(String(elapsed));
  };

  const skipRest = () => {
    if (!resting) return;
    completeRest();
  };

  const leaveScreen = (path: string) => {
    clearPendingAchievements();
    setShowAchievementToast(false);
    setToastAchievementIds([]);
    navigate(path);
  };

  const leaveToResult = () => {
    const firstAchievementTitle = unlockedAchievementItems[0]?.title;

    clearPendingAchievements();
    setShowAchievementToast(false);
    setToastAchievementIds([]);
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

  const workoutStructure = (
    <div
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
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontWeight: 800 }}>Структура тренировки</div>
        <div style={{ ...mutedTextStyle, fontSize: 13 }}>
          {completedSets}/{workout.steps.length} готово
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(64px, 1fr))",
          gap: 8,
        }}
      >
        {workout.steps.map((step, index) => {
          const isDone = index < completedSets;
          const isCurrent = index === currentStep && started && !resting && !finished;
          const actualDone = actuals[index] ?? null;
          const isUnderTarget = actualDone !== null && actualDone < step.target;

          return (
            <div
              key={step.index}
              style={{
                padding: "10px 8px",
                borderRadius: 16,
                textAlign: "center",
                background: isUnderTarget
                  ? "rgba(239, 68, 68, 0.10)"
                  : isDone
                  ? "var(--success-bg-soft)"
                  : isCurrent
                  ? "var(--primary-soft-2)"
                  : "var(--soft-bg)",
                border: `1px solid ${
                  isUnderTarget
                    ? "rgba(239, 68, 68, 0.35)"
                    : isDone
                    ? "var(--success-border)"
                    : isCurrent
                    ? "color-mix(in srgb, var(--primary-color) 48%, white 10%)"
                    : "var(--border-color)"
                }`,
              }}
            >
              <div style={{ fontSize: 12, color: "var(--muted-text-color)", marginBottom: 4 }}>
                {step.index}
              </div>
              <div style={{ fontWeight: 900, fontSize: 18 }}>{step.target}</div>
              <div
                style={{
                  fontSize: 12,
                  marginTop: 4,
                  color: isUnderTarget ? "#dc2626" : "var(--muted-text-color)",
                  fontWeight: isCurrent ? 800 : 600,
                }}
              >
                {isDone ? `Факт ${actuals[index] ?? step.target}` : isCurrent ? "Сейчас" : "Дальше"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const scheduleLabel = `Неделя ${workout.week} · День ${workout.day}`;
  const normalizedWorkoutTitle = workout.title.trim().toLowerCase();
  const showWorkoutTitle =
    normalizedWorkoutTitle !== scheduleLabel.toLowerCase() &&
    normalizedWorkoutTitle !== scheduleLabel.replace(" · ", ", ").toLowerCase();

  const heroPanelStyle: React.CSSProperties = {
    ...cardStyle,
    padding: 22,
    height: 372,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: 18,
    overflow: "hidden",
  };

  const handleExitAttempt = () => {
    if (started && !finished) {
      setShowExitDialog(true);
      return;
    }

    leaveScreen(`/plan/${id}`);
  };

  if (finished && completedWorkoutInfo) {
    const completedScheduleLabel = `Неделя ${completedWorkoutInfo.week} · День ${completedWorkoutInfo.day}`;
    const normalizedCompletedTitle = completedWorkoutInfo.title.trim().toLowerCase();
    const showCompletedTitle =
      normalizedCompletedTitle !== completedScheduleLabel.toLowerCase() &&
      normalizedCompletedTitle !==
        completedScheduleLabel.replace(" · ", ", ").toLowerCase();

    return (
      <div style={{ display: "grid", gap: 16, position: "relative" }}>
        {showAchievementToast && unlockedAchievementItems.length > 0 && (
          <div
            style={{
              position: "sticky",
              top: "calc(env(safe-area-inset-top, 0px) + 8px)",
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

          {showCompletedTitle ? <p style={{ marginBottom: 4 }}>{completedWorkoutInfo.title}</p> : null}
          <p style={{ marginTop: showCompletedTitle ? 0 : 6 }}>{completedScheduleLabel}</p>

          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(auto-fit, minmax(132px, 1fr))",
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
              Отлично! Следующая тренировка уже доступна.
            </p>
          ) : (
            <p style={{ opacity: 0.95 }}>
              В одном или нескольких подходах цель не выполнена. Следующая попытка останется на этой же тренировке.
            </p>
          )}

          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              marginTop: 14,
            }}
          >
            <button
              style={{
                ...buttonStyle,
                background: "#fff",
                color: success ? "var(--success-color)" : "var(--danger-color)",
                boxShadow: "none",
                width: "100%",
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
                width: "100%",
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
      {showExitDialog && (
        <ConfirmDialog
          title="Тренировка ещё не завершена"
          description="Сохранить текущие подходы перед выходом?"
          primaryLabel="Сохранить и выйти"
          secondaryLabel="Выйти без сохранения"
          cancelLabel="Отмена"
          onPrimary={() => {
            setShowExitDialog(false);
            leaveScreen(`/plan/${id}`);
          }}
          onSecondary={() => {
            clearActiveWorkoutSession(id as ProgramType);
            setShowExitDialog(false);
            leaveScreen(`/plan/${id}`);
          }}
          onCancel={() => setShowExitDialog(false)}
        />
      )}

      <div style={cardStyle}>
        <div
          style={{
            display: "grid",
            gap: 14,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <h2 style={{ ...pageTitleStyle, marginBottom: 10 }}>{program.title}</h2>
              <p style={{ ...mutedTextStyle, margin: 0 }}>
                {showWorkoutTitle ? `${scheduleLabel} · ${workout.title}` : scheduleLabel}
              </p>
              <div style={{ ...mutedTextStyle, marginTop: 6, fontSize: 13 }}>
                Нагрузка: {progress.loadAdjustment === 0.9 ? "мягче" : progress.loadAdjustment === 1.1 ? "интенсивнее" : "стандарт"}
              </div>
            </div>

            {(started || finished) && (
              <button
                style={{
                  ...secondaryButtonStyle,
                  padding: "10px 14px",
                  minWidth: 84,
                  flexShrink: 0,
                }}
                onClick={handleExitAttempt}
              >
                Выйти
              </button>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 10,
              fontSize: 14,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ ...mutedTextStyle, fontSize: 12, marginBottom: 4 }}>Прогресс тренировки</div>
              <div style={{ fontWeight: 800 }}>{currentWorkoutProgressPercent}%</div>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ ...mutedTextStyle, fontSize: 12, marginBottom: 4 }}>Подходов готово</div>
              <div style={{ fontWeight: 800 }}>
                {completedSets}/{workout.steps.length}
              </div>
            </div>
          </div>
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

      {!started && (
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          }}
        >
          <MiniWorkoutStat label="Сделано подходов" value={String(completedSets)} helper={`Осталось ${remainingSets}`} />
          <MiniWorkoutStat
            label="План на тренировку"
            value={`${plannedTotal} ${shortUnitLabel}`}
            helper={`${workout.steps.length} ${pluralizeSets(workout.steps.length)}`}
          />
          <div style={{ gridColumn: "1 / -1" }}>
            <MiniWorkoutStat label="Факт сейчас" value={`${actualTotalSoFar} ${shortUnitLabel}`} helper="Начни тренировку" />
          </div>
        </div>
      )}

      {!started && (
        <div
          style={{
            ...heroPanelStyle,
            textAlign: "center",
            alignItems: "center",
          }}
        >
          <div style={{ width: "100%", display: "grid", gap: 16, justifyItems: "center" }}>
            <div style={{ fontSize: 48 }}>
              {program.unit === "seconds" ? "⏱️" : "💪"}
            </div>

            <div>
              <h3 style={{ margin: "0 0 10px" }}>Готов к тренировке?</h3>
              <p style={{ ...mutedTextStyle, margin: 0 }}>
                Тебя ждут {workout.steps.length} {pluralizeSets(workout.steps.length)} на {plannedTotal} {shortUnitLabel}
              </p>
            </div>
          </div>

          <button style={{ ...buttonStyle, width: "100%" }} onClick={onStart}>
            Начать тренировку
          </button>
        </div>
      )}

      {started && !resting && !finished && (
        <div
          style={{
            ...heroPanelStyle,
            textAlign: "center",
            background:
              "radial-gradient(circle at top, rgba(124,92,255,0.18), transparent 38%), linear-gradient(180deg, color-mix(in srgb, var(--card-bg) 96%, #0f172a 4%) 0%, var(--card-bg) 100%)",
          }}
        >
          <div
            style={{
              minHeight: 188,
              display: "grid",
              alignContent: "center",
              gap: 14,
            }}
          >
            <div style={{ fontSize: 42, lineHeight: 1 }}>🏋️</div>

            <div
              style={{
                color: "var(--muted-text-color)",
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              Подход {getDisplayedStepIndex(workout.steps[currentStep].index, resting, workout.steps.length)} из {workout.steps.length}
            </div>

            <div
              style={{
                fontSize: 84,
                fontWeight: 900,
                lineHeight: 0.92,
                color: "var(--text-color)",
              }}
            >
              {stepTimerRunning
                ? stepTimeLeft
                : editActual
                ? currentStepPreviewValue
                : currentTarget}
            </div>

            <div style={{ ...mutedTextStyle, fontSize: 15 }}>
              {stepTimerRunning ? "секунд осталось" : unitLabel}
            </div>

            {stepTimerRunning ? (
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--primary-strong)",
                  minHeight: 21,
                }}
              >
                Обратный отсчёт уже идёт
              </div>
            ) : editActual ? (
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--primary-strong)",
                  minHeight: 21,
                }}
              >
                Предпросмотр факта: {currentStepPreviewValue} {shortUnitLabel}
              </div>
            ) : (
              <div style={{ minHeight: 21 }} />
            )}
          </div>

          {!editActual && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) 64px",
                gap: 12,
                width: "100%",
                alignItems: "stretch",
              }}
            >
              <button
                style={{
                  ...buttonStyle,
                  width: "100%",
                  opacity: stepTimerRunning ? 0.75 : 1,
                  cursor: stepTimerRunning ? "default" : "pointer",
                }}
                onClick={onDoneDefault}
                disabled={stepTimerRunning}
              >
                {isTimedWorkout
                  ? stepTimerRunning
                    ? "Таймер запущен"
                    : "Запустить таймер"
                  : "Подход выполнен"}
              </button>

              <button
                onClick={() => {
                  if (isTimedWorkout && stepTimerRunning) {
                    stopTimedAttemptEarly();
                    return;
                  }

                  setEditActual(true);
                  setActualValue(String(currentTarget));
                }}
                aria-label={
                  isTimedWorkout && stepTimerRunning
                    ? "Остановить таймер и ввести факт"
                    : "Изменить фактическое количество"
                }
                title={
                  isTimedWorkout && stepTimerRunning
                    ? "Остановить таймер и ввести факт"
                    : "Изменить фактическое количество"
                }
                style={{
                  width: "100%",
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
                {isTimedWorkout && stepTimerRunning ? (
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
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                ) : (
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
                )}
              </button>
            </div>
          )}

          {editActual && (
            <div style={{ width: "100%", display: "grid", gap: 12 }}>
              <label style={{ display: "block", marginBottom: 0 }}>
                Сколько реально сделал:
              </label>

              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={actualValue}
                onChange={(e) => setActualValue(sanitizeDigitsInput(e.target.value, 4))}
                placeholder={`Введи число (${shortUnitLabel})`}
                aria-invalid={actualValue.length > 0 && !hasValidActualValue}
                style={{
                  ...inputStyle,
                  width: "100%",
                  fontSize: 16,
                  border:
                    actualValue.length > 0 && !hasValidActualValue
                      ? "1px solid var(--danger-color)"
                      : inputStyle.border,
                }}
              />

              {actualValue.length > 0 && !hasValidActualValue ? (
                <div style={{ ...mutedTextStyle, color: "var(--danger-color)" }}>
                  Введи целое число от 0 и выше.
                </div>
              ) : null}

              <div
                style={{
                  display: "grid",
                  gap: 12,
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                }}
              >
                <button
                  style={{
                    ...buttonStyle,
                    width: "100%",
                    opacity: hasValidActualValue ? 1 : 0.5,
                    cursor: hasValidActualValue ? "pointer" : "not-allowed",
                  }}
                  onClick={onDoneCustom}
                  disabled={!hasValidActualValue}
                >
                  Подтвердить
                </button>

                <button
                  style={{ ...secondaryButtonStyle, width: "100%" }}
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
            ...heroPanelStyle,
            background:
              settings.theme === "dark"
                ? "linear-gradient(135deg, color-mix(in srgb, var(--primary-soft-2) 32%, #0f172a 68%) 0%, color-mix(in srgb, var(--primary-soft) 38%, #020617 62%) 100%)"
                : "radial-gradient(circle at top, color-mix(in srgb, #ffffff 44%, transparent) 0%, transparent 36%), linear-gradient(135deg, color-mix(in srgb, var(--primary-soft-2) 72%, #ffffff 28%) 0%, color-mix(in srgb, var(--primary-soft) 78%, #ffffff 22%) 100%)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              minHeight: 188,
              display: "grid",
              alignContent: "center",
              gap: 14,
            }}
          >
            <div style={{ fontSize: 42 }}>⏳</div>
            <h3 style={{ margin: 0, color: "var(--text-color)" }}>Отдых</h3>
            <div
              style={{
                fontSize: 84,
                fontWeight: 900,
                lineHeight: 0.92,
                color: "var(--text-color)",
              }}
            >
              {restLeft}
            </div>
            <p style={{ margin: 0, color: "var(--text-color)" }}>
              Восстановись перед следующим подходом.
            </p>
            <p style={{ fontSize: 14, margin: 0, color: "var(--muted-text-color)" }}>
              Следующий подход: {nextStep ? `${nextStep.target} ${shortUnitLabel}` : "финальный"}
            </p>
          </div>

          <button
            style={{
              ...secondaryButtonStyle,
              width: "100%",
              background: "var(--card-bg)",
              color: "var(--text-color)",
            }}
            onClick={skipRest}
          >
            Пропустить отдых
          </button>
        </div>
      )}

      {started ? workoutStructure : null}
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

function ConfirmDialog({
  title,
  description,
  primaryLabel,
  secondaryLabel,
  cancelLabel,
  onPrimary,
  onSecondary,
  onCancel,
}: {
  title: string;
  description: string;
  primaryLabel: string;
  secondaryLabel: string;
  cancelLabel: string;
  onPrimary: () => void;
  onSecondary: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 40,
        display: "grid",
        placeItems: "center",
        background: "rgba(2, 6, 23, 0.5)",
        padding: 16,
      }}
    >
      <div
        style={{
          ...cardStyle,
          width: "min(100%, 420px)",
          display: "grid",
          gap: 14,
          boxShadow: "0 24px 64px rgba(15, 23, 42, 0.28)",
        }}
      >
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "var(--text-color)", marginBottom: 8 }}>
            {title}
          </div>
          <div style={mutedTextStyle}>{description}</div>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <button style={buttonStyle} onClick={onPrimary}>
            {primaryLabel}
          </button>
          <button style={secondaryButtonStyle} onClick={onSecondary}>
            {secondaryLabel}
          </button>
          <button
            style={{
              border: "none",
              background: "transparent",
              color: "var(--muted-text-color)",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              padding: "8px 12px",
            }}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}


function currentTargetValue(workout: NonNullable<ReturnType<typeof getWorkoutByProgress>> | null, currentStep: number) {
  return workout?.steps[currentStep]?.target ?? 0;
}

function getDisplayedStepIndex(currentIndex: number, resting: boolean, totalSteps: number) {
  if (!resting) return currentIndex;
  return Math.min(currentIndex + 1, totalSteps);
}

function pluralizeSets(count: number) {
  const lastTwo = count % 100;
  const last = count % 10;

  if (lastTwo >= 11 && lastTwo <= 14) return "подходов";
  if (last === 1) return "подход";
  if (last >= 2 && last <= 4) return "подхода";
  return "подходов";
}

function getRepetitionWord(count: number) {
  const lastTwo = count % 100;
  const last = count % 10;

  if (lastTwo >= 11 && lastTwo <= 14) return "повторений";
  if (last === 1) return "повторение";
  if (last >= 2 && last <= 4) return "повторения";
  return "повторений";
}
