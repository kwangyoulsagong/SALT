"use client";

import { Button } from "@repo/ui/button";
import { FlexBox } from "@repo/ui/flexBox";
import { TextField } from "@repo/ui/textField";
import useDebounce from "@repo/ui/useDebounce";
import { useCallback, useState, type FormEvent } from "react";

import { useAcceptInvite, useInviteCheck } from "../api";
import { InviteRejectedError } from "../api/useAcceptInvite";
import {
  ACCEPT_INVITE_MESSAGES,
  INVITE_CHECK_MESSAGES,
  INVITE_REASON_MESSAGES,
} from "../model/messages";
import { MIN_CHECKABLE_CODE_LENGTH, normalizeInviteCode } from "../model/inviteCode";

/** 입력이 멈춘 뒤 확인을 부른다. 타이핑마다 부르면 요청 제한에 정상 입력이 걸린다. */
const CHECK_DEBOUNCE_MS = 400;

export interface InviteCodeFormProps {
  /** 수락에 성공하면 부른다. 다음 단계로 보내는 것은 위젯의 판단이다. */
  onAccepted?: () => void;
}

/**
 * 초대 코드 + 계정 정보 (`FE-REQ-010` FR-20·23·24·26).
 *
 * 클라이언트 잎이다 — 폼 상태와 두 호출(확인·수락)을 갖는다. 화면 껍데기
 * (`pages/onboarding`)는 서버 컴포넌트로 남는다.
 *
 * ## 코드를 정규화해서 **되쓴다**
 *
 * 붙여넣기에 섞인 공백·줄바꿈을 지우고 대문자로 올린 값을 입력창에 그대로 돌려놓는다.
 * 보이는 값과 보내는 값이 같아야 사용자가 "왜 틀렸지"를 추측하지 않는다.
 */
export const InviteCodeForm = ({ onAccepted }: InviteCodeFormProps) => {
  const [code, setCode] = useState("");
  const [checkedCode, setCheckedCode] = useState("");
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");

  const scheduleCheck = useDebounce(
    useCallback((next: string) => setCheckedCode(next), []),
    CHECK_DEBOUNCE_MS,
  );

  const check = useInviteCheck(checkedCode);
  const accept = useAcceptInvite();

  const onCodeChange = (raw: string) => {
    const next = normalizeInviteCode(raw);
    setCode(next);
    scheduleCheck(next);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    accept.mutate(
      { code, email, nickname, password },
      { onSuccess: () => onAccepted?.() },
    );
  };

  const codeMessage = codeMessageOf({
    code,
    checkedCode,
    isChecking: check.isFetching,
    result: check.data,
  });

  const submitError = submitErrorOf(accept.error);

  const canSubmit =
    code.length >= MIN_CHECKABLE_CODE_LENGTH &&
    email !== "" &&
    nickname !== "" &&
    password !== "" &&
    !accept.isPending;

  return (
    <form onSubmit={onSubmit}>
      <FlexBox direction="column" gap="md">
        <TextField
          value={code}
          onChange={onCodeChange}
          label={ACCEPT_INVITE_MESSAGES.codeLabel}
          placeholder={ACCEPT_INVITE_MESSAGES.codePlaceholder}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          error={codeMessage.error}
          helperText={codeMessage.helper}
        />
        <TextField
          value={email}
          onChange={setEmail}
          label={ACCEPT_INVITE_MESSAGES.emailLabel}
          placeholder={ACCEPT_INVITE_MESSAGES.emailPlaceholder}
          type="email"
          autoComplete="email"
        />
        <TextField
          value={nickname}
          onChange={setNickname}
          label={ACCEPT_INVITE_MESSAGES.nicknameLabel}
          placeholder={ACCEPT_INVITE_MESSAGES.nicknamePlaceholder}
          autoComplete="nickname"
        />
        <TextField
          value={password}
          onChange={setPassword}
          label={ACCEPT_INVITE_MESSAGES.passwordLabel}
          placeholder={ACCEPT_INVITE_MESSAGES.passwordPlaceholder}
          type="password"
          autoComplete="new-password"
          error={submitError}
        />
        <Button type="submit" fullWidth disabled={!canSubmit} loading={accept.isPending}>
          {accept.isPending
            ? ACCEPT_INVITE_MESSAGES.submitting
            : ACCEPT_INVITE_MESSAGES.submit}
        </Button>
      </FlexBox>
    </form>
  );
};

/**
 * 코드 입력창 아래 문구.
 *
 * **확인 결과가 지금 입력값의 것일 때만 쓴다.** 디바운스 때문에 사용자가 이어서 타이핑한
 * 뒤에도 이전 코드의 결과가 잠시 남아 있고, 그것을 그대로 보여주면 "고쳤는데 계속
 * 틀렸다고 나온다"가 된다.
 */
const codeMessageOf = ({
  code,
  checkedCode,
  isChecking,
  result,
}: {
  code: string;
  checkedCode: string;
  isChecking: boolean;
  result: { valid: boolean; reasonCode?: keyof typeof INVITE_CHECK_MESSAGES } | undefined;
}): { error?: string; helper?: string } => {
  if (code.length < MIN_CHECKABLE_CODE_LENGTH) return {};
  if (code !== checkedCode || isChecking) {
    return { helper: ACCEPT_INVITE_MESSAGES.checking };
  }
  if (!result) return {};
  if (result.valid) return { helper: ACCEPT_INVITE_MESSAGES.codeValid };

  return {
    error: result.reasonCode
      ? INVITE_CHECK_MESSAGES[result.reasonCode]
      : ACCEPT_INVITE_MESSAGES.unknownError,
  };
};

/** 수락 실패 문구. `reasonCode` 를 문장으로 바꾸는 유일한 자리다. */
const submitErrorOf = (error: Error | null): string | undefined => {
  if (!error) return undefined;
  if (error instanceof InviteRejectedError && error.reasonCode) {
    return INVITE_REASON_MESSAGES[error.reasonCode];
  }
  return ACCEPT_INVITE_MESSAGES.unknownError;
};

export default InviteCodeForm;
