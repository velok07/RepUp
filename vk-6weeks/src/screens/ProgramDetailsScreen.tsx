import { useNavigate, useParams } from "react-router-dom";
import { programs } from "../data/programs";
import { useAppStore } from "../store/appStore";
import { getLoadAdjustmentLabel, getProgramTotalWorkouts } from "../utils/plan";
import {
  buttonStyle,
  cardStyle,
  mutedTextStyle,
  pageTitleStyle,
  secondaryButtonStyle,
} from "../components/ui";

export default function ProgramDetailsScreen() {
  const navigate = useNavigate();
  const { id } = useParams();

  const activeProgramId = useAppStore((s) => s.activeProgramId);
  const progressMap = useAppStore((s) => s.progress);
  const setActiveProgram = useAppStore((s) => s.setActiveProgram);

  const program = programs.find((p) => p.id === id);

  if (!program) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <div style={cardStyle}>
          <h1 style={pageTitleStyle}>Программа не найдена</h1>
          <p style={mutedTextStyle}>
            Возможно, программа была удалена или ссылка некорректна.
          </p>
          <button style={buttonStyle} onClick={() => navigate("/programs")}>
            К программам
          </button>
        </div>
      </div>
    );
  }

  const progress = progressMap[program.id];
  const isStarted = Boolean(progress);
  const isFinished = Boolean(progress?.finished);
  const isActive = activeProgramId === program.id;

  const completed = progress?.completedWorkouts.length ?? 0;
  const total = getProgramTotalWorkouts(program);
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const handleStartTest = () => {
    navigate(`/level-test/${program.id}`);
  };

  const handleContinueWorkout = () => {
    if (!isActive) {
      setActiveProgram(program.id);
    }
    navigate(`/workout/${program.id}`);
  };

  const handleOpenPlan = () => {
    navigate(`/plan/${program.id}`);
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
        <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>Программа</div>
        <h1 style={{ margin: 0, fontSize: 30, lineHeight: 1.1 }}>{program.title}</h1>
        <p style={{ marginTop: 12, marginBottom: 0, opacity: 0.95 }}>
          {program.durationWeeks} нед. · {program.workoutsPerWeek} трен./нед. ·{" "}
          {program.unit === "seconds" ? "на время" : "на повторения"}
        </p>
      </div>

      <div style={cardStyle}>
        <h2 style={pageTitleStyle}>О программе</h2>
        <p style={mutedTextStyle}>
          Пройди стартовый тест, чтобы подобрать уровень, а затем выполняй
          тренировки по плану и отслеживай прогресс.
        </p>

        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            marginTop: 16,
          }}
        >
          <InfoCard label="Длительность" value={`${program.durationWeeks} нед.`} />
          <InfoCard label="Тренировок в неделю" value={String(program.workoutsPerWeek)} />
          <InfoCard
            label="Формат"
            value={program.unit === "seconds" ? "На время" : "На повторения"}
          />
        </div>
      </div>

      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          <h2 style={pageTitleStyle}>Статус</h2>

          <span
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 700,
              background: isFinished
                ? "var(--success-bg)"
                : isStarted
                ? "var(--primary-soft)"
                : "var(--soft-bg)",
              color: isFinished
                ? "var(--success-color)"
                : isStarted
                ? "var(--primary-strong)"
                : "var(--muted-text-color)",
            }}
          >
            {isFinished ? "Завершена" : isStarted ? "В процессе" : "Не начата"}
          </span>
        </div>

        {isStarted ? (
          <>
            <p style={mutedTextStyle}>
              Выполнено {completed} из {total} тренировок.
            </p>

            <div
              style={{
                height: 12,
                background: "var(--soft-bg)",
                borderRadius: 999,
                overflow: "hidden",
                marginTop: 12,
              }}
            >
              <div
                style={{
                  width: `${percent}%`,
                  height: "100%",
                  background:
                    "linear-gradient(135deg, var(--primary-color) 0%, var(--primary-strong) 100%)",
                  borderRadius: 999,
                }}
              />
            </div>

            <div style={{ marginTop: 10, ...mutedTextStyle }}>
              {percent}% прогресса
              {progress && !progress.finished
                ? ` · Сейчас: неделя ${progress.currentWeek}, день ${progress.currentDay}`
                : ""}
            </div>

            {progress ? (
              <div style={{ marginTop: 8, ...mutedTextStyle }}>
                Нагрузка: {getLoadAdjustmentLabel(progress.loadAdjustment ?? 1)}
              </div>
            ) : null}
          </>
        ) : (
          <p style={mutedTextStyle}>
            Ты ещё не начинал эту программу. Сначала пройди тест уровня.
          </p>
        )}

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
          {!isStarted && (
            <button style={buttonStyle} onClick={handleStartTest}>
              Пройти тест
            </button>
          )}

          {isStarted && !isFinished && (
            <button style={buttonStyle} onClick={handleContinueWorkout}>
              Продолжить тренировку
            </button>
          )}

          <button style={secondaryButtonStyle} onClick={handleOpenPlan}>
            Смотреть план
          </button>

          <button style={secondaryButtonStyle} onClick={() => navigate("/programs")}>
            Назад к программам
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        ...cardStyle,
        background: "var(--soft-bg)",
        border: "1px solid var(--border-color)",
        padding: 14,
      }}
    >
      <div style={{ color: "var(--muted-text-color)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800 }}>{value}</div>
    </div>
  );
}
