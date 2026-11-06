export const notificationQueryKeys = {
  all: ["notification"] as const,
  prefs: () => [...notificationQueryKeys.all, "prefs"] as const,
} as const;
