"use strict";

const { checkImport, checkLocation } = require("../layer-rules.cjs");

/**
 * 레이어·슬라이스 위반을 에디터에서 보여준다.
 *
 * 판정 로직은 갖지 않는다 — `layer-rules.cjs` 를 부른다. 훅과 같은 답을 내야 한다.
 */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "FSD 레이어 방향 · cross-slice · 슬라이스 내부 경로 · zone 교차 · 루트 라우팅 파일 제약",
    },
    schema: [],
    messages: {
      violation: "{{message}}",
    },
  },

  create(context) {
    const filePath = context.filename || context.getFilename();

    const report = (node, violation) => {
      if (!violation) return;
      context.report({
        node,
        messageId: "violation",
        data: { message: violation.message },
      });
    };

    const checkSource = (node) => {
      if (!node || !node.source) return;
      report(node.source, checkImport(filePath, node.source.value));
    };

    return {
      Program(node) {
        const violation = checkLocation(filePath);
        if (violation) report(node, violation);
      },
      ImportDeclaration: checkSource,
      ExportNamedDeclaration: checkSource,
      ExportAllDeclaration: checkSource,
      ImportExpression(node) {
        if (node.source && node.source.type === "Literal") {
          report(node.source, checkImport(filePath, node.source.value));
        }
      },
    };
  },
};
