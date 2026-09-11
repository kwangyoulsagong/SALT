/**
 * 레이어를 가로지르는 사용자 노출 문구.
 *
 * ## 여기 있는 것과 없는 것
 *
 * 여기 있는 것은 **도메인과 무관한 문구**다 — HTTP 에러, 공통 실패/로딩 상태.
 * 슬라이스 문구(목표·시세·포트폴리오)는 그 슬라이스의 `model/messages.ts` 에 있다.
 *
 * 도메인 문구를 여기로 올리면 `shared` 가 도메인을 알게 되고(`fsd-shared.md` — 도메인
 * 무관한 코드만), 슬라이스를 지울 때 문구만 남는다. **문구 검수(`i18n-policy.md`)는
 * "한 파일"이 아니라 "컴포넌트 밖"이면 가능하다.**
 */
export {
  HTTP_ERROR_MESSAGE,
  TOAST_MESSAGES,
  ERROR_MESSAGE,
} from "@repo/core/http";

/** 블록 경계(`shared/ui`)가 쓰는 공통 상태 문구. */
export const BOUNDARY_MESSAGES = {
  loading: (name: string) => `${name} 불러오는 중`,
  failedTitle: (name: string) => `${name}을 불러오지 못했습니다.`,
  failedDescription: "잠시 후 다시 시도해주세요.",
} as const;

/** zone 을 넘는 이동은 hard navigation 이라 체감 지연이 있다. */
export const NAVIGATION_MESSAGES = {
  crossZonePending: "이동 중…",
} as const;
