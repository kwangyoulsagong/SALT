import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";
import { lineCard } from "@repo/web-shared/ui/surface.css";

/**
 * 이야기 카드(가계부 S1g) — 가계부 표면과 같은 글자 값. 칭찬 · 경고 색 0.
 * 공유 이미지는 이 카드의 계산된 색 · 글꼴을 읽어 같은 모양으로 그린다(`features/share-story`) — 색을 두 곳에 적지 않는다.
 */
/** 이야기 카드 — 선 카드(카드 판 위에선 흰 카드 모서리 20 · 선 0 — `FE-REQ-076` 2단계). 공유 이미지는 문장 · 색만 읽어 따로 그린다 */
export const card = style([lineCard, { gap: "12px", margin: 0, borderRadius: "16px", color: vars.colors.text.primary, maxWidth: "480px" }]);

export const title = style({ margin: 0, fontSize: "18px", lineHeight: "26px", fontWeight: 700 });

export const lines = style({ display: "flex", flexDirection: "column", gap: "8px", margin: 0, padding: 0, listStyle: "none" });

export const line = style({ margin: 0, fontSize: "15px", lineHeight: "22px", overflowWrap: "anywhere" });

export const empty = style({ margin: 0, fontSize: "14px", lineHeight: "20px", color: vars.colors.text.tertiary });
