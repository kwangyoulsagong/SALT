import { z } from "zod";

/** 목록 페이지. 상한(50)은 유스케이스도 건다 — 워커가 같은 유스케이스를 부를 때를 위해. */
export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  size: z.coerce.number().int().min(1).max(50).optional(),
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
