import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { achievements } from "../data/achievements";
import { programs } from "../data/programs";
import {
  buttonStyle,
  cardStyle,
  mutedTextStyle,
  secondaryButtonStyle,
} from "../components/ui";
import { useAppStore } from "../store/appStore";
import { calculateAchievementProgress } from "../utils/achievements";
import { getLevelFromXp, getXpProgress } from "../utils/level";
import { getProgramTotalWorkouts } from "../utils/plan";

export default function HomeScreen() {
  const navigate = useNavigate();
  const activeProgramId = useAppStore((s) => s.activeProgramId);
  const progressMap = useAppStore((s) => s.progress);
  const xp = useAppStore((s) => s.userStats.xp);
  const syncAchievementRewards = useAppStore((s) => s.syncAchievementRewards);
  const setActiveProgram = useAppStore((s) => s.setActiveProgram);

  const achievementProgress = useMemo(
    () => calculateAchievementProgress({ progress: progressMap }),
    [progressMap]
  );

  useEffect(() => {
    syncAchievementRewards(achievementProgress.unlockedIds);
  }, [achievementProgress.unlockedIds, syncAchievementRewards]);

  const level = getLevelFromXp(xp);
  const xpProgress = getXpProgress(xp);

  const startedPrograms = useMemo(
    () => programs.filter((program) => progressMap[program.id]),
    [progressMap]
  );

  const fallbackProgramId =
    startedPrograms.find((program) => {
      const progress = progressMap[program.id];
      return progress && !progress.finished;
    })?.id ??
    startedPrograms[0]?.id ??
    null;

  const resolvedActiveProgramId =
    activeProgramId && progressMap[activeProgramId] ? activeProgramId : fallbackProgramId;

  const sliderPrograms = useMemo(() => {
    return startedPrograms.filter((program) => {
      const progress = progressMap[program.id];
      return Boolean(progress && !progress.finished);
    });
  }, [startedPrograms, progressMap]);

  const effectivePrograms = sliderPrograms.length > 0 ? sliderPrograms : startedPrograms;

  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(
    resolvedActiveProgramId
  );

  const currentIndex = useMemo(() => {
    if (effectivePrograms.length === 0) return 0;

    const preferredIds = [selectedProgramId, resolvedActiveProgramId];

    for (const programId of preferredIds) {
      if (!programId) continue;
      const index = effectivePrograms.findIndex((program) => program.id === programId);
      if (index >= 0) return index;
    }

    return 0;
  }, [effectivePrograms, resolvedActiveProgramId, selectedProgramId]);

  const currentProgram = effectivePrograms[currentIndex] ?? null;
  const currentProgress = currentProgram ? progressMap[currentProgram.id] ?? null : null;

  const currentProgramPercent =
    currentProgram && currentProgress
      ? Math.round(
          (currentProgress.completedWorkouts.length /
            Math.max(getProgramTotalWorkouts(currentProgram), 1)) *
            100
        )
      : 0;

  const visibleAchievements = useMemo(() => {
    const sorted = achievements.slice().sort((a, b) => {
      const aUnlocked = achievementProgress.unlockedIds.includes(a.id);
      const bUnlocked = achievementProgress.unlockedIds.includes(b.id);

      if (aUnlocked === bUnlocked) return 0;
      return aUnlocked ? -1 : 1;
    });

    return sorted.slice(0, 4);
  }, [achievementProgress.unlockedIds]);

  const canSlidePrev = currentIndex > 0;
  const canSlideNext = currentIndex < effectivePrograms.length - 1;

  const goPrev = () => {
    const nextProgram = effectivePrograms[Math.max(0, currentIndex - 1)] ?? null;
    setSelectedProgramId(nextProgram?.id ?? null);
  };

  const goNext = () => {
    const nextProgram =
      effectivePrograms[Math.min(effectivePrograms.length - 1, currentIndex + 1)] ?? null;
    setSelectedProgramId(nextProgram?.id ?? null);
  };

  const openCurrentProgram = () => {
    if (!currentProgram || !currentProgress) return;
    setActiveProgram(currentProgram.id);

    if (currentProgress.finished) {
      navigate(`/plan/${currentProgram.id}`);
      return;
    }

    navigate(`/workout/${currentProgram.id}`);
  };

  if (startedPrograms.length === 0) {
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
          <div style={{ fontSize: 14, opacity: 0.88, marginBottom: 8 }}>Добро пожаловать</div>
          <h2 style={{ margin: 0, fontSize: 30, lineHeight: 1.08 }}>RepUp</h2>
          <p style={{ marginTop: 12, marginBottom: 16, opacity: 0.95 }}>
            Выбери программу, пройди стартовый тест и начни тренироваться по простому
            и понятному плану.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              style={{
                ...buttonStyle,
                background: "#fff",
                color: "var(--primary-strong)",
                boxShadow: "none",
              }}
              onClick={() => navigate("/programs")}
            >
              Выбрать программу
            </button>
            <button
              style={{
                ...secondaryButtonStyle,
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.3)",
                color: "#fff",
              }}
              onClick={() => navigate("/achievements")}
            >
              Достижения
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section
        style={{
          ...cardStyle,
          background:
            "linear-gradient(135deg, var(--dark-hero-start) 0%, var(--dark-hero-end) 100%)",
          color: "#fff",
          border: "none",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            opacity: 0.82,
            marginBottom: 8,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Твой прогресс
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 14,
          }}
        >
          <div>
            <div style={{ fontSize: 15, opacity: 0.9, marginBottom: 4 }}>
              Уровень {level}
            </div>
            <div style={{ fontSize: 34, fontWeight: 900, lineHeight: 1 }}>
              {xp} XP
            </div>
          </div>

          <div
            style={{
              padding: "10px 12px",
              borderRadius: 16,
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.16)",
              fontSize: 13,
              fontWeight: 800,
              whiteSpace: "nowrap",
            }}
          >
            До уровня: {xpProgress.max - xpProgress.current}
          </div>
        </div>

        <div
          style={{
            height: 10,
            borderRadius: 999,
            background: "rgba(255,255,255,0.14)",
            overflow: "hidden",
            marginBottom: 10,
          }}
        >
          <div
            style={{
              width: `${xpProgress.percent}%`,
              height: "100%",
              background: "#fff",
              borderRadius: 999,
            }}
          />
        </div>

        <div style={{ fontSize: 13, opacity: 0.88 }}>
          {xpProgress.current} / {xpProgress.max} XP до следующего уровня
        </div>
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
          <div>
            <h3 style={{ margin: 0, fontSize: 20 }}>Активные тренировки</h3>
          </div>

          {effectivePrograms.length > 1 && (
            <div style={{ display: "flex", gap: 8 }}>
              <IconButton
                ariaLabel="Предыдущая программа"
                onClick={goPrev}
                disabled={!canSlidePrev}
              >
                ←
              </IconButton>
              <IconButton
                ariaLabel="Следующая программа"
                onClick={goNext}
                disabled={!canSlideNext}
              >
                →
              </IconButton>
            </div>
          )}
        </div>

        {currentProgram && currentProgress ? (
          <div
            style={{
              display: "grid",
              gap: 14,
            }}
          >
            <div
              style={{
                padding: 16,
                borderRadius: 18,
                background: "var(--soft-bg)",
                border: "1px solid var(--border-color)",
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 900,
                  color: "var(--text-color)",
                  lineHeight: 1.15,
                  marginBottom: 8,
                }}
              >
                {currentProgram.title}
              </div>

              <div style={{ ...mutedTextStyle, fontSize: 14, marginBottom: 12 }}>
                {currentProgress.finished
                  ? "Программа завершена"
                  : `Неделя ${currentProgress.currentWeek} · День ${currentProgress.currentDay}`}
              </div>

              <div
                style={{
                  height: 10,
                  borderRadius: 999,
                  background: "var(--card-bg)",
                  overflow: "hidden",
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    width: `${currentProgramPercent}%`,
                    height: "100%",
                    background:
                      "linear-gradient(90deg, var(--primary-color), var(--primary-strong))",
                    borderRadius: 999,
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  fontSize: 14,
                  color: "var(--muted-text-color)",
                  marginBottom: 16,
                }}
              >
                <span>{currentProgramPercent}% выполнено</span>
                <span>
                  {currentProgress.completedWorkouts.length}/
                  {getProgramTotalWorkouts(currentProgram)} тренировок
                </span>
              </div>

              <button
                style={{ ...buttonStyle, width: "100%" }}
                onClick={openCurrentProgram}
              >
                {currentProgress.finished ? "Открыть план" : "Продолжить тренировку"}
              </button>
            </div>

            {effectivePrograms.length > 1 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {effectivePrograms.map((program, index) => (
                  <button
                    key={program.id}
                    onClick={() => setSelectedProgramId(program.id)}
                    aria-label={`Перейти к программе ${program.title}`}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      border: "none",
                      padding: 0,
                      background:
                        index === currentIndex
                          ? "var(--primary-color)"
                          : "var(--border-color)",
                      cursor: "pointer",
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={mutedTextStyle}>Нет активных программ.</div>
        )}
      </section>

      <section style={cardStyle}>
        <div
          style={{
            marginBottom: 14,
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 900,
              color: "var(--text-color)",
            }}
          >
            Достижения
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          {visibleAchievements.map((achievement) => {
            const unlocked = achievementProgress.unlockedIds.includes(achievement.id);

            return (
              <div
                key={achievement.id}
                style={{
                  borderRadius: 20,
                  padding: 14,
                  border: "1px solid var(--border-color)",
                  background: unlocked
                    ? "linear-gradient(180deg, var(--success-bg-soft) 0%, var(--card-bg) 100%)"
                    : "var(--card-bg)",
                  display: "grid",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 18,
                    display: "grid",
                    placeItems: "center",
                    fontSize: 30,
                    background: unlocked ? achievement.color : "var(--soft-bg)",
                    color: unlocked ? "#fff" : "var(--muted-text-color)",
                    boxShadow: unlocked ? "0 10px 24px rgba(0,0,0,0.12)" : "none",
                  }}
                >
                  {achievement.icon}
                </div>

                <div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 800,
                      color: "var(--text-color)",
                      lineHeight: 1.25,
                      marginBottom: 4,
                    }}
                  >
                    {achievement.title}
                  </div>

                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--muted-text-color)",
                      lineHeight: 1.35,
                    }}
                  >
                    {achievement.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {achievements.length > 4 && (
          <button
            onClick={() => navigate("/achievements")}
            style={{
              marginTop: 14,
              width: "100%",
              minHeight: 48,
              borderRadius: 16,
              border: "1px solid var(--border-color)",
              background: "var(--soft-bg)",
              color: "var(--text-color)",
              fontSize: 14,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Открыть все достижения
          </button>
        )}
      </section>
    </div>
  );
}

function IconButton({
  children,
  onClick,
  disabled,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      style={{
        width: 38,
        height: 38,
        borderRadius: 12,
        border: "1px solid var(--border-color)",
        background: "var(--card-bg)",
        color: "var(--text-color)",
        fontSize: 18,
        fontWeight: 900,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {children}
    </button>
  );
}
