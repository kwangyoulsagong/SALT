export const goalQueryKeys = {
  all: ["SavingsGoal"] as const,
  list: () => [...goalQueryKeys.all, "list"] as const,
  detail: (id: string) => [...goalQueryKeys.all, "detail", id] as const,
  templates: ["SavingsTemplates"] as const,
} as const;
