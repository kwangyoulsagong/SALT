/**
 * PC 패널 배치(F006 A절 · `DB-REQ-021` FR-20~24 · `SRV-REQ-029` FR-30).
 *
 * 배치 트리의 형식은 프론트 `@repo/ui/layoutTree` 가 주인이다 — 서버는 **모양을 검사하지 않고**(FR-24) 크기만 본다.
 * 저장은 편의 기능이라 실패해도 화면은 기본 배치로 돈다(FR-23).
 */

/** 서피스 — 지금은 PC 하나(`panel_layouts_surface_check` 와 같은 목록) */
export const PANEL_LAYOUT_SURFACES = ["pc"] as const;
export type PanelLayoutSurface = (typeof PANEL_LAYOUT_SURFACES)[number];

/**
 * 트리 JSON 크기 상한(바이트, 압축한 JSON 기준) — 넘으면 413(`SRV-REQ-029` FR-30).
 * DB 제약(`panel_layouts_tree_size_check`)은 그 두 배 — jsonb 를 글로 바꾸면 `:` · `,` 뒤에 빈칸이 붙어 같은 트리가 더 길게 세진다.
 * 제약은 앱을 건너뛴 쓰기를 막는 뒷문 잠금이고, 사용자가 만나는 문턱은 이 값이다
 */
export const PANEL_LAYOUT_MAX_BYTES = 16 * 1024;

/** 트리 JSON 의 바이트 수(압축한 JSON · UTF-8) */
export const panelLayoutBytes = (tree: unknown): number => Buffer.byteLength(JSON.stringify(tree) ?? "", "utf8");

export interface PanelLayoutRecord {
  tree: unknown;
  updatedAt: Date;
}

export interface PanelLayoutStore {
  /** 이 사람 · 이 서피스의 배치. 없으면 `null`(기본 배치) */
  find(userId: string, surface: PanelLayoutSurface): Promise<PanelLayoutRecord | null>;
  /** 덮어쓴다 — 사람당 서피스당 한 줄(`@@unique`), 첫 저장 경합도 한 문장(`ON CONFLICT DO UPDATE`) */
  save(userId: string, surface: PanelLayoutSurface, tree: unknown): Promise<void>;
}
