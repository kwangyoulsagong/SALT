#!/usr/bin/env node
/**
 * DDD 레이어 위반을 **쓰기 시점에** 차단한다 (`SRV-REQ-006` FR-10).
 *
 * Claude Code 의 `PreToolUse` 훅이다. Edit/Write/MultiEdit 직전에 내용을 보고
 * 위반이 있으면 **exit 2** 로 도구 호출 자체를 막는다.
 *
 * 판정은 여기 없다 — 규칙 표는 `layer-rules.cjs` 한 곳이고 ESLint 설정 생성기가 같은
 * 파일을 읽는다. 미러를 만들면 한쪽만 고쳐진다.
 *
 * **훅이 막으면 우회하지 말고 구조를 고친다.** `application` 에서 `infrastructure` 를
 * 부르고 싶어지면 그것은 Port 가 없다는 신호이고, 남의 컨텍스트를 부르고 싶어지면
 * 그 조합은 조합 컨텍스트의 일이다.
 */

import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const rules = require(resolve(here, "layer-rules.cjs"));

const readStdin = async () => {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
};

const isTarget = (filePath) =>
  /(^|\/)salt-server\/src\/.+\.ts$/.test(filePath.split("\\").join("/"));

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

  if (!["Write", "Edit", "MultiEdit"].includes(payload?.tool_name ?? "")) {
    process.exit(0);
  }

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

  process.stderr.write(
    [
      `DDD 레이어 위반 ${violations.length}건 — 쓰기를 막았다 (SRV-REQ-006 FR-10).`,
      `  파일: ${filePath}`,
      ...violations.map((v) => `  · [${v.rule}] ${v.message}`),
      "",
      "우회하지 말고 구조를 고친다. 규칙: salt-server/.claude/rules/server-architecture.md",
    ].join("\n") + "\n"
  );
  process.exit(2);
};

main();
