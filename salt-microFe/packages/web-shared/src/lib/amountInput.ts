/**
 * 금액 · 수량 **입력 표시** — 계산이 아니다. 사용자가 친 글자를 콤마 붙여 보여 주고, 보낼 때 숫자로 읽는다.
 * 금액을 만드는 연산(곱 · 비율)은 여기 없다 — 전부 서버(`fsd-shared.md` "포맷은 여기, 계산은 없다").
 */

const groupFormatter = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });

/** `1234567.5` → `1,234,567.5`. 숫자 · 점 말고는 버리고, 점은 첫 하나만 둔다 */
export const formatAmountInput = (raw: string): string => {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const [integer = "", ...rest] = cleaned.split(".");
  const fraction = rest.join("");
  const groupedInteger = integer === "" ? "" : groupFormatter.format(Number(integer));
  return cleaned.includes(".") ? `${groupedInteger || "0"}.${fraction}` : groupedInteger;
};

/**
 * 금액 · 비율 입력을 **받을지** 정하고 받으면 표시 형식으로 — 못 받으면 `null`(부르는 쪽이 이전 값을 두고 안내한다).
 *
 * `formatAmountInput` 은 숫자 · 점 말고는 **지우고 이어 붙인다** — 전각 마침표(1000．5) · 가운뎃점(1000·5) · 공백이 든 입력이 10,005 가 됐다(저축 리뷰 8차).
 * 여기서는 전각 숫자 · 기호를 반각으로 바꾼 뒤(NFKC) 허용 목록 — 숫자 · 쉼표 · 공백, `decimal` 이면 점 하나와 그 뒤 숫자 — 만 받는다.
 */
export const readAmountInput = (raw: string, options: { decimal?: boolean } = {}): string | null => {
  const text = raw.normalize("NFKC");
  const allowed = options.decimal ? /^[0-9,\s]*(\.[0-9]*)?$/ : /^[0-9,\s]*$/;
  return allowed.test(text) ? formatAmountInput(text) : null;
};

/** 입력 글자 → 양수. 비었거나 0 이하 · 숫자 아님이면 `null` */
export const parseAmountInput = (text: string): number | null => {
  const cleaned = text.replace(/,/g, "").trim();
  if (cleaned === "") return null;
  const value = Number(cleaned);
  return Number.isFinite(value) && value > 0 ? value : null;
};

/**
 * 날짜 입력(`YYYY-MM-DD`)을 보낼 값으로. **오늘이면 보내지 않는다** — 서버가 지금 시각을 쓴다(시각이 있어야 시간대 분석이 된다).
 * 지난 날은 그날 한국 0시로 보낸다 — 시각을 모르니 날짜만 뜻한다.
 */
export const toTransactionDate = (date: string, today: string): string | undefined => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date >= today) return undefined;
  const at = new Date(`${date}T00:00:00+09:00`);
  return Number.isNaN(at.getTime()) ? undefined : at.toISOString();
};

/** 브라우저의 오늘(한국 기준 날짜). **클라이언트에서만** 부른다 */
export const todayInKorea = (now: Date = new Date()): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(now);
