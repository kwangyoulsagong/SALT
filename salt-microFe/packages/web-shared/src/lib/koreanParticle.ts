/**
 * 한국어 조사 선택. **표시 규칙이므로 `shared/lib` 에 있다** (`fsd-shared.md` — 포맷터와 같은 자리).
 *
 * 문구를 `${name}을` 처럼 붙여 쓰면 앞말 받침에 따라 틀린다 — "목표을"·"투자을" 이 실제로
 * 화면에 나갔다. 조사는 문구가 아니라 **앞말의 함수**라서 상수로 둘 수 없다.
 */

const HANGUL_FIRST = 0xac00;
const HANGUL_LAST = 0xd7a3;
const JONGSEONG_COUNT = 28;

/**
 * 마지막 글자에 받침이 있는가.
 *
 * 한글 음절이 아니면(영문·숫자·기호) `false` 로 본다. 우리 문구의 라틴 꼬리는
 * "세금 D-Day" 처럼 받침 없이 읽히는 쪽이 맞다.
 */
const hasFinalConsonant = (word: string): boolean => {
  const lastChar = word.trimEnd().at(-1);
  if (!lastChar) return false;

  const code = lastChar.charCodeAt(0);
  if (code < HANGUL_FIRST || code > HANGUL_LAST) return false;

  return (code - HANGUL_FIRST) % JONGSEONG_COUNT !== 0;
};

/** 목적격 조사를 붙인다. `"목표" → "목표를"` · `"총자산" → "총자산을"` */
export const withObjectParticle = (word: string): string =>
  `${word}${hasFinalConsonant(word) ? "을" : "를"}`;

/** 주격 조사를 붙인다. `"목표" → "목표가"` · `"총자산" → "총자산이"` */
export const withSubjectParticle = (word: string): string =>
  `${word}${hasFinalConsonant(word) ? "이" : "가"}`;
