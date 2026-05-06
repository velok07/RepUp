import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useCallback } from "react";
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
  const [isDesktopWide, setIsDesktopWide] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : false
  );
  const [completedWorkoutInfo, setCompletedWorkoutInfo] = useState<{
    week: number;
    day: number;
    title: string;
    planned: number[];
    actual: number[];
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

  const plannedValues = useMemo(
    () => workout?.steps.map((step) => step.target) ?? [],
    [workout]
  );
  const plannedTotal = useMemo(
    () => plannedValues.reduce((sum, value) => sum + value, 0),
    [plannedValues]
  );
  const actualTotalSoFar = actuals.reduce((sum, value) => sum + value, 0);
  const isTimedWorkout = program?.unit === "seconds";
  const previewActualValue = editActual ? Number(actualValue) : null;
  const currentStepPreviewValue =
    previewActualValue !== null && !Number.isNaN(previewActualValue) && previewActualValue >= 0
      ? previewActualValue
      : currentTargetValue(workout, currentStep);
  const parsedActualValue = parsePositiveInt(actualValue);
  const hasValidActualValue =
    actualValue.length > 0 && parsedActualValue !== null && parsedActualValue >= 0;

  const resetStepTimer = useCallback(() => {
    setStepTimerRunning(false);
    setStepTimeLeft(0);
    setStepTimerEndsAt(null);
  }, [setStepTimeLeft, setStepTimerEndsAt, setStepTimerRunning]);

  const startTimedStep = useCallback((durationSeconds: number) => {
    const nextStepTimerEndsAt = new Date(Date.now() + durationSeconds * 1000).toISOString();
    setStepTimerRunning(true);
    setStepTimeLeft(durationSeconds);
    setStepTimerEndsAt(nextStepTimerEndsAt);
    setEditActual(false);
    setActualValue("");
  }, [
    setActualValue,
    setEditActual,
    setStepTimeLeft,
    setStepTimerEndsAt,
    setStepTimerRunning,
  ]);

  const completeRest = useCallback(() => {
    const nextStep = currentStep + 1;

    setRestLeft(0);
    setRestEndsAt(null);
    setResting(false);
    setCurrentStep(nextStep);
    setActualValue("");
    setEditActual(false);

    if (isTimedWorkout && workout && actuals[nextStep] === undefined) {
      startTimedStep(currentTargetValue(workout, nextStep));
    }
  }, [
    actuals,
    currentStep,
    isTimedWorkout,
    setActualValue,
    setCurrentStep,
    setEditActual,
    setRestEndsAt,
    setResting,
    startTimedStep,
    workout,
  ]);

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
  }, [completeRest, restEndsAt, resting]);

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
    const syncViewport = () => setIsDesktopWide(window.innerWidth >= 768);
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

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

  const currentTarget = workout?.steps[currentStep]?.target ?? 0;

  const finishOrContinue = useCallback((nextActuals: number[]) => {
    if (!id || !workout) return;

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
        planned: [...plannedValues],
        actual: [...nextActuals],
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
  }, [
    clearActiveWorkoutSession,
    completeWorkout,
    currentStep,
    failWorkout,
    id,
    isRepeatMode,
    plannedValues,
    resetStepTimer,
    settings.restSeconds,
    setCompletedWorkoutInfo,
    setFinished,
    setRestEndsAt,
    setResting,
    setShowAchievementToast,
    setSuccess,
    setToastAchievementIds,
    syncAchievementRewards,
    workout,
  ]);

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
  }, [actuals, currentTarget, finishOrContinue, resetStepTimer, stepTimerEndsAt, stepTimerRunning]);

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

  const programGlyph = getProgramGlyph(program.id, program.unit);
  const shortUnitLabel = program.unit === "seconds" ? "сек" : "повт";

  const onStart = () => {
    setStarted(true);
    setCurrentStep(0);
    setFinished(false);
    setResting(false);
    setActuals([]);
    setRestEndsAt(null);
    setActualValue("");
    setEditActual(false);
    setSuccess(null);
    setShowAchievementToast(false);
    setToastAchievementIds([]);

    if (isTimedWorkout) {
      startTimedStep(currentTarget);
    } else {
      resetStepTimer();
    }
  };

  const onDoneDefault = () => {
    if (isTimedWorkout) {
      startTimedStep(currentTarget);
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
    setEditActual(false);
    setActualValue("");
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

  const stopTimedAttemptAndContinue = () => {
    const elapsed = Math.max(0, currentTarget - stepTimeLeft);
    const nextActuals = [...actuals, elapsed];

    resetStepTimer();
    setEditActual(false);
    setActualValue("");
    setActuals(nextActuals);
    finishOrContinue(nextActuals);
  };

  const skipRest = () => {
    if (!resting) return;
    completeRest();
  };

  const persistCurrentSession = () => {
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

  const scheduleLabel = `Неделя ${workout.week} · День ${workout.day}`;
  const heroPanelStyle: React.CSSProperties = {
    ...cardStyle,
    padding: isDesktopWide ? "24px 24px 26px" : 22,
    width: "100%",
    maxWidth: isDesktopWide ? 780 : "100%",
    margin: isDesktopWide ? "0 auto" : undefined,
    height: isDesktopWide ? "auto" : "calc(100svh - 164px)",
    minHeight: isDesktopWide ? 0 : 372,
    maxHeight: isDesktopWide ? "none" : "calc(100svh - 164px)",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    gap: isDesktopWide ? 18 : 18,
    overflow: isDesktopWide ? "visible" : "hidden",
  };

  const heroWorkoutBackground = "var(--card-bg)";

  const heroRestBackground = "var(--card-bg)";

  const topMetaColor = settings.theme === "dark" ? "rgba(255,255,255,0.78)" : "rgba(15,23,42,0.62)";
  const topChipBackground = settings.theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.58)";
  const topChipBorder = settings.theme === "dark"
    ? "1px solid rgba(255,255,255,0.1)"
    : "1px solid rgba(148,163,184,0.18)";
  const headerTopRowStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: isDesktopWide ? "40px minmax(0, 1fr) 56px" : "42px minmax(0, 1fr) 56px",
    alignItems: "center",
    gap: isDesktopWide ? 10 : 12,
  };
  const headerMetaStyle: React.CSSProperties = {
    margin: 0,
    fontSize: isDesktopWide ? 12 : 12,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: topMetaColor,
    textAlign: "center",
    whiteSpace: "nowrap",
  };
  const headerStepChipStyle: React.CSSProperties = {
    width: isDesktopWide ? 54 : 56,
    height: isDesktopWide ? 36 : 38,
    padding: 0,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    background: topChipBackground,
    border: topChipBorder,
    color: "var(--text-color)",
    fontSize: isDesktopWide ? 13 : 13,
    fontWeight: 800,
    flexShrink: 0,
  };
  const headerPanelStyle: React.CSSProperties = {
    padding: isDesktopWide ? "18px 20px 18px" : "18px 18px 16px",
    minHeight: isDesktopWide ? 0 : undefined,
    height: isDesktopWide ? "auto" : undefined,
    borderRadius: 24,
    background:
      settings.theme === "dark"
        ? "linear-gradient(135deg, rgba(79,70,229,0.18) 0%, rgba(59,130,246,0.12) 100%)"
        : "linear-gradient(135deg, rgba(224,231,255,0.86) 0%, rgba(237,233,254,0.82) 100%)",
    border: settings.theme === "dark"
      ? "1px solid rgba(255,255,255,0.06)"
      : "1px solid rgba(148,163,184,0.12)",
    boxShadow: settings.theme === "dark"
      ? "inset 0 1px 0 rgba(255,255,255,0.04)"
      : "inset 0 1px 0 rgba(255,255,255,0.55)",
    display: "grid",
    gridTemplateRows: isDesktopWide ? "42px auto auto" : undefined,
    alignContent: "stretch",
    gap: isDesktopWide ? 8 : 14,
  };
  const startHeaderPanelStyle: React.CSSProperties = isDesktopWide
    ? {
        ...headerPanelStyle,
        gridTemplateRows: "42px auto auto auto",
      }
    : headerPanelStyle;
  const headerTitleStyle: React.CSSProperties = {
    fontSize: isDesktopWide ? 20 : 22,
    fontWeight: 800,
    lineHeight: 1.05,
    color: "var(--text-color)",
    textAlign: "center",
    letterSpacing: "0.01em",
    textTransform: "uppercase",
    textShadow: settings.theme === "dark" ? "0 1px 0 rgba(0,0,0,0.2)" : "none",
    minHeight: isDesktopWide ? 28 : 24,
    display: "grid",
    alignItems: "center",
  };

  const desktopScreenStyle: React.CSSProperties = isDesktopWide
    ? {
        maxWidth: 820,
        margin: "0 auto",
        justifyItems: "center",
      }
    : {};
  const heroGlyphSize = isDesktopWide ? 34 : 44;
  const heroMetricSize = isDesktopWide ? 78 : 88;
  const heroSectionGap = isDesktopWide ? 12 : 10;
  const heroLabelSize = isDesktopWide ? 16 : 16;
  const heroInfoSize = isDesktopWide ? 13 : 14;
  const heroStateTitleSize = isDesktopWide ? 20 : 22;
  const heroBodyStyle: React.CSSProperties = {
    display: "grid",
    justifyItems: "center",
    alignContent: "center",
    alignItems: "center",
    minHeight: 0,
    flex: isDesktopWide ? undefined : 1,
    paddingTop: isDesktopWide ? 8 : 8,
    paddingBottom: isDesktopWide ? 4 : 8,
    gap: heroSectionGap,
    gridTemplateRows: isDesktopWide ? "auto auto auto auto" : undefined,
  };
  const desktopCtaRailStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "56px minmax(0, 1fr)",
    gap: 12,
    width: "100%",
    minHeight: 56,
    alignItems: "stretch",
  };
  const activeHeroActionRowStyle: React.CSSProperties = isDesktopWide
    ? desktopCtaRailStyle
    : {
        display: "grid",
        gridTemplateColumns: "64px minmax(0, 1fr)",
        gap: 12,
        width: "100%",
        alignItems: "stretch",
      };
  const restHeroActionRowStyle: React.CSSProperties = isDesktopWide
    ? {
        width: "100%",
        minHeight: 56,
        display: "flex",
        alignItems: "stretch",
        marginTop: 4,
      }
    : {
        width: "100%",
        minHeight: 56,
      };

  const renderPlanStrip = (activeStepIndex?: number) => (
      <div
      style={{
        width: "100%",
        minHeight: isDesktopWide ? 0 : undefined,
        display: "grid",
        alignItems: "stretch",
      }}
      >
      <div
        className="workout-plan-strip"
        style={{
          display: "grid",
          gap: 8,
          gridTemplateColumns: `repeat(${workout.steps.length}, minmax(0, 1fr))`,
          width: "100%",
          alignSelf: "stretch",
        }}
      >
      {workout.steps.map((step, index) => {
        const isActive = activeStepIndex === index;
        const hasActualValue = typeof actuals[index] === "number";
        const displayValue =
          editActual && index === currentStep
            ? currentStepPreviewValue
            : hasActualValue
              ? actuals[index]
              : step.target;

        return (
          <div
            key={`plan-${index}-${step.target}`}
            style={{
              minWidth: 0,
              padding: isDesktopWide ? "10px 8px" : "10px 8px",
              borderRadius: isDesktopWide ? 16 : 18,
              background: isActive
                ? "linear-gradient(135deg, var(--primary-color) 0%, var(--primary-strong) 100%)"
                : settings.theme === "dark"
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(255,255,255,0.42)",
              color: isActive ? "#fff" : "var(--text-color)",
              display: "grid",
              gap: isDesktopWide ? 6 : 4,
              justifyItems: "center",
              alignContent: "center",
              textAlign: "center",
              minHeight: isDesktopWide ? 80 : undefined,
                border: isActive
                  ? "none"
                  : settings.theme === "dark"
                    ? "1px solid rgba(255,255,255,0.08)"
                    : "1px solid rgba(148,163,184,0.18)",
            }}
          >
            <div
              style={{
                fontSize: isDesktopWide ? 12 : 11,
                fontWeight: 700,
                opacity: isActive ? 0.9 : 0.7,
                letterSpacing: "0.02em",
              }}
            >
              {index + 1}
            </div>
            <div
              style={{
                fontSize: isDesktopWide ? 24 : 22,
                fontWeight: 900,
                lineHeight: 1,
                wordBreak: "break-word",
              }}
            >
              {displayValue}
            </div>
          </div>
        );
      })}
    </div>
    </div>
  );

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
            {completedWorkoutInfo.planned.map((target, idx) => {
              const actual = completedWorkoutInfo.actual[idx] ?? 0;
              const done = actual >= target;
              const stepNumber = idx + 1;

              return (
                <div
                  key={`completed-step-${stepNumber}`}
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    background: done ? "var(--success-bg-soft)" : "var(--soft-bg)",
                    border: `1px solid ${done ? "var(--success-border)" : "var(--border-color)"}`,
                  }}
                >
                  Подход {stepNumber}: цель {target} {shortUnitLabel}, выполнено {actual} {shortUnitLabel}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="workout-screen" style={{ display: "grid", gap: 16, ...desktopScreenStyle }}>
      {showExitDialog && (
        <ConfirmDialog
          title="Тренировка ещё не завершена"
          description="Сохранить текущие подходы перед выходом?"
          primaryLabel="Сохранить и выйти"
          secondaryLabel="Выйти без сохранения"
          cancelLabel="Отмена"
          onPrimary={() => {
            persistCurrentSession();
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

      {!started && (
        <div
          className="workout-hero-panel"
          style={{
            ...heroPanelStyle,
            textAlign: "center",
            background: heroWorkoutBackground,
          }}
        >
          <div
            style={{
              width: "100%",
              height: isDesktopWide ? "auto" : "100%",
              display: "grid",
              gridTemplateRows: isDesktopWide ? "auto auto auto" : "auto auto 1fr auto",
              gap: isDesktopWide ? 14 : 16,
              flex: isDesktopWide ? undefined : 1,
            }}
          >
            <div className="workout-header-panel" style={startHeaderPanelStyle}>
              {isDesktopWide ? (
                <>
                  <div style={headerTopRowStyle}>
                    <button
                      style={{
                        ...secondaryButtonStyle,
                        width: 42,
                        height: 42,
                        padding: 0,
                        borderRadius: 999,
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                      }}
                      onClick={handleExitAttempt}
                      aria-label="Выйти"
                    >
                      ×
                    </button>

                    <div style={headerMetaStyle}>{scheduleLabel}</div>

                    <div style={headerStepChipStyle}>
                      1/{workout.steps.length}
                    </div>
                  </div>

                  <div style={headerTitleStyle}>{program.title}</div>

                  <div
                    style={{
                      ...mutedTextStyle,
                      margin: 0,
                      fontSize: 13,
                      textAlign: "center",
                    }}
                  >
                    {progress.loadAdjustmentPreset === 0.9
                      ? "Мягкая нагрузка"
                      : progress.loadAdjustmentPreset === 1.1
                        ? "Интенсивная нагрузка"
                        : "Стандартная нагрузка"}
                  </div>

                  {renderPlanStrip()}
                </>
              ) : (
                <>
                  <div style={{ display: "grid", gap: 8, justifyItems: "center" }}>
                    <div style={{ ...mutedTextStyle, margin: 0, fontSize: 12 }}>
                      {progress.loadAdjustmentPreset === 0.9
                        ? "Мягкая нагрузка"
                        : progress.loadAdjustmentPreset === 1.1
                          ? "Интенсивная нагрузка"
                          : "Стандартная нагрузка"}
                    </div>
                    <div style={{ fontSize: 52, lineHeight: 1 }}>{programGlyph}</div>
                    <div
                      style={{
                        margin: 0,
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        color: topMetaColor,
                      }}
                    >
                      {scheduleLabel}
                    </div>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: 28,
                        lineHeight: 1.05,
                        fontWeight: 800,
                        letterSpacing: "0.02em",
                        textTransform: "uppercase",
                        textAlign: "center",
                      }}
                    >
                      {program.title}
                    </h2>
                    <div style={{ ...mutedTextStyle, margin: 0 }}>
                      {workout.steps.length} {pluralizeSets(workout.steps.length)}
                    </div>
                  </div>

                  {renderPlanStrip()}
                </>
              )}
            </div>

            {isDesktopWide ? <div style={{ minHeight: 8 }} /> : <div />}

            {isDesktopWide ? (
              <div style={{ ...restHeroActionRowStyle, minHeight: 56 }}>
                <button
                  style={{ ...buttonStyle, width: "100%", height: 56, borderRadius: 999, fontSize: 16 }}
                  onClick={onStart}
                >
                  Начать тренировку
                </button>
              </div>
            ) : (
              <button
                style={{ ...buttonStyle, width: "100%", marginTop: "auto", height: isDesktopWide ? 56 : undefined }}
                onClick={onStart}
              >
                Начать тренировку
              </button>
            )}
          </div>
        </div>
      )}

      {started && !resting && !finished && (
        <div
          className="workout-hero-panel"
          style={{
            ...heroPanelStyle,
            textAlign: "center",
            background: heroWorkoutBackground,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateRows: isDesktopWide ? "auto auto auto" : "auto 1fr auto",
              gap: isDesktopWide ? 22 : 16,
              height: isDesktopWide ? "auto" : "100%",
              flex: isDesktopWide ? undefined : 1,
            }}
          >
            <div className="workout-header-panel" style={headerPanelStyle}>
              <div style={headerTopRowStyle}>
                <button
                  style={{
                    ...secondaryButtonStyle,
                    width: 42,
                    height: 42,
                    padding: 0,
                    borderRadius: 999,
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                  onClick={handleExitAttempt}
                  aria-label="Выйти"
                >
                  ×
                </button>

                <div style={headerMetaStyle}>
                  {scheduleLabel}
                </div>

                <div style={headerStepChipStyle}>
                  {currentStep + 1}/{workout.steps.length}
                </div>
              </div>

              <div style={headerTitleStyle}>
                {program.title}
              </div>

              {renderPlanStrip(currentStep)}
            </div>

            <div style={heroBodyStyle}>
              <div style={{ fontSize: heroGlyphSize, lineHeight: 1, display: "grid", placeItems: "center" }}>
                {programGlyph}
              </div>
              <div
                style={{
                  fontSize: heroMetricSize,
                  fontWeight: 900,
                  lineHeight: 0.9,
                  color: "var(--text-color)",
                }}
              >
                {stepTimerRunning
                  ? stepTimeLeft
                  : editActual
                  ? currentStepPreviewValue
                  : currentTarget}
              </div>
              <div
                style={{
                  fontSize: heroLabelSize,
                  display: "grid",
                  placeItems: "center",
                  minHeight: 24,
                  color: settings.theme === "dark" ? "rgba(255,255,255,0.72)" : "rgba(15,23,42,0.56)",
                }}
              >
                {stepTimerRunning ? "секунд осталось" : `Подход ${currentStep + 1}`}
              </div>
              {stepTimerRunning ? (
                <div
                  style={{
                    fontSize: heroInfoSize,
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
                    fontSize: heroInfoSize,
                    fontWeight: 700,
                    color: "var(--primary-strong)",
                    minHeight: 21,
                  }}
                >
                  Предпросмотр: {currentStepPreviewValue}
                </div>
              ) : (
                <div style={{ minHeight: 21 }} />
              )}
            </div>
          </div>

          {!editActual && (
            <div style={activeHeroActionRowStyle}>
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
                  height: isDesktopWide ? 48 : 56,
                  borderRadius: 999,
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

              <button
                style={{
                  ...buttonStyle,
                  width: "100%",
                  height: isDesktopWide ? 56 : 56,
                  opacity: stepTimerRunning ? 0.75 : 1,
                  cursor: "pointer",
                  borderRadius: 999,
                  fontSize: isDesktopWide ? 16 : undefined,
                }}
                onClick={isTimedWorkout && stepTimerRunning ? stopTimedAttemptAndContinue : onDoneDefault}
              >
                {isTimedWorkout
                  ? stepTimerRunning
                    ? "Стоп"
                    : "Выполнено"
                  : "Выполнено"}
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
          className="workout-hero-panel"
          style={{
            ...heroPanelStyle,
            background: heroRestBackground,
            textAlign: "center",
          }}
        >
          <div
            style={{
              height: isDesktopWide ? "auto" : "100%",
              display: "grid",
              gridTemplateRows: isDesktopWide ? "auto auto auto" : "auto 1fr auto",
              gap: isDesktopWide ? 22 : 16,
              flex: isDesktopWide ? undefined : 1,
            }}
          >
            <div className="workout-header-panel" style={headerPanelStyle}>
              <div style={headerTopRowStyle}>
                <button
                  onClick={() => setShowExitDialog(true)}
                  style={{
                    ...secondaryButtonStyle,
                    width: 42,
                    height: 42,
                    padding: 0,
                    borderRadius: 999,
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                  aria-label="Выйти из тренировки"
                >
                  ×
                </button>

                <div style={headerMetaStyle}>
                  {scheduleLabel}
                </div>

                <div style={headerStepChipStyle}>
                  {Math.min(currentStep + 1, workout.steps.length - 1) + 1}/{workout.steps.length}
                </div>
              </div>

              <div style={headerTitleStyle}>
                {program.title}
              </div>

              {renderPlanStrip(Math.min(currentStep + 1, workout.steps.length - 1))}
            </div>

            <div style={{ ...heroBodyStyle, gap: 12 }}>
              <div style={{ fontSize: heroGlyphSize, lineHeight: 1, display: "grid", placeItems: "center" }}>
                ⏳
              </div>
              <h3
                style={{
                  margin: 0,
                  color: "var(--text-color)",
                  fontSize: heroStateTitleSize,
                  fontWeight: 800,
                  letterSpacing: "0.01em",
                  textTransform: "uppercase",
                }}
              >
                Отдых
              </h3>
              <div
                style={{
                  fontSize: heroMetricSize,
                  fontWeight: 900,
                  lineHeight: 0.92,
                  color: "var(--text-color)",
                }}
              >
                {restLeft}
              </div>
              <div style={{ minHeight: heroLabelSize + heroInfoSize + 12 }} />
            </div>
          </div>

          <div style={restHeroActionRowStyle}>
            <button
              style={{
                ...buttonStyle,
                width: "100%",
                height: 56,
                borderRadius: 999,
                fontSize: isDesktopWide ? 16 : undefined,
              }}
              onClick={skipRest}
            >
              Пропустить отдых
            </button>
          </div>
        </div>
      )}

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

function pluralizeSets(count: number) {
  const lastTwo = count % 100;
  const last = count % 10;

  if (lastTwo >= 11 && lastTwo <= 14) return "подходов";
  if (last === 1) return "подход";
  if (last >= 2 && last <= 4) return "подхода";
  return "подходов";
}

function getProgramGlyph(programId: string, unit: "reps" | "seconds") {
  if (unit === "seconds") return "⏱️";

  const glyphs: Record<string, string> = {
    pushups: "💪",
    abs: "🔥",
    crunches: "🔥",
    pullups_classic: "🧗",
    pullups_reverse: "🧗",
    pullups_parallel: "🧗",
    dips: "🏋️",
    bench_pushups: "💥",
    squats: "🦵",
    bulgarian_split_squats: "🦵",
  };

  return glyphs[programId] ?? "🏋️";
}
