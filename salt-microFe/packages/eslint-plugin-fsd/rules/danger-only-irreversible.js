"use strict";

/**
 * 빨강(`danger`)은 **되돌릴 수 없는 일에만** 쓴다 (`FE-REQ-055`, 2026-11-12).
 *
 * 로그아웃이 빨간 메뉴였다(2026-09-24 부터, 커밋에 이유 없음) — 사용자 "로그아웃 버튼이 누가 빨간 걸 써, 취소 · 삭제면 이해하는데".
 * 로그아웃은 다시 로그인하면 되돌아온다. 빨강이 아무 데나 붙으면 정말 되돌릴 수 없는 일(계정 지우기 · 기록 삭제)의 경고가 무뎌진다.
 *
 * 판정: JSX 속성 `tone="danger"` · `variant="danger"`, 객체 속성 `tone: "danger"` · `variant: "danger"` 는 그 줄 바로 위(또는 같은 줄)
 * 주석에 `되돌릴 수 없` 이 있어야 한다 — 무엇이 되돌릴 수 없는지 적는 자리. 없으면 보고한다.
 */
const REASON = /되돌릴 수 없/;
const KEYS = new Set(["tone", "variant"]);

module.exports = {
  meta: {
    type: "problem",
    docs: { description: "danger(빨강)는 되돌릴 수 없는 일에만 — 바로 위 주석에 이유" },
    schema: [],
    messages: {
      danger: '"danger" 는 되돌릴 수 없는 일(삭제 · 계정 지우기)에만 쓴다 — 맞다면 바로 위 주석에 "되돌릴 수 없는" 이유를 적는다',
    },
  },
  create(context) {
    const source = context.sourceCode ?? context.getSourceCode();
    const lines = source.getText().split("\n");
    const hasReason = (node) => {
      const line = node.loc.start.line;
      // 같은 줄 · 바로 위 줄 셋 안의 주석(JSX 주석 `{/* */}` 포함)
      for (let i = Math.max(0, line - 4); i < line; i += 1) if (REASON.test(lines[i] ?? "")) return true;
      return false;
    };
    const isDanger = (value) => value && value.type === "Literal" && value.value === "danger";
    return {
      JSXAttribute(node) {
        if (!KEYS.has(node.name?.name)) return;
        const value = node.value?.type === "JSXExpressionContainer" ? node.value.expression : node.value;
        if (isDanger(value) && !hasReason(node)) context.report({ node, messageId: "danger" });
      },
      Property(node) {
        const key = node.key?.type === "Identifier" ? node.key.name : node.key?.value;
        if (KEYS.has(key) && isDanger(node.value) && !hasReason(node)) context.report({ node, messageId: "danger" });
      },
    };
  },
};
