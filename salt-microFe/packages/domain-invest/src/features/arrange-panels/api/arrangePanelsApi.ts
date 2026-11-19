import type { LayoutNode } from "@repo/ui/layoutTree";

import { COACH_ENDPOINTS } from "@/entities/coach";
import { apiFetch, readApiError } from "@repo/web-shared/api";
import { INVESTMENTS_BASE_URL } from "@repo/web-shared/config";

/** PC 패널 배치 저장(`PUT /api/app/coach/panel-layout`, F006 A절 · `BFF-REQ-028`) — 204, 본문 없음 */
export const arrangePanelsApi = {
  save: async (tree: LayoutNode): Promise<void> => {
    const response = await apiFetch(`${INVESTMENTS_BASE_URL}${COACH_ENDPOINTS.panelLayout}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tree }),
    });
    if (!response.ok) throw await readApiError(response, "save panel layout");
  },
};
