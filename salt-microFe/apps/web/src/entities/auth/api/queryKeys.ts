/** `auth` 슬라이스가 소유하는 쿼리 키. 슬라이스 밖에서 만들지 않는다. */
export const authQueryKeys = {
  /**
   * 온보딩 상태. **홈 카드와 온보딩 화면이 이 키 하나를 같이 본다** — 한 스텝을
   * 끝내면 두 곳이 같이 갱신된다. 동기화 코드를 따로 쓰지 않는 것이 목적이다.
   */
  onboardingStatus: ["OnboardingStatus"] as const,
  /** 초대 코드 확인. 코드마다 다른 키라 입력이 바뀌면 이전 결과를 쓰지 않는다. */
  inviteCheck: ["InviteCheck"] as const,
} as const;
