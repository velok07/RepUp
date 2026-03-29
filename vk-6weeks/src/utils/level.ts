export function getLevelFromXp(xp: number) {
  return Math.floor(xp / 100) + 1;
}

export function getXpProgress(xp: number) {
  const currentLevelXp = xp % 100;

  return {
    current: currentLevelXp,
    max: 100,
    percent: Math.round((currentLevelXp / 100) * 100),
  };
}