import type { SavingsGoal } from "../model/types";

/**
 * 미리보기 칸에 열 목표(`FE-REQ-060` FR-8) — 주소 `?goal=` 이 목록에 있으면 그것, 없거나 틀리면 첫 진행 중 목표, 진행 중이 없으면 첫 목표.
 * 목록이 비면 null. 목록 순서는 서버가 준 그대로(정렬 0)
 */
export const resolveSelectedGoal = (fromUrl: string | null, goals: readonly Pick<SavingsGoal, "id" | "status">[]): string | null => {
  if (fromUrl && goals.some((g) => g.id === fromUrl)) return fromUrl;
  return (goals.find((g) => g.status === "active") ?? goals[0])?.id ?? null;
};
