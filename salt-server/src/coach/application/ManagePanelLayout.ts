import type { PanelLayoutRecord, PanelLayoutStore, PanelLayoutSurface } from "../domain";

/**
 * PC 패널 배치 읽기(F006 A절 · `SRV-REQ-029`). 없으면 `null` — 화면이 기본 배치를 쓴다.
 */
export class GetPanelLayout {
  constructor(private readonly store: PanelLayoutStore) {}

  execute(userId: string, surface: PanelLayoutSurface): Promise<PanelLayoutRecord | null> {
    return this.store.find(userId, surface);
  }
}

/**
 * PC 패널 배치 저장(덮어쓰기). 모양은 보지 않는다(`DB-REQ-021` FR-24) — 크기 문턱은 받는 자리(presentation)가 413 으로 먼저 거른다.
 */
export class SavePanelLayout {
  constructor(private readonly store: PanelLayoutStore) {}

  execute(userId: string, surface: PanelLayoutSurface, tree: unknown): Promise<void> {
    return this.store.save(userId, surface, tree);
  }
}
