import { useMemo } from "react";
import { achievements } from "../data/achievements";
import { cardStyle, mutedTextStyle, pageTitleStyle } from "../components/ui";
import { useAppStore } from "../store/appStore";
import { calculateAchievementProgress } from "../utils/achievements";

export default function AchievementsScreen() {
  const progressMap = useAppStore((s) => s.progress);

  const achievementProgress = useMemo(
    () => calculateAchievementProgress({ progress: progressMap }),
    [progressMap]
  );

  const unlockedIds = achievementProgress.unlockedIds;

  const groupedAchievements = useMemo(() => {
    const unlockedSet = new Set(unlockedIds);
    const unlocked = achievements.filter((item) => unlockedSet.has(item.id));
    const locked = achievements.filter((item) => !unlockedSet.has(item.id));

    return { unlocked, locked };
  }, [unlockedIds]);

  const percent = Math.round((unlockedIds.length / achievements.length) * 100);

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
            Открыто {unlockedIds.length} из {achievements.length}. Сначала показаны уже открытые достижения.
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
            <StatCard label="Открыто" value={String(groupedAchievements.unlocked.length)} />
            <StatCard label="Впереди" value={String(groupedAchievements.locked.length)} />
            <StatCard label="Прогресс" value={`${percent}%`} />
          </div>
        </div>
      </div>

      <AchievementSection
        title="Открыто"
        subtitle="Твои уже заработанные награды"
        items={groupedAchievements.unlocked}
        unlockedIds={unlockedIds}
        emptyText="Пока ещё нет открытых достижений. Первая успешная тренировка всё запустит."
      />

      <AchievementSection
        title="Следующие цели"
        subtitle="Простые ориентиры, которые помогут двигаться дальше"
        items={groupedAchievements.locked}
        unlockedIds={unlockedIds}
        emptyText="Все достижения уже открыты. Это максимум."
      />
    </div>
  );
}

function AchievementSection({
  title,
  subtitle,
  items,
  unlockedIds,
  emptyText,
}: {
  title: string;
  subtitle: string;
  items: typeof achievements;
  unlockedIds: string[];
  emptyText: string;
}) {
  return (
    <section style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gap: 4 }}>
        <div
          style={{
            fontSize: 22,
            fontWeight: 900,
            color: "var(--text-color)",
          }}
        >
          {title}
        </div>
        <div style={mutedTextStyle}>{subtitle}</div>
      </div>

      {items.length === 0 ? (
        <div style={{ ...cardStyle, ...mutedTextStyle }}>{emptyText}</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {items.map((achievement) => {
            const unlocked = unlockedIds.includes(achievement.id);

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
                  opacity: unlocked ? 1 : 0.95,
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
                    filter: unlocked ? "none" : "grayscale(0.28) saturate(0.76)",
                    boxShadow: unlocked ? "0 12px 28px rgba(0,0,0,0.12)" : "none",
                  }}
                >
                  {achievement.icon}
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
                        {achievement.title}
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
                      {achievement.description}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
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
                        +50 XP
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
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
