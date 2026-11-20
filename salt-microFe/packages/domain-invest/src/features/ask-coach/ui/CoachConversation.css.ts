import { globalStyle, style } from "@vanilla-extract/css";

import { ON_MOBILE } from "@repo/core/mobile";
import { vars } from "@repo/ui/tokens";
import { TEXT_MAX_WIDTH } from "@repo/web-shared/config";

/**
 * 코치 대화 한 면 — 가운데 한 줄 대화(2026-11-19 재설계, 리서치 `salt-microFe/requirements/reports/research/2026-11-19-coach-chat.md`).
 * 칸 최대 720 · 대화 기록만 스크롤 · 입력은 칸 아래에 붙는다. 코치 답은 말풍선 없는 본문, 내 질문만 옅은 보라 말풍선.
 * 글자는 데스크톱 단(`deskType`) — 답 본문만 읽기 좋게 14/23(문장 줄)
 */

/** 머리 52 + 화면 제목 줄 + 패널 여백을 뺀 높이 — 입력이 늘 화면 안에 */
export const root = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.md,
  width: "100%",
  maxWidth: `${TEXT_MAX_WIDTH}px`,
  margin: "0 auto",
  height: "calc(100dvh - 208px)",
  minHeight: "480px",
  selectors: { [ON_MOBILE]: { height: "calc(100dvh - 120px)", minHeight: "420px" } },
});

export const logFrame = style({ position: "relative", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" });

/** 대화 기록 — 차례 사이 24 */
export const log = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.xl,
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
  overscrollBehavior: "contain",
  // 좌우 여백 0 — 브리핑 카드 · 시작 질문 양 끝이 입력 상자와 같아야 한다(4px 안쪽으로 들어가 있었다, 2026-11-19 사용자 "정렬")
  padding: `${vars.space.xs} 0 ${vars.space.lg}`,
  ":focus-visible": { outline: `2px solid ${vars.colors.brand.primary}`, outlineOffset: "2px", borderRadius: "8px" },
});

/** 대화 시작 전 — 브리핑 · 시작 질문을 입력 상자 바로 위로(가운데가 비지 않게, 2026-11-20 사용자 "빈게 많구") */
// flex-end 는 넘칠 때 위쪽이 스크롤로 닿지 않는다 — 첫 칸 위 여백(auto)으로 내린다
export const logStart = style({});
globalStyle(`${logStart} > :first-child`, { marginTop: "auto" });

export const older = style({ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" });

/** 맨 위 보관 안내 — 12/500 2단 · 가운데(`FE-REQ-031` FR-25) */
export const keepNote = style({
  margin: 0,
  textAlign: "center",
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
  wordBreak: "keep-all",
});

export const newMessage = style({
  position: "absolute",
  left: "50%",
  bottom: vars.space.sm,
  transform: "translateX(-50%)",
});

/** 코치 답 — 말풍선 없음, 칸 폭 */
export const answer = style({ display: "flex", flexDirection: "column", gap: vars.space.sm, minWidth: 0 });

export const sentences = style({
  margin: 0,
  padding: 0,
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  fontSize: vars.deskType.section.fontSize,
  lineHeight: "23px",
  fontWeight: vars.fontWeights.regular,
  color: vars.colors.desk.text1,
  wordBreak: "keep-all",
});

/** 내 질문 — 오른쪽 · 옅은 보라 · 보낸 쪽 아래 모서리만 덜 둥글게 */
export const question = style({
  alignSelf: "flex-end",
  maxWidth: "min(80%, 520px)",
  margin: 0,
  padding: "10px 14px",
  borderRadius: "16px 16px 4px 16px",
  background: vars.colors.brand.lighter,
  color: vars.colors.desk.text1,
  fontSize: vars.deskType.section.fontSize,
  lineHeight: "22px",
  fontWeight: vars.fontWeights.medium,
  wordBreak: "keep-all",
  whiteSpace: "pre-wrap",
});

/** 오늘의 브리핑 — 말풍선이 아니라 카드 */
export const briefing = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.sm,
  padding: vars.space.lg,
  borderRadius: "12px",
  background: vars.colors.background.white,
  boxShadow: `inset 0 0 0 1px ${vars.colors.desk.line}`,
});

export const briefingTitle = style({
  margin: 0,
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  color: vars.colors.desk.text1,
});

/** 답 아래 한 줄 — 출처 · 계산 시각(12/500 · 2단) */
export const meta = style({
  margin: 0,
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
});

