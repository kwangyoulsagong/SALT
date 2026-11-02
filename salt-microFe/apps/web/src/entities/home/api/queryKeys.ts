export const homeQueryKeys = {
  all: ["home"] as const,
  cards: () => [...homeQueryKeys.all, "cards"] as const,
} as const;
