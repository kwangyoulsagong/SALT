"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { Button } from "@repo/ui/button";
import { StatusLine } from "@repo/ui/statusLine";
import { TextField } from "@repo/ui/textField";

import { clearSession, useHasSession, type ApiError } from "@repo/web-shared/api";
import { ROUTES } from "@repo/web-shared/config";
import { panel, panelHead, panelTitle } from "@repo/web-shared/ui/surface.css";

import { useDeleteAccount, useEraseScope } from "../api";
import { DELETE_ACCOUNT_MESSAGES as MSG } from "../model";
import { description, field, form, scopeList, scopePlaceholder, scopeTitle } from "./DeleteAccountPanel.css";

const errorText = (error: ApiError): string => {
  if (error.status === 429) return MSG.errors.tooMany;
  const known = MSG.errors[error.code as keyof typeof MSG.errors];
  return typeof known === "string" ? known : MSG.errors.other;
};

/**
 * 계정 지우기(`FE-REQ-055` FR-5 · FEATURE-015 FR-3). 비밀번호를 다시 받는다 — 접근 토큰만으로는 서버가 지우지 않는다(`SRV-REQ-048` FR-4).
 * 지운 뒤에는 이 기기 세션 쿠키도 지우고 결과 한 줄만 남긴다(다른 화면으로 바로 넘기면 무엇이 지워졌는지 못 본다). 로그인 전이면 패널째 없다.
 */
export const DeleteAccountPanel = () => {
  const signedIn = useHasSession();
  const queryClient = useQueryClient();
  const deletion = useDeleteAccount();
  const scope = useEraseScope();
  const [password, setPassword] = useState("");
  const [deletedTotal, setDeletedTotal] = useState<number | null>(null);

  if (signedIn === false && deletedTotal === null) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    // 범위를 보이지 않고는 지우지 않는다(FEATURE-015 FR-3 "범위 표시")
    if (password.length === 0 || deletion.isPending || !scope.data) return;
    deletion.mutate(password, {
      onSuccess: async ({ total }) => {
        setPassword("");
        // 쿠키는 Route Handler 가 지운다 — 다 지운 뒤 결과를 보인다. 캐시도 비워 지운 사람 기록이 화면에 남지 않게
        await clearSession();
        queryClient.clear();
        setDeletedTotal(total);
      },
    });
  };

  return (
    <section className={panel}>
      <div className={panelHead}>
        <h2 className={panelTitle}>{MSG.heading}</h2>
      </div>
      {deletedTotal !== null ? (
        <>
          <StatusLine kind="success" live>
            {MSG.done(deletedTotal)}
          </StatusLine>
          <div>
            <Button variant="primary" onClick={() => window.location.assign(ROUTES.login)}>
              {MSG.goHome}
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className={description}>{MSG.description}</p>
          <div>
            <p className={scopeTitle}>{MSG.scopeLabel}</p>
            {scope.isError ? (
              <StatusLine kind="error">{MSG.scopeUnavailable}</StatusLine>
            ) : !scope.data ? (
              <div className={scopePlaceholder} aria-busy="true" />
            ) : (
              <ul className={scopeList}>
                {scope.data.services.map((service) => {
                  const line = MSG.scope[service];
                  return line ? <li key={service}>{line}</li> : null;
                })}
              </ul>
            )}
          </div>
          <form className={form} onSubmit={submit}>
            <div className={field}>
              <TextField
                variant="filled"
                type="password"
                autoComplete="current-password"
                aria-label={MSG.passwordLabel}
                placeholder={MSG.passwordPlaceholder}
                value={password}
                onChange={setPassword}
              />
            </div>
            {/* 공용 변형 중 흰 패널 위 AA 를 넘는 것은 `primary` 뿐(2026-11-12 axe — `danger` · `outline` 3:1 · `weak` · `secondary` 3.9:1). 공용 색은 기존 결정이라 고치지 않는다. 지운다는 뜻은 제목 · 설명 · 범위 줄이 전한다 */}
            <Button type="submit" variant="primary" disabled={password.length === 0 || signedIn !== true || !scope.data} loading={deletion.isPending}>
              {deletion.isPending ? MSG.pending : MSG.action}
            </Button>
          </form>
          {deletion.isError && (
            <StatusLine kind="error" live>
              {errorText(deletion.error)}
            </StatusLine>
          )}
        </>
      )}
    </section>
  );
};
