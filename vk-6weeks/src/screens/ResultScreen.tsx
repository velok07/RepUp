import { useLocation, useNavigate } from "react-router-dom";
import {
  buttonStyle,
  cardStyle,
  mutedTextStyle,
  pageTitleStyle,
  secondaryButtonStyle,
} from "../components/ui";

type ResultLocationState = {
  title: string;
  week: number;
  day: number;
  plannedTotal: number;
  actualTotal: number;
  gainedXp: number;
  achievementTitle?: string;
};

export default function ResultScreen() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const result = state as ResultLocationState | null;

  if (!result) {
    return (
      <div style={cardStyle}>
        <h2 style={pageTitleStyle}>Результат недоступен</h2>
        <p style={mutedTextStyle}>
          Похоже, эта тренировка уже завершилась раньше. Открой главную страницу или прогресс.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button style={buttonStyle} onClick={() => navigate("/")}>
            На главную
          </button>
          <button style={secondaryButtonStyle} onClick={() => navigate("/progress")}>
            Прогресс
          </button>
        </div>
      </div>
    );
  }

  const isSuccess = result.actualTotal >= result.plannedTotal;
  const shortUnit = "повт.";

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          ...cardStyle,
          background: isSuccess
            ? "linear-gradient(135deg, var(--success-color) 0%, #166534 100%)"
            : "linear-gradient(135deg, var(--danger-color) 0%, #7f1d1d 100%)",
          color: "#fff",
          border: "none",
        }}
      >
        <h2 style={{ ...pageTitleStyle, color: "#fff", marginBottom: 6 }}>
          {isSuccess ? "Тренировка завершена" : "Попробуй ещё раз"}
        </h2>
        <p style={{ marginTop: 0, marginBottom: 4 }}>{result.title}</p>
        <p style={{ marginTop: 0, opacity: 0.9 }}>
          Неделя {result.week}, день {result.day}
        </p>

        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            marginTop: 16,
          }}
        >
          <MetricCard label="По плану" value={`${result.plannedTotal} ${shortUnit}`} />
          <MetricCard label="Сделано" value={`${result.actualTotal} ${shortUnit}`} />
          <MetricCard label="Получено XP" value={`+${result.gainedXp}`} />
        </div>
      </div>

      {result.achievementTitle ? (
        <div
          style={{
            ...cardStyle,
            borderColor: "var(--success-border)",
            background: "var(--success-bg-soft)",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: "var(--success-color)",
              marginBottom: 6,
            }}
          >
            Новое достижение
          </div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{result.achievementTitle}</div>
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button style={buttonStyle} onClick={() => navigate("/")}>
          Продолжить
        </button>
        <button style={secondaryButtonStyle} onClick={() => navigate("/progress")}>
          Посмотреть прогресс
        </button>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
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
