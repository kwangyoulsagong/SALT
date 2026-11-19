import { randomUUID } from "node:crypto";

import prisma from "../../shared/infrastructure/prisma";
import type { PanelLayoutRecord, PanelLayoutStore, PanelLayoutSurface } from "../domain";

/**
 * PC 패널 배치 — `panel_layouts`(F006 A절 · `DB-REQ-021` FR-20~24).
 *
 * 저장은 한 문장 `INSERT … ON CONFLICT (user_id, surface) DO UPDATE` — Prisma `upsert` 는 조회 → 쓰기 두 단계라 첫 저장이
 * 두 탭에서 겹치면 유니크 위반이 된다(`prisma-database.md` 경합 규칙). 같은 사람의 두 저장은 나중 것이 이긴다.
 */
export class PrismaPanelLayoutStore implements PanelLayoutStore {
  async find(userId: string, surface: PanelLayoutSurface): Promise<PanelLayoutRecord | null> {
    const row = await prisma.panelLayout.findUnique({
      where: { userId_surface: { userId, surface } },
      select: { treeJson: true, updatedAt: true },
    });
    return row ? { tree: row.treeJson, updatedAt: row.updatedAt } : null;
  }

  async save(userId: string, surface: PanelLayoutSurface, tree: unknown): Promise<void> {
    const json = JSON.stringify(tree);
    await prisma.$executeRaw`
      INSERT INTO panel_layouts (id, user_id, surface, tree_json, updated_at)
      VALUES (${randomUUID()}, ${userId}, ${surface}, ${json}::jsonb, now())
      ON CONFLICT (user_id, surface) DO UPDATE SET tree_json = EXCLUDED.tree_json, updated_at = now()`;
  }
}
