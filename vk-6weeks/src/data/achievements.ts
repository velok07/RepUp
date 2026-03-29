import type { AchievementDefinition } from "../types";

export const achievements: AchievementDefinition[] = [
  {
    id: "first_workout",
    title: "Первый шаг",
    description: "Заверши первую успешную тренировку",
    icon: "⭐",
    color: "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)",
  },
  {
    id: "workout_5",
    title: "Разгон",
    description: "Заверши 5 успешных тренировок",
    icon: "🚀",
    color: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
  },
  {
    id: "workout_10",
    title: "В ритме",
    description: "Заверши 10 успешных тренировок",
    icon: "⚡",
    color: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
  },
  {
    id: "workout_25",
    title: "Машина",
    description: "Заверши 25 успешных тренировок",
    icon: "🏆",
    color: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
  },
  {
    id: "volume_100",
    title: "Первые 100",
    description: "Набери 100 повторений или секунд суммарно",
    icon: "💪",
    color: "linear-gradient(135deg, #10b981 0%, #14b8a6 100%)",
  },
  {
    id: "volume_500",
    title: "Большой объём",
    description: "Набери 500 повторений или секунд суммарно",
    icon: "📈",
    color: "linear-gradient(135deg, #22c55e 0%, #84cc16 100%)",
  },
  {
    id: "volume_1000",
    title: "Тысяча",
    description: "Набери 1000 повторений или секунд суммарно",
    icon: "🔥",
    color: "linear-gradient(135deg, #ef4444 0%, #f97316 100%)",
  },
  {
    id: "streak_3",
    title: "Серия 3",
    description: "Собери серию из 3 успешных тренировок подряд",
    icon: "🔁",
    color: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
  },
  {
    id: "streak_7",
    title: "Серия 7",
    description: "Собери серию из 7 успешных тренировок подряд",
    icon: "🌟",
    color: "linear-gradient(135deg, #7c3aed 0%, #db2777 100%)",
  },
  {
    id: "first_program_finished",
    title: "Финишер",
    description: "Полностью заверши первую программу",
    icon: "🎯",
    color: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
  },
];