export const links = style({ display: "flex", flexWrap: "wrap", gap: vars.space.md, margin: 0, padding: 0, listStyle: "none" });

/** 다른 화면으로 가는 글자 버튼 + 셰브론 */
export const link = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "2px",
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  color: vars.colors.brand.primary,
  textDecoration: "none",
  ":hover": { textDecoration: "underline" },
  ":focus-visible": { outline: `2px solid ${vars.colors.brand.primary}`, outlineOffset: "2px", borderRadius: "4px" },
});

export const card = style({ display: "flex", flexDirection: "column", gap: vars.space.xs });

/** 시작 질문(대화 0) — 2 × 2 */
export const starters = style({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: vars.space.sm,
  margin: 0,
  padding: 0,
  listStyle: "none",
});

/** 이어 묻기(대화 중) — 마지막 답 아래 한 줄 */
export const followUps = style({ display: "flex", flexWrap: "wrap", gap: vars.space.sm, margin: 0, padding: 0, listStyle: "none" });

const chipBase = {
  display: "flex",
  alignItems: "center",
  width: "100%",
  border: "none",
  boxShadow: `inset 0 0 0 1px ${vars.colors.border.default}`,
  background: vars.colors.background.white,
  color: vars.colors.desk.text1,
  fontFamily: "inherit",
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  textAlign: "left" as const,
  cursor: "pointer",
  transition: `background ${vars.motion.duration.instant}`,
  ":hover": { background: vars.colors.desk.line },
  ":disabled": { cursor: "default", color: vars.colors.desk.text2 },
  ":focus-visible": { outline: `2px solid ${vars.colors.brand.primary}`, outlineOffset: "2px" },
};

export const starter = style({ ...chipBase, gap: vars.space.md, minHeight: "64px", padding: "12px 14px", borderRadius: "12px", textAlign: "left" });

/** 시작 질문 아이콘 판 — 브랜드 옅은 면(2026-11-20 — 글자만 있던 칩이 밋밋했다) */
export const starterIcon = style({
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
  width: "32px",
  height: "32px",
  borderRadius: "8px",
  background: vars.colors.brand.lighter,
  color: vars.colors.brand.active,
});

export const starterText = style({ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 });

export const starterHint = style({
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
});

export const followUp = style({ ...chipBase, width: "auto", minHeight: "32px", padding: "6px 12px", borderRadius: "16px" });

/** 입력 박스 하나 — 글 칸 + 보내기 아이콘이 안에 */
export const composer = style({
  display: "flex",
  alignItems: "flex-end",
  gap: vars.space.sm,
  padding: "8px 8px 8px 16px",
  borderRadius: "16px",
  background: vars.colors.background.white,
  boxShadow: `inset 0 0 0 1px ${vars.colors.border.default}`,
  selectors: { "&:focus-within": { boxShadow: `inset 0 0 0 2px ${vars.colors.brand.primary}` } },
});

export const input = style({
  flex: 1,
  minWidth: 0,
  minHeight: "36px",
  maxHeight: "132px",
  padding: "7px 0",
  border: "none",
  outline: "none",
  resize: "none",
  background: "transparent",
  color: vars.colors.desk.text1,
  fontFamily: "inherit",
  fontSize: vars.deskType.section.fontSize,
  lineHeight: "22px",
  "::placeholder": { color: vars.colors.desk.text2 },
});

export const composerSide = style({ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: vars.space.xs });

/** 400자를 넘을 때만 — 압박 색 없이 본문 2단 */
export const counter = style({
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  color: vars.colors.desk.text2,
  fontVariantNumeric: "tabular-nums",
});

/** 보내기 아이콘 버튼 32(누름 영역은 박스 안 여백까지 40 안팎) */
export const send = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "32px",
  height: "32px",
  flexShrink: 0,
  border: "none",
  borderRadius: "10px",
  background: vars.colors.brand.primary,
  color: vars.colors.text.white,
  cursor: "pointer",
  ":disabled": { background: vars.colors.neutral[300], cursor: "default" },
  ":focus-visible": { outline: `2px solid ${vars.colors.brand.primary}`, outlineOffset: "2px" },
});

/** 보내기 실패 · 대화 기록 실패 — 그 자리 한 줄 */
export const note = style({
  margin: 0,
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
});

/** 면책 — 입력 아래 한 번 */
export const disclaimer = style([note, { textAlign: "center" }]);
