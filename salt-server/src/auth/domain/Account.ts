/**
 * 계정 — 이 컨텍스트가 만들고 인증하는 대상.
 *
 * Aggregate 로 만들지 않았다. `auth` 가 계정에 대해 지키는 불변식은 **이메일 유일성**
 * 하나이고 그건 DB 제약이다. 프로필 수정·포인트는 `auth` 의 일이 아니다
 * (`ddd-domain.md` — "Aggregate 는 불변식이 있을 때 만든다").
 */

/** 계정 생성 입력. 비밀번호는 **해시된 뒤에만** 도메인을 지난다. */
export interface NewAccount {
  email: string;
  nickname: string;
  passwordHash: string;
}

/** 응답에 실리는 계정. 해시를 담지 않는다. */
export interface AccountView {
  id: string;
  email: string;
  nickname: string;
  profileImageUrl: string | null;
  totalPoints: number;
  userLevel: number;
  createdAt: Date;
  lastLoginAt?: Date | null;
}

/** 로그인 검증에 필요한 최소 정보. 목록·응답에 쓰지 않는다. */
export interface AccountCredential {
  id: string;
  email: string;
  passwordHash: string;
}

/** 발급된 세션. 만료 정책은 `infrastructure` 의 토큰 발급자가 갖는다. */
export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}
