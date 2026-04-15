import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { programs } from "../data/programs";
import { useAppStore } from "../store/appStore";
import type { ProgramType } from "../types";
import { parsePositiveInt, sanitizeDigitsInput } from "../utils/numeric";
import { getInitialLoadAdjustment, getLevelByResult } from "../utils/plan";
import {
  buttonStyle,
  cardStyle,
  inputStyle,
  mutedTextStyle,
  pageTitleStyle,
  secondaryButtonStyle,
} from "../components/ui";

export default function LevelTestScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const startProgram = useAppStore((s) => s.startProgram);
  const [result, setResult] = useState("");

  const program = programs.find((item) => item.id === id);
  const parsedResult = parsePositiveInt(result);
  const hasValidResult = parsedResult !== null && parsedResult > 0;

  if (!program || !id) {
    return <div style={cardStyle}>Программа не найдена</div>;
  }

  const onSubmit = () => {
    if (!hasValidResult) return;

    const level = getLevelByResult(id as ProgramType, parsedResult);
    const loadAdjustment = getInitialLoadAdjustment(id as ProgramType, parsedResult);

    startProgram(id as ProgramType, level, loadAdjustment);
    navigate(`/workout/${id}`);
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "flex-start" }}>
        <button style={secondaryButtonStyle} onClick={() => navigate(`/program/${id}`)}>
          Назад
        </button>
      </div>

      <div
        style={{
          ...cardStyle,
          background:
            "linear-gradient(135deg, var(--primary-color) 0%, var(--primary-strong) 100%)",
          color: "#fff",
          border: "none",
        }}
      >
        <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>Стартовый тест</div>
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
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={result}
          onChange={(e) => setResult(sanitizeDigitsInput(e.target.value, 4))}
          onKeyDown={(event) => {
            if (["-", "+", "e", "E", ".", ","].includes(event.key)) {
              event.preventDefault();
            }
          }}
          onWheel={(event) => {
            event.currentTarget.blur();
          }}
          placeholder={program.unit === "seconds" ? "Например, 45" : "Например, 12"}
          aria-invalid={result.length > 0 && !hasValidResult}
          style={{
            ...inputStyle,
            maxWidth: 260,
            marginBottom: 12,
            fontSize: 16,
            border:
              result.length > 0 && !hasValidResult
                ? "1px solid var(--danger-color)"
                : inputStyle.border,
          }}
        />

        {result.length > 0 && !hasValidResult ? (
          <p style={{ ...mutedTextStyle, color: "var(--danger-color)", marginTop: 0 }}>
            Введи целое число больше 0.
          </p>
        ) : null}

        <p style={{ ...mutedTextStyle, marginTop: 0, marginBottom: 16 }}>
          Если стартовый результат низкий, программа автоматически начнётся в щадящем режиме.
        </p>

        <div>
          <button
            style={{
              ...buttonStyle,
              opacity: hasValidResult ? 1 : 0.5,
              cursor: hasValidResult ? "pointer" : "not-allowed",
            }}
            onClick={onSubmit}
            disabled={!hasValidResult}
          >
            Построить план
          </button>
        </div>
      </div>
    </div>
  );
}
