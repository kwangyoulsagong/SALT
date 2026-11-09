/**
 * 검색 모달의 순수 판정 (`FE-REQ-066` FR-4 · FR-5). 화면 · DOM 을 모른다 — 웹 모달과 앱(RN)이 같은 규칙을 쓴다.
 */

/** 고른 행을 옮기는 키 — 포커스는 검색칸에 그대로 있고 고른 행만 옮긴다(`aria-activedescendant`) */
export type SearchListKey = "ArrowDown" | "ArrowUp" | "Home" | "End";

const LIST_KEYS: ReadonlySet<string> = new Set<SearchListKey>(["ArrowDown", "ArrowUp", "Home", "End"]);

export const isSearchListKey = (key: string): key is SearchListKey => LIST_KEYS.has(key);

/**
 * 다음 고른 행. `-1` = 고른 행 없음.
 * - 행이 없으면 늘 `-1`
 * - 아래 · 위는 끝에서 반대쪽 끝으로 돈다(행이 몇 개 안 된다 — 끝에서 멈추면 위로 한참 눌러야 한다)
 * - 고른 행이 없을 때 아래 = 첫 행, 위 = 끝 행
 * - 목록이 줄어 지금 번호가 범위 밖이면 범위 안으로 당긴 뒤 움직인다
 */
export const moveActiveIndex = (current: number, count: number, key: SearchListKey): number => {
  if (count <= 0) return -1;
  const from = current >= count ? count - 1 : current;
  switch (key) {
    case "Home":
      return 0;
    case "End":
      return count - 1;
    case "ArrowDown":
      return from < 0 || from >= count - 1 ? 0 : from + 1;
    case "ArrowUp":
      return from <= 0 ? count - 1 : from - 1;
  }
};

/** 목록이 바뀐 뒤에도 고른 행이 범위 안인가 — 아니면 고른 행을 푼다 */
export const clampActiveIndex = (current: number, count: number): number =>
  current >= 0 && current < count ? current : -1;

/** Esc 두 단계(FR-5) — 글자가 있으면 지우고(모달은 그대로), 비어 있으면 닫는다 */
export const escapeStep = (input: string): "clear" | "close" => (input === "" ? "close" : "clear");

export interface HighlightPart {
  text: string;
  match: boolean;
}

/**
 * 이름에서 검색어와 맞는 첫 부분을 가른다(FR-4 — 일치 부분 하이라이트). 대소문자 무시 · 앞뒤 공백 무시.
 * 맞는 곳이 없거나 검색어가 비면 한 덩어리(`match: false`). 붙이면 늘 원래 글자와 같다
 */
export const splitHighlight = (text: string, query: string): HighlightPart[] => {
  const needle = query.trim().toLocaleLowerCase("ko-KR");
  if (needle === "" || text === "") return [{ text, match: false }];
  const at = text.toLocaleLowerCase("ko-KR").indexOf(needle);
  if (at < 0) return [{ text, match: false }];
  const parts: HighlightPart[] = [];
  if (at > 0) parts.push({ text: text.slice(0, at), match: false });
  parts.push({ text: text.slice(at, at + needle.length), match: true });
  if (at + needle.length < text.length) parts.push({ text: text.slice(at + needle.length), match: false });
  return parts;
};
