import { createHashRouter } from "react-router-dom";
import App from "./App";

import HomeScreen from "../screens/HomeScreen";
import ProgramsScreen from "../screens/ProgramsScreen";
import ProgramDetailsScreen from "../screens/ProgramDetailsScreen";
import LevelTestScreen from "../screens/LevelTestScreen";
import PlanScreen from "../screens/PlanScreen";
import WorkoutScreen from "../screens/WorkoutScreen";
import ProgressScreen from "../screens/ProgressScreen";
import AchievementsScreen from "../screens/AchievementsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ResultScreen from "../screens/ResultScreen";

export const router = createHashRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <HomeScreen />,
      },
      {
        path: "programs",
        element: <ProgramsScreen />,
      },
      {
        path: "program/:id",
        element: <ProgramDetailsScreen />,
      },
      {
        path: "level-test/:id",
        element: <LevelTestScreen />,
      },
      {
        path: "plan/:id",
        element: <PlanScreen />,
      },
      {
        path: "workout/:id",
        element: <WorkoutScreen />,
      },
      {
        path: "progress",
        element: <ProgressScreen />,
      },
      {
        path: "achievements",
        element: <AchievementsScreen />,
      },
      {
        path: "profile",
        element: <ProfileScreen />,
      },
      {
        path: "result",
        element: <ResultScreen />,
      },
    ],
  },
]);