"use strict";

/**
 * zone 경로에 `next/link`의 `<Link>`를 쓰지 못하게 한다 (FE-REQ-007 FR-5 → FE-REQ-052 FR-5).
 *
 * Multi-Zones에서 zone을 넘는 이동은 **hard navigation**이다. `<Link>`는 상대 경로를
 * prefetch하고 soft navigate하려 하는데, 대상이 다른 Next 앱이면 그 둘 다 동작하지 않는다.
 *
 * 경로 목록은 **레지스트리 전체**에서 계산한다 — 파일이 놓인 앱(`apps/<app>/`)을 보고
 * `@repo/core` 의 `registry.cjs`(데이터는 `registry.json` 한 곳)에 묻는다. eslintrc 는 ESM 을 못 읽어
 * CommonJS 사본을 둔다. TS 쪽과 계산이 같은지는 `registry.test.ts` 가 대조한다.
 * `zonePaths` 옵션은 테스트 · 앱 밖 파일용 덮어쓰기다 — 앱 설정에 경로를 복사하지 않는다.
 */

const registry = require("../../core/src/zones/registry.cjs");

/** `apps/<app>/...` 의 앱 이름. 앱 밖이면 셸로 본다. */
const appOf = (filename) => {
  const match = (filename || "").split("\\").join("/").match(/(?:^|\/)apps\/([^/]+)\//);
  return match ? match[1] : registry.SHELL_APP;
};

/** 셸의 `/` 는 루트 하나만 — 나머지 경로를 전부 삼키지 않는다. */
const matchesPrefix = (href, prefix) =>
  prefix === "/" ? href === "/" : href === prefix || href.startsWith(prefix + "/");

const isCrossZonePath = (href, zonePaths) =>
  typeof href === "string" &&
  href.startsWith("/") &&
  zonePaths.some((prefix) => matchesPrefix(href.split(/[?#]/)[0], prefix));

/** 정적으로 값을 알 수 있는 href만 판정한다. */
const readStaticHref = (attribute) => {
  const value = attribute.value;
  if (!value) return null;

  if (value.type === "Literal") {
    return typeof value.value === "string" ? value.value : null;
  }

  if (value.type === "JSXExpressionContainer") {
    const expression = value.expression;
    if (expression.type === "Literal") {
      return typeof expression.value === "string" ? expression.value : null;
    }
    // `` `/tips/${id}` `` — 앞부분만 보면 zone 판정에 충분하다.
    if (expression.type === "TemplateLiteral" && expression.quasis.length > 0) {
      return expression.quasis[0].value.cooked;
    }
  }

  return null;
};

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "다른 zone의 경로에는 next/link의 <Link> 대신 <a> 또는 CrossZoneLink를 쓴다",
    },
    schema: [
      {
        type: "object",
        properties: {
          zonePaths: {
            type: "array",
            items: { type: "string" },
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      crossZoneLink:
        "'{{href}}'는 다른 zone({{prefix}})의 경로다. <Link>는 zone을 넘을 때 prefetch·soft navigation이 동작하지 않는다. <a href> 또는 CrossZoneLink를 쓴다. (FE-REQ-052 · microfrontend.md §4)",
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const filename = context.filename || context.getFilename();
    const zonePaths = options.zonePaths || registry.crossZonePathPrefixes(appOf(filename));

    /** `next/link`의 default import에 붙은 지역 이름들 */
    const nextLinkNames = new Set();

    return {
      ImportDeclaration(node) {
        if (node.source.value !== "next/link") return;

        for (const specifier of node.specifiers) {
          if (specifier.type === "ImportDefaultSpecifier") {
            nextLinkNames.add(specifier.local.name);
          }
        }
      },

      JSXOpeningElement(node) {
        if (node.name.type !== "JSXIdentifier") return;
        if (!nextLinkNames.has(node.name.name)) return;

        for (const attribute of node.attributes) {
          if (attribute.type !== "JSXAttribute") continue;
          if (attribute.name.name !== "href") continue;

          const href = readStaticHref(attribute);
          if (!isCrossZonePath(href, zonePaths)) continue;

          const prefix = zonePaths.find((candidate) =>
            matchesPrefix(href.split(/[?#]/)[0], candidate)
          );

          context.report({
            node: attribute,
            messageId: "crossZoneLink",
            data: { href, prefix },
          });
        }
      },
    };
  },
};

module.exports.appOf = appOf;
