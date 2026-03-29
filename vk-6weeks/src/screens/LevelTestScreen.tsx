import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { programs } from "../data/programs";
import { useAppStore } from "../store/appStore";
import type { ProgramType } from "../types";
import { getLevelByResult } from "../utils/plan";
import {
  buttonStyle,
  cardStyle,
  inputStyle,
  mutedTextStyle,
  pageTitleStyle,
} from "../components/ui";

export default function LevelTestScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const startProgram = useAppStore((s) => s.startProgram);
  const [result, setResult] = useState("");

  const program = programs.find((item) => item.id === id);

  if (!program || !id) {
    return <div style={cardStyle}>Программа не найдена</div>;
  }

  const onSubmit = () => {
    const value = Number(result);
    if (Number.isNaN(value) || value < 0) return;

    const level = getLevelByResult(id as ProgramType, value);
    startProgram(id as ProgramType, level);
    navigate(`/workout/${id}`);
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
        <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>
          Стартовый тест
        </div>
        <h2 style={{ margin: 0, fontSize: 28, lineHeight: 1.1 }}>{program.title}</h2>
        <p style={{ marginTop: 12, marginBottom: 0, opacity: 0.95 }}>
          Определи текущий уровень и получи персональный план.
        </p>
      </div>

      <div style={cardStyle}>
        <h3 style={pageTitleStyle}>Тест уровня</h3>
        <p style={mutedTextStyle}>
          {program.unit === "seconds"
            ? "Сколько секунд ты можешь удерживать упражнение?"
            : "Сколько повторений ты можешь сделать за 1 подход?"}
        </p>

        <input
          type="number"
          value={result}
          onChange={(e) => setResult(e.target.value)}
          placeholder={program.unit === "seconds" ? "Например, 45" : "Например, 12"}
          style={{ ...inputStyle, maxWidth: 260, marginBottom: 12 }}
        />

        <div>
          <button style={buttonStyle} onClick={onSubmit}>
            Построить план
          </button>
        </div>
      </div>
    </div>
  );
}
