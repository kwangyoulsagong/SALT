/**
 * 숫자 입력 허용 규칙 — 금액(원) · 소수(금리) · 개수(개월). 플랫폼 무관이라 core(웹 · 앱이 같이 쓴다).
 *
 * **받을 수 없으면 null** — 지우고 이어 붙이지 않는다. 저축 리뷰 3~9차가 같은 결함을 여러 경로로 찾았다:
 * 점 · 전각 점 · 가운뎃점 · 공백을 지우면 1000.5 → 10,005, 쉼표 소수 3,5 → 35%, NFKC 는 ² · ① 까지 숫자로 바꾼다.
 * 그래서 정규화는 **전각 숫자 · 전각 마침표/쉼표만** 반각으로, 그 밖은 허용 목록으로 판정한다. 표는 `numberText.test.ts`.
 */
/**
 * - `won` 원 단위 금액(쉼표 묶음, 앞뒤 ₩ · 원 허용)
 * - `price` 소수 있는 금액 · 수량(정수부 쉼표 묶음 + 점 하나 — 코인 가격 · 수량)
 * - `decimal` 비율 · 금리(점 하나, 쉼표 없음 — "3,5" 를 35 로 읽지 않게, 끝 % 허용)
 * - `count` 개수 · 개월(숫자만)
 */
export type NumberTextKind = "won" | "price" | "decimal" | "count";

const FULLWIDTH_DIGIT = /[０-９]/g;

const toAsciiDigits = (text: string): string =>
  text.replace(FULLWIDTH_DIGIT, (d) => String.fromCharCode(d.charCodeAt(0) - 0xff10 + 0x30));

/**
 * 숫자 글자를 그대로 세 자리씩 — Number 로 바꾸지 않는다(2^53 을 넘으면 끝자리가 바뀐다, 리뷰 10차). 앞 0 은 하나만 남긴다.
 * 묶음 규칙은 여기 한 곳 — web-shared `formatAmountInput` 도 이것을 쓴다
 */
export const groupDigits = (digits: string): string => {
  const trimmed = digits.replace(/^0+(?=\d)/, "");
  return trimmed.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

/** 정수부 · 소수부 자릿수 상한 — 보내는 값은 JS Number 라 15자리를 넘으면 화면 값과 갈라진다(리뷰 11차). 소수 8자리 = 코인 최소 단위 */
const MAX_INTEGER_DIGITS = 15;
const MAX_FRACTION_DIGITS = 8;

const withinDigits = (integerDigits: string, fractionDigits = ""): boolean =>
  integerDigits.replace(/^0+(?=\d)/, "").length <= MAX_INTEGER_DIGITS && fractionDigits.length <= MAX_FRACTION_DIGITS;

/** @returns 표시할 글자(금액은 쉼표 묶음) · 받을 수 없으면 null */
export const readNumberText = (raw: string, kind: NumberTextKind): string | null => {
  let text = toAsciiDigits(raw.trim());
  if (kind === "won") {
    // 붙여넣기 편의 — 앞뒤 화폐 표시만 뗀다(가운데 글자는 그대로 판정)
    text = text.replace(/^[₩￦]\s*/, "").replace(/\s*원$/, "").replace(/，/g, ",");
    // 쉼표 위치는 보지 않는다 — 화면이 입력마다 쉼표를 다시 붙여 지우기 중에 "1,00" 같은 위치가 정상적으로 생긴다. 원화엔 소수가 없어 쉼표 소수 혼동이 없다
    if (!/^[0-9,]*$/.test(text)) return null;
    const digits = text.replace(/,/g, "");
    return withinDigits(digits) ? groupDigits(digits) : null;
  }
  if (kind === "price") {
    text = text.replace(/．/g, ".").replace(/，/g, ",");
    const m = /^([0-9,]*)(?:\.([0-9]*))?$/.exec(text);
    if (!m) return null;
    const integerDigits = (m[1] ?? "").replace(/,/g, "");
    if (!withinDigits(integerDigits, m[2] ?? "")) return null;
    const integer = groupDigits(integerDigits);
    return text.includes(".") ? `${integer || "0"}.${m[2] ?? ""}` : integer;
  }
  if (kind === "decimal") {
    text = text.replace(/\s*[%％]$/, "").replace(/．/g, ".");
    const m = /^([0-9]*)(?:\.([0-9]*))?$/.exec(text);
    return m && withinDigits(m[1] ?? "", m[2] ?? "") ? text : null;
  }
  return /^[0-9]*$/.test(text) && withinDigits(text) ? text : null;
};

/** 소수 8자리까지(입력 상한과 같다) — 저장된 값이 그보다 길어도 칸이 비지 않게 여기서 자른다 */
const plainFormatter = new Intl.NumberFormat("en-US", { useGrouping: false, maximumFractionDigits: 8 });

/**
 * 코드가 넣는 숫자(현재가 · 칩 · 저장된 값)를 그 칸의 입력 글자로 — 같은 규칙(`readNumberText`)을 지난다. `String(n)` 은 1.2e-7 같은
 * 지수 표기를 내고 옛 정리 함수가 그걸 "1.27" 로 바꿨다(리뷰 11차). 규칙 밖이면 빈칸
 */
export const numberToInputText = (n: number, kind: NumberTextKind): string => readNumberText(plainFormatter.format(n), kind) ?? "";
