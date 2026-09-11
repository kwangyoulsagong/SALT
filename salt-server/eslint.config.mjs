import tseslint from "typescript-eslint";

import layerRules from "./.claude/hooks/layer-rules.cjs";

/**
 * DDD 레이어 경계를 lint 로 강제한다 (`SRV-REQ-006` FR-12).
 *
 * ## 판정 로직을 다시 쓰지 않는다
 *
 * `no-restricted-imports` 의 glob 으로 방향 규칙을 표현하면 **규칙이 두 벌**이 되고
 * 한쪽만 고쳐진다. 그래서 `.claude/hooks/layer-rules.cjs` 의 `checkImport` 를 그대로 부른다.
 * 훅과 lint 가 같은 답을 낸다 — 다른 것은 **피드백 시점**뿐이다.
 *
 * 스타일 규칙은 넣지 않는다. 이 설정의 목적은 경계 하나다.
 */
const dddPlugin = {
  rules: {
    layers: {
      meta: {
        type: "problem",
        docs: {
          description:
            "DDD 레이어 방향 · 컨텍스트 경계 · domain 의 프레임워크 금지",
        },
        schema: [],
        messages: { violation: "{{message}}" },
      },
      create(context) {
        const filePath = context.filename ?? context.getFilename();

        const report = (node, violation) => {
          if (!violation) return;
          context.report({
            node,
            messageId: "violation",
            data: { message: violation.message },
          });
        };

        const checkSource = (node) => {
          if (!node?.source) return;
          report(node.source, layerRules.checkImport(filePath, node.source.value));
        };

        return {
          Program(node) {
            report(node, layerRules.checkLocation(filePath));
          },
          ImportDeclaration: checkSource,
          ExportNamedDeclaration: checkSource,
          ExportAllDeclaration: checkSource,
          ImportExpression(node) {
            if (node.source?.type === "Literal") {
              report(node.source, layerRules.checkImport(filePath, node.source.value));
            }
          },
        };
      },
    },
  },
};

export default [
  { ignores: ["dist/**", "node_modules/**", "src/generated/**"] },
  {
    files: ["src/**/*.ts"],
    languageOptions: { parser: tseslint.parser },
    plugins: { ddd: dddPlugin },
    rules: { "ddd/layers": "error" },
  },
];
