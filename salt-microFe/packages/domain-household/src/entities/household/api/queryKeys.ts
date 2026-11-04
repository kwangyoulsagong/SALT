export const householdQueryKeys = {
  all: ["Household"] as const,
  month: (ym: string) => [...householdQueryKeys.all, "month", ym] as const,
  suggestions: () => [...householdQueryKeys.all, "suggestions"] as const,
  budget: () => [...householdQueryKeys.all, "budget"] as const,
  templates: () => [...householdQueryKeys.all, "templates"] as const,
  workHours: () => [...householdQueryKeys.all, "work-hours"] as const,
  challenges: () => [...householdQueryKeys.all, "challenges"] as const,
  goalClock: (amount: number) => [...householdQueryKeys.all, "goal-clock", amount] as const,
} as const;
