import { josa as hangulJosa } from "es-hangul";

/**
 * 한국어 조사 붙이기 — F008 `FEATURE-008` FR-48 · `SRV-REQ-037` FR-14.
 *
 * `es-hangul` `josa` 는 **마지막 글자가 한글일 때만** 받침을 본다. 영문 · 숫자는 받침 없음으로 읽어
 * `SOL는` · `3는` 이 된다(2026-11-02 실측 — `josa("BTC", "은/는")` → `BTC는`). 이 제품의 문장 주어는 대개
 * 티커(`SOL` · `ETH`)나 숫자라, 끝 글자를 **읽는 소리**로 바꾼 뒤 조사를 고른다.
 *
 * - 영문은 알파벳을 한 글자씩 읽는다(`SOL` → 에스오**엘**). 단어로 읽히는 티커(`SOL` 을 "솔")는 따로 표가 필요하고
 *   그 표가 틀리면 조사가 틀린다 — 글자 읽기는 결정적이고 틀린 표가 없다
 * - 숫자는 마지막 자리 하나로 읽는다(`10` → 영 · `3` → 삼). `10` 을 "십"으로 읽어도 받침(ㅂ · ㅇ) 유무가 같다
 * - 끝에 `%` 가 있으면 "퍼센트"(받침 없음)
 * - 그 밖의 기호(괄호 · 따옴표)는 건너뛰고 그 앞 글자를 본다
 *
 * 결정적이다 — 같은 입력이면 같은 출력(스냅샷 테스트 가능). 변형 문장 선택이 생기면 같은 이유로 해시로 고른다(FR-48).
 */

type JosaOption = Parameters<typeof hangulJosa>[1];

/** 알파벳 이름의 끝 글자 — 받침이 무엇인지만 중요하다. L · M · N · R 만 받침이 있다(엘 · 엠 · 엔 · 알) */
const LATIN_READING: Record<string, string> = {
  A: "에이", B: "비", C: "씨", D: "디", E: "이", F: "프", G: "지", H: "치", I: "이", J: "제이",
  K: "케이", L: "엘", M: "엠", N: "엔", O: "오", P: "피", Q: "큐", R: "알", S: "스", T: "티",
  U: "유", V: "브이", W: "유", X: "스", Y: "와이", Z: "지",
};

const DIGIT_READING = ["영", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];

const HANGUL = /[가-힣]/;
const SKIPPED = /[\s"'’”)\]}·.,]/;

/** 조사를 고를 때 볼 끝 글자(읽는 소리). 읽을 글자가 없으면 `null` */
export const readingTail = (word: string): string | null => {
  for (let i = word.length - 1; i >= 0; i -= 1) {
    const ch = word[i]!;
    if (SKIPPED.test(ch)) continue;
    if (HANGUL.test(ch)) return ch;
    if (ch === "%") return "트";
    if (/[0-9]/.test(ch)) return DIGIT_READING[Number(ch)]!;
    const latin = LATIN_READING[ch.toUpperCase()];
    if (latin) return latin.at(-1)!;
    return null;
  }
  return null;
};

/** `word` 뒤에 맞는 조사를 붙인다. 읽을 수 없는 끝 글자면 `es-hangul` 기본값(받침 없음)을 따른다 */
export const withJosa = (word: string, option: JosaOption): string => {
  const tail = readingTail(word);
  if (tail === null) return hangulJosa(word, option);
  return word + hangulJosa.pick(tail, option);
};
