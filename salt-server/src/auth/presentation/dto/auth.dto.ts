import { z } from "zod";

/**
 * `auth` 의 입력 검증.
 *
 * **`registerSchema` 가 없다** (`SRV-REQ-008` FR-5). 이관 전 `modules/auth/auth.dto.ts` 의
 * 그 스키마는 옮기지 않았다 — 옮길 유스케이스가 없다.
 */
export const acceptInviteSchema = z.object({
  code: z.string().min(1, "초대 코드를 입력해 주세요"),
  email: z.string().email("Invalid email format"),
  nickname: z.string().min(2, "Nickname must be at least 2 characters").max(50),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const inviteCheckSchema = z.object({
  code: z.string().min(1, "초대 코드를 입력해 주세요"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export type AcceptInviteDto = z.infer<typeof acceptInviteSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
