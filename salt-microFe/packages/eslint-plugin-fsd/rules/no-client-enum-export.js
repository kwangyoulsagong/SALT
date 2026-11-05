"use strict";

/**
 * `"use client"` 파일에서 `enum` 을 내보내지 않는다 (`FE-REQ-058`, 2026-11-05 · `ssr.md`).
 *
 * 클라이언트 모듈을 서버 컴포넌트가 import 하면 내보낸 것은 전부 **클라이언트 참조**가 된다 — 컴포넌트는 그래도 그려지지만
 * 값(enum 멤버)은 서버에서 `undefined` 다. 저축 화면이 `<TimelyTip context={TimelyTipContext.Savings} />` 를 서버에서 넘겼고
 * 요청이 `context=undefined` 로 나가 400 이었다. 타입 검사 · 빌드 · 단위 테스트가 다 통과해 실화면에서만 보였다.
 *
 * 판정: 파일 첫 지시문이 `"use client"` 이고 `export enum …` 이 있으면 보고한다. 값은 지시문 없는 파일(`context.ts` · `model/`)로 옮긴다.
 * 상수(`export const`)는 막지 않는다 — 지금 클라이언트 훅이 내보내는 상수(쿼리 키 등)는 클라이언트 코드만 읽는다.
 */
module.exports = {
  meta: {
    type: "problem",
    docs: { description: '"use client" 파일에서 enum 을 내보내지 않는다 — 서버 컴포넌트에서 undefined 가 된다' },
    schema: [],
    messages: {
      clientEnum: '"use client" 파일의 enum {{name}} 은 서버 컴포넌트에서 undefined 다 — 지시문 없는 파일(model · context.ts)로 옮긴다',
    },
  },
  create(context) {
    let isClient = false;
    return {
      Program(program) {
        const first = program.body[0];
        isClient = first?.type === "ExpressionStatement" && first.directive === "use client";
      },
      ExportNamedDeclaration(node) {
        if (isClient && node.declaration?.type === "TSEnumDeclaration") {
          context.report({ node, messageId: "clientEnum", data: { name: node.declaration.id.name } });
        }
      },
    };
  },
};
