"use strict";

/**
 * zone 경로에 `next/link`의 `<Link>`를 쓰지 못하게 한다 (FE-REQ-007 FR-5).
 *
 * Multi-Zones에서 zone을 넘는 이동은 **hard navigation**이다. `<Link>`는 상대 경로를
 * prefetch하고 soft navigate하려 하는데, 대상이 다른 Next 앱이면 그 둘 다 동작하지 않는다.
 *
 * 경로 목록의 단일 소스는 `@repo/core/zones`의 `CROSS_ZONE_PATH_PREFIXES`다.
 * 이 규칙은 CommonJS 플러그인이라 TS 소스를 import할 수 없어 `zonePaths` 옵션으로 받는다.
 * **두 곳이 어긋나면 안 된다** — 앱의 eslint 설정이 레지스트리 값을 그대로 넘긴다.
 */

const DEFAULT_ZONE_PATHS = ["/tax", "/tax-static"];

/** `/tax`, `/tax/...`는 걸리고 `/taxes`는 걸리지 않는다. */
const isCrossZonePath = (href, zonePaths) =>
  typeof href === "string" &&
  href.startsWith("/") &&
  zonePaths.some((prefix) => href === prefix || href.startsWith(prefix + "/"));

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
    // `` `/tax/${id}` `` — 앞부분만 보면 zone 판정에 충분하다.
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
        "'{{href}}'는 다른 zone({{prefix}})의 경로다. <Link>는 zone을 넘을 때 prefetch·soft navigation이 동작하지 않는다. <a href> 또는 CrossZoneLink를 쓴다. (FE-REQ-007 FR-5)",
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const zonePaths = options.zonePaths || DEFAULT_ZONE_PATHS;

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

          const prefix = zonePaths.find(
            (candidate) => href === candidate || href.startsWith(candidate + "/")
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

module.exports.DEFAULT_ZONE_PATHS = DEFAULT_ZONE_PATHS;
