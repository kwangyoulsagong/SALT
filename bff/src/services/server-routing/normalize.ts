/**
 * 골든 · 그림자 비교의 정규화 — 매번 달라지는 값(시각 · ID · 추적)을 자리 표시로 바꾼 뒤 비교한다(`BFF-REQ-045` FR-2).
 *
 * | 규칙 | 바꾸는 것 |
 * |---|---|
 * | ISO 시각 문자열 | `<time>` — 응답 시각 · 생성 시각은 두 서버가 같을 수 없다 |
 * | UUID | `<uuid>` |
 * | cuid(Prisma 기본 ID `c` + 24자) | `<id>` |
 * | 키 `traceId` · `requestId` | `<trace>` |
 *
 * **숫자는 바꾸지 않는다** — 금액 · 비율이 다르면 그건 차이다(계산 경로는 소수점까지, `msa-services.md` §7).
 * 객체 키 순서는 비교하지 않는다(JSON 의미가 같다). 배열 순서는 비교한다.
 */
const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CUID = /^c[a-z0-9]{24}$/;
const TRACE_KEYS = new Set(["traceId", "requestId"]);

export const normalize = (value: unknown, key?: string): unknown => {
  if (key !== undefined && TRACE_KEYS.has(key) && value !== null) return "<trace>";
  if (typeof value === "string") {
    if (ISO_TIME.test(value)) return "<time>";
    if (UUID.test(value)) return "<uuid>";
    if (CUID.test(value)) return "<id>";
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => normalize(item));
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, normalize(v, k)]));
  }
  return value;
};

/**
 * 첫 차이의 **경로만** 돌려준다(`data.items[2].price`). 값은 돌려주지 않는다 — 기록 · 로그에 금액이 남지 않게(`SRV-REQ-044` FR-5 와 같은 뜻).
 * 같으면 null.
 */
export const firstDifference = (expected: unknown, actual: unknown, path = "$"): string | null => {
  if (Object.is(expected, actual)) return null;
  if (Array.isArray(expected) && Array.isArray(actual)) {
    if (expected.length !== actual.length) return `${path}.length`;
    for (let i = 0; i < expected.length; i++) {
      const diff = firstDifference(expected[i], actual[i], `${path}[${i}]`);
      if (diff) return diff;
    }
    return null;
  }
  const isObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);
  if (isObject(expected) && isObject(actual)) {
    const keys = [...new Set([...Object.keys(expected), ...Object.keys(actual)])].sort();
    for (const k of keys) {
      if (!(k in expected) || !(k in actual)) return `${path}.${k}`;
      const diff = firstDifference(expected[k], actual[k], `${path}.${k}`);
      if (diff) return diff;
    }
    return null;
  }
  return path;
};
