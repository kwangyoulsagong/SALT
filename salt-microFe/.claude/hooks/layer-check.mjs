#!/usr/bin/env node
/**
 * FSD 레이어 위반을 **쓰기 시점에** 차단한다 (`FE-REQ-009` FR-20).
 *
 * Claude Code 의 `PreToolUse` 훅이다. Edit/Write/MultiEdit 직전에 내용을 보고,
 * 위반이 있으면 **exit 2** 로 도구 호출 자체를 막는다. stderr 가 에이전트에게 돌아간다.
 *
 * ## 왜 lint 로 충분하지 않은가
 *
 * lint 는 파일이 이미 쓰인 다음에 본다. 에이전트는 그 사이에 다음 파일을 쓰고,
 * 위반 위에 위반을 쌓는다. **쓰기 전에 막아야 구조가 무너지지 않는다.**
 * ESLint(`@repo/fsd/layers`)와 겹치는 것은 의도적이다 — 피드백 시점이 다르다.
 *
 * ## 판정은 여기 없다
 *
 * 규칙 표는 `packages/eslint-plugin-fsd/layer-rules.cjs` **한 곳**이고 훅과 lint 가
 * 같은 파일을 읽는다. 미러를 만들면 한쪽만 고쳐진다.
 *
 * ## 훅이 막으면 우회하지 말고 구조를 고친다
 *
 * `@/entities/tax/model/types` 를 직접 찌르고 싶어지면 그것은 barrel 이 부족하다는
 * 신호이고, cross-slice 를 하고 싶어지면 그 공통은 아래 레이어의 것이다.
 */

import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const rules = require(
  resolve(here, "../../packages/eslint-plugin-fsd/layer-rules.cjs")
);

const readStdin = async () => {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
};

/** 검사 대상은 두 앱의 TS/TSX 뿐이다. */
const isTarget = (filePath) =>
  /(^|\/)salt-microFe\/apps\/[^/]+\/(src|app|pages)\/.+\.(ts|tsx)$/.test(
    filePath.split("\\").join("/")
  );

/** Write 는 `content`, Edit 는 `new_string`, MultiEdit 는 `edits[].new_string`. */
const codeOf = (toolInput) => {
  if (typeof toolInput?.content === "string") return toolInput.content;
  if (typeof toolInput?.new_string === "string") return toolInput.new_string;
  if (Array.isArray(toolInput?.edits)) {
    return toolInput.edits.map((edit) => edit?.new_string ?? "").join("\n");
  }
  return "";
};

const main = async () => {
  let payload;
  try {
    payload = JSON.parse(await readStdin());
  } catch {
    process.exit(0);
  }

  const toolName = payload?.tool_name ?? "";
  if (!["Write", "Edit", "MultiEdit"].includes(toolName)) process.exit(0);

  const filePath = payload?.tool_input?.file_path ?? "";
  if (!isTarget(filePath)) process.exit(0);

  const violations = [];

  const location = rules.checkLocation(filePath);
  if (location) violations.push(location);

  for (const source of rules.extractImportSources(codeOf(payload.tool_input))) {
    const violation = rules.checkImport(filePath, source);
    if (violation) violations.push(violation);
  }

  if (violations.length === 0) process.exit(0);

  const lines = violations.map((v) => `  · [${v.rule}] ${v.message}`);
  process.stderr.write(
    [
      `FSD 레이어 위반 ${violations.length}건 — 쓰기를 막았다 (FE-REQ-009 FR-20).`,
      `  파일: ${filePath}`,
      ...lines,
      "",
      "우회하지 말고 구조를 고친다. 규칙: salt-microFe/.claude/rules/layered-architecture.md",
    ].join("\n") + "\n"
  );
  process.exit(2);
};

main();
