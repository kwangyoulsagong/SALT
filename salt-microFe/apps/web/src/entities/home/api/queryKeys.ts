export const homeQueryKeys = {
  all: ["home"] as const,
  cards: () => [...homeQueryKeys.all, "cards"] as const,
  market: () => [...homeQueryKeys.all, "market"] as const,
  briefing: () => [...homeQueryKeys.all, "briefing"] as const,
  weeklyPlan: () => [...homeQueryKeys.all, "weekly-plan"] as const,
} as const;
