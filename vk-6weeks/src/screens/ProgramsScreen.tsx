import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { programs } from "../data/programs";
import { useAppStore } from "../store/appStore";
import type { Program, ProgramType } from "../types";
import {
  buttonStyle,
  cardStyle,
  mutedTextStyle,
  pageTitleStyle,
  secondaryButtonStyle,
} from "../components/ui";

const groups: Array<{
  id: string;
  title: string;
  description: string;
  icon: string;
  ids: ProgramType[];
}> = [
  {
    id: "upper",
    title: "Верх тела",
    description: "Сила груди, спины, рук и плечевого пояса",
    icon: "💪",
    ids: [
      "pushups",
      "pullups_classic",
      "pullups_reverse",
      "pullups_parallel",
      "dips",
      "bench_pushups",
    ],
  },
  {
    id: "legs",
    title: "Ноги",
    description: "Сила ног, выносливость и устойчивость",
    icon: "🦵",
    ids: ["squats", "bulgarian_split_squats"],
  },
  {
    id: "core",
    title: "Корпус",
    description: "Пресс и мышцы кора",
    icon: "⚡",
    ids: ["abs", "crunches"],
  },
  {
    id: "isometric",
    title: "Изометрия",
    description: "Удержание позиций на время",
    icon: "🧱",
    ids: ["plank", "wall_sit"],
  },
];

export default function ProgramsScreen() {
  const navigate = useNavigate();
  const progressMap = useAppStore((s) => s.progress);
  const activeProgramId = useAppStore((s) => s.activeProgramId);

  const [openedGroupId, setOpenedGroupId] = useState<string | null>(null);

  const toggleGroup = (groupId: string) => {
    setOpenedGroupId((prev) => (prev === groupId ? null : groupId));
  };

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
        <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>Каталог программ</div>
        <h2 style={{ margin: 0, fontSize: 28, lineHeight: 1.1 }}>Выбери направление</h2>
        <p style={{ marginTop: 12, marginBottom: 0, opacity: 0.95 }}>
          Подбери программу под свою цель и начни прокачку в RepUp.
        </p>
      </div>

      {groups.map((group) => {
        const items = group.ids
          .map((id) => programs.find((program) => program.id === id))
          .filter(Boolean) as Program[];

        const isOpen = openedGroupId === group.id;

        return (
          <section key={group.id} style={{ display: "grid", gap: 12 }}>
            <button
              type="button"
              onClick={() => toggleGroup(group.id)}
              style={{
                ...cardStyle,
                cursor: "pointer",
                textAlign: "left",
                color: "var(--text-color)",
                border: isOpen
                  ? "1px solid var(--primary-color)"
                  : "1px solid var(--border-color)",
                background: isOpen ? "var(--primary-soft-2)" : "var(--card-bg)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 16,
                      display: "grid",
                      placeItems: "center",
                      background: isOpen ? "var(--primary-soft)" : "var(--soft-bg)",
                      fontSize: 24,
                    }}
                  >
                    {group.icon}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <h3 style={pageTitleStyle}>{group.title}</h3>
                    <p style={mutedTextStyle}>{group.description}</p>
                  </div>
                </div>

                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 999,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: isOpen ? "var(--primary-soft)" : "var(--soft-bg)",
                    color: isOpen ? "var(--primary-strong)" : "var(--muted-text-color)",
                    fontSize: 22,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {isOpen ? "−" : "+"}
                </div>
              </div>
            </button>

            {isOpen && (
              <div
                style={{
                  display: "grid",
                  gap: 16,
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  alignItems: "stretch",
                }}
              >
                {items.map((program) => {
                  const progress = progressMap[program.id];
                  const isActive = activeProgramId === program.id;

                  let status = "Не начата";
                  let statusBg = "var(--soft-bg)";
                  let statusColor = "var(--muted-text-color)";

                  if (progress?.finished) {
                    status = "Завершена";
                    statusBg = "var(--success-bg)";
                    statusColor = "var(--success-color)";
                  } else if (isActive) {
                    status = "Активная";
                    statusBg = "var(--primary-soft)";
                    statusColor = "var(--primary-strong)";
                  } else if (progress) {
                    status = "В процессе";
                    statusBg = "var(--warning-bg)";
                    statusColor = "var(--warning-color)";
                  }

                  return (
                    <ProgramCard
                      key={program.id}
                      program={program}
                      status={status}
                      statusBg={statusBg}
                      statusColor={statusColor}
                      onOpen={() => navigate(getPrimaryProgramRoute(program.id, progress?.finished ?? false, Boolean(progress)))}
                      onDetails={() => navigate(`/program/${program.id}`)}
                    />
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function ProgramCard({
  program,
  status,
  statusBg,
  statusColor,
  onOpen,
  onDetails,
}: {
  program: Program;
  status: string;
  statusBg: string;
  statusColor: string;
  onOpen: () => void;
  onDetails: () => void;
}) {
  return (
    <div
      style={{
        ...cardStyle,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 14,
        minHeight: 100,
      }}
    >
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            alignItems: "flex-start",
            flexWrap: "wrap",
            marginBottom: 10,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              padding: "6px 10px",
              borderRadius: 999,
              background: "var(--primary-soft-2)",
              color: "var(--primary-strong)",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {program.unit === "seconds" ? "На время" : "На повторения"}
          </div>

          <div
            style={{
              display: "inline-flex",
              padding: "6px 10px",
              borderRadius: 999,
              background: statusBg,
              color: statusColor,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {status}
          </div>
        </div>

        <h3 style={{ margin: 0, fontSize: 22, lineHeight: 1.15 }}>{program.title}</h3>
        <p style={{ color: "var(--muted-text-color)", marginTop: 8, marginBottom: 0 }}>
          {program.durationWeeks} нед. · {program.workoutsPerWeek} трен./нед.
        </p>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button style={buttonStyle} onClick={onOpen}>
          Открыть
        </button>
        <button style={secondaryButtonStyle} onClick={onDetails}>
          Подробнее
        </button>
      </div>
    </div>
  );
}

function getPrimaryProgramRoute(programId: ProgramType, isFinished: boolean, isStarted: boolean) {
  if (isFinished) {
    return `/plan/${programId}`;
  }

  if (isStarted) {
    return `/workout/${programId}`;
  }

  return `/level-test/${programId}`;
}
