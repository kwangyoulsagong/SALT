/**
 * 코드 정규화 (`FE-REQ-010` FR-26).
 *
 * **서버와 같은 규칙이다**(`auth/domain/InviteCode.ts` `normalizeInviteCode`). 붙여넣기에
 * 섞이는 공백·줄바꿈을 지우고 대문자로 올린다.
 *
 * 화면이 이것을 하는 이유는 **보여주기 위해서**다 — 사용자가 친 그대로 남으면 소문자
 * 코드가 "틀린 코드"처럼 보인다. 최종 판정은 서버가 자기 정규화로 한 번 더 한다.
 * 규칙이 두 곳에 있지만 **한쪽이 틀려도 결과가 달라지지 않는다** — 화면이 안 해도
 * 서버가 하고, 서버 규칙이 넓어져도 화면은 좁은 쪽이라 통과한다.
 */
export const normalizeInviteCode = (raw: string): string =>
  raw.replace(/\s+/g, "").toUpperCase();

/** 확인 요청을 보내기 전 최소 길이. 한두 글자마다 부르면 요청 제한에 걸린다. */
export const MIN_CHECKABLE_CODE_LENGTH = 6;
