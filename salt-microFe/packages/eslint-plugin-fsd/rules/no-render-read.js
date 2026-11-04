"use strict";

/**
 * 렌더 중에 서버와 브라우저가 다른 값을 읽지 않는다 (`DEV-001`, `ssr.md` · `streaming-ssr.md` §2).
 *
 * 컴포넌트 · 훅 본문(과 그 안의 `useMemo` · `useState` 초기값처럼 렌더 중에 도는 함수)에서
 *  - 토큰 읽기 `readAccessToken()` — 서버는 "로그아웃", 브라우저는 "로그인"을 그려 수화가 갈린다(2026-11-02 `/search`)
 *  - 지금 시각 `Date.now()` · `new Date()` · 난수 `Math.random()` — 서버와 브라우저 값이 다르다
 *  - `localStorage` · `sessionStorage` — 서버에 없다
 * 를 막는다. 이벤트 처리기 · `useEffect` 안 · 다른 콜백은 렌더가 아니라 괜찮다.
 *
 * 판정: 가장 가까운 함수를 거슬러 올라가며 "렌더 중에 도는 함수"인지 본다 —
 * 이름이 대문자(컴포넌트) · `use` 로 시작(훅)이면 렌더, `useMemo` · `useState` 등의 인자로 넘긴 함수면 바깥 함수를 다시 본다,
 * 그 밖의 함수(처리기 · 효과 · 콜백)면 렌더가 아니다.
 */
const RENDER_TIME_HOOK_ARGS = new Set(["useMemo", "useState", "useReducer", "useRef"]);

const functionName = (fn) => {
  if (fn.id?.name) return fn.id.name;
  const parent = fn.parent;
  if (parent?.type === "VariableDeclarator" && parent.id.type === "Identifier") return parent.id.name;
  // memo(function X(){}) · forwardRef((p) => …) 처럼 감싼 컴포넌트
  if (parent?.type === "CallExpression" && ["memo", "forwardRef"].includes(calleeName(parent))) {
    const decl = parent.parent;
    if (decl?.type === "VariableDeclarator" && decl.id.type === "Identifier") return decl.id.name;
  }
  return null;
};

const calleeName = (call) => {
  const c = call.callee;
  if (c.type === "Identifier") return c.name;
  if (c.type === "MemberExpression" && c.property.type === "Identifier") return c.property.name;
  return null;
};

const isFunction = (n) => n.type === "FunctionDeclaration" || n.type === "FunctionExpression" || n.type === "ArrowFunctionExpression";

/** 이 노드가 렌더 중에 실행되는가 */
const runsDuringRender = (node) => {
  let fn = node.parent;
  while (fn && !isFunction(fn)) fn = fn.parent;
  while (fn) {
    const name = functionName(fn);
    if (name && (/^[A-Z]/.test(name) || /^use[A-Z]/.test(name))) return true;
    const parent = fn.parent;
    if (parent?.type === "CallExpression" && parent.arguments[0] === fn && RENDER_TIME_HOOK_ARGS.has(calleeName(parent))) {
      fn = parent.parent;
      while (fn && !isFunction(fn)) fn = fn.parent;
      continue;
    }
    return false;
  }
  return false; // 모듈 최상단 — 이 규칙의 대상이 아니다(모듈 평가는 한 번)
};

const reason = (node) => {
  if (node.type === "NewExpression") {
    return node.callee.type === "Identifier" && node.callee.name === "Date" && node.arguments.length === 0 ? "new Date()" : null;
  }
  if (node.type === "CallExpression") {
    const c = node.callee;
    if (c.type === "Identifier" && c.name === "readAccessToken") return "readAccessToken()";
    if (c.type === "MemberExpression" && c.object.type === "Identifier" && c.property.type === "Identifier") {
      const key = `${c.object.name}.${c.property.name}`;
      if (key === "Date.now" || key === "Math.random") return `${key}()`;
      if (c.object.name === "localStorage" || c.object.name === "sessionStorage") return key;
    }
  }
  return null;
};

module.exports = {
  meta: {
    type: "problem",
    docs: { description: "렌더 중 토큰 · 지금 시각 · 난수 · 브라우저 저장소 읽기 금지(서버와 브라우저 화면이 갈린다)" },
    schema: [],
    messages: {
      renderRead:
        "{{what}} 를 렌더 중에 읽지 않는다 — 서버와 브라우저 값이 달라 수화가 갈린다. 로그인 여부는 useHasAccessToken, 시각은 서버가 준 값 · useEffect 안에서(DEV-001 · ssr.md)",
    },
  },
  create(context) {
    const check = (node) => {
      const what = reason(node);
      if (what && runsDuringRender(node)) context.report({ node, messageId: "renderRead", data: { what } });
    };
    return { CallExpression: check, NewExpression: check };
  },
};
