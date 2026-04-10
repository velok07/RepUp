import { useMemo } from "react";
import { achievementCategoryMeta, achievements } from "../data/achievements";
import { cardStyle, mutedTextStyle, pageTitleStyle } from "../components/ui";
import { useAppStore } from "../store/appStore";
import {
  calculateAchievementProgress,
  ACHIEVEMENT_XP_REWARD,
  getAchievementPresentation,
} from "../utils/achievements";
import type { AchievementCategory } from "../types";

const categoryOrder: AchievementCategory[] = ["push", "pull", "core", "legs", "static", "special"];

export default function AchievementsScreen() {
  const progressMap = useAppStore((s) => s.progress);

  const achievementProgress = useMemo(
    () => calculateAchievementProgress({ progress: progressMap }),
    [progressMap]
  );

  const unlockedIds = achievementProgress.unlockedIds;
  const unlockedSet = useMemo(() => new Set(unlockedIds), [unlockedIds]);

  const groupedAchievements = useMemo(() => {
    return categoryOrder.map((category) => {
      const items = achievements
        .filter((item) => item.category === category)
        .sort((a, b) => Number(unlockedSet.has(b.id)) - Number(unlockedSet.has(a.id)));

      const unlockedCount = items.filter((item) => unlockedSet.has(item.id)).length;

      return {
        category,
        meta: achievementCategoryMeta[category],
        items,
        unlockedCount,
      };
    });
  }, [unlockedSet]);

  const percent = achievements.length
    ? Math.round((unlockedIds.length / achievements.length) * 100)
    : 0;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          ...cardStyle,
          display: "grid",
          gap: 14,
        }}
      >
        <div>
          <h1 style={pageTitleStyle}>Достижения</h1>
          <p style={mutedTextStyle}>
            Открыто {unlockedIds.length} из {achievements.length}. Эксклюзивные награды до нужной
            даты скрыты как секретные.
          </p>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
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

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            <StatCard label="Открыто" value={String(unlockedIds.length)} />
            <StatCard label="Осталось" value={String(achievements.length - unlockedIds.length)} />
            <StatCard label="Награда" value={`+${ACHIEVEMENT_XP_REWARD} XP`} />
          </div>
        </div>
      </div>

      {groupedAchievements.map((group) => (
        <section key={group.category} style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gap: 4 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 900,
                  color: "var(--text-color)",
                }}
              >
                {group.meta.title}
              </div>

              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 800,
                  background: "var(--soft-bg)",
                  color: "var(--muted-text-color)",
                }}
              >
                {group.unlockedCount}/{group.items.length}
              </div>
            </div>

            <div style={mutedTextStyle}>{group.meta.description}</div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {group.items.map((achievement) => {
              const unlocked = unlockedSet.has(achievement.id);
              const presentation = getAchievementPresentation(achievement, unlockedSet);

              return (
                <div
                  key={achievement.id}
                  style={{
                    ...cardStyle,
                    display: "grid",
                    gridTemplateColumns: "88px minmax(0, 1fr)",
                    gap: 16,
                    alignItems: "center",
                    border: unlocked
                      ? "1px solid var(--success-border)"
                      : "1px solid var(--border-color)",
                    background: unlocked
                      ? "linear-gradient(180deg, var(--success-bg-soft) 0%, var(--card-bg) 100%)"
                      : "var(--card-bg)",
                    opacity: unlocked ? 1 : 0.96,
                  }}
                >
                  <div
                    style={{
                      width: 88,
                      height: 88,
                      borderRadius: 26,
                      display: "grid",
                      placeItems: "center",
                      fontSize: 42,
                      background: unlocked ? achievement.color : "var(--soft-bg)",
                      color: unlocked ? "#fff" : "var(--muted-text-color)",
                      filter: unlocked ? "none" : "grayscale(0.2) saturate(0.75)",
                      boxShadow: unlocked ? "0 12px 28px rgba(0,0,0,0.12)" : "none",
                    }}
                  >
                    {presentation.icon}
                  </div>

                  <div style={{ minWidth: 0, display: "grid", gap: 10 }}>
                    <div style={{ display: "grid", gap: 6 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 19,
                            fontWeight: 900,
                            lineHeight: 1.2,
                            color: "var(--text-color)",
                          }}
                        >
                          {presentation.title}
                        </div>

                        <div
                          style={{
                            padding: "7px 10px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 800,
                            background: unlocked ? "var(--success-bg)" : "var(--soft-bg)",
                            color: unlocked ? "var(--success-color)" : "var(--muted-text-color)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {unlocked ? "Открыто" : "Закрыто"}
                        </div>
                      </div>

                      <div
                        style={{
                          ...mutedTextStyle,
                          lineHeight: 1.45,
                          fontSize: 15,
                        }}
                      >
                        {presentation.description}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "var(--muted-text-color)",
                        }}
                      >
                        {presentation.spotlight ?? group.meta.title}
                      </div>

                      {unlocked && (
                        <div
                          style={{
                            padding: "8px 12px",
                            borderRadius: 999,
                            fontSize: 13,
                            fontWeight: 800,
                            background: "var(--primary-soft-2)",
                            color: "var(--primary-strong)",
                          }}
                        >
                          +{ACHIEVEMENT_XP_REWARD} XP
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 16,
        border: "1px solid var(--border-color)",
        background: "var(--soft-bg)",
        display: "grid",
        gap: 4,
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: "var(--muted-text-color)",
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 900,
          color: "var(--text-color)",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}
