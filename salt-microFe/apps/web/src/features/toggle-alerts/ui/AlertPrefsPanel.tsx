"use client";

import { StatusLine } from "@repo/ui/statusLine";
import { Toggle } from "@repo/ui/toggle";

import {
  panel,
  panelDescription,
  panelHead,
  panelTitle,
} from "@repo/web-shared/ui/surface.css";

import { useNotificationPrefs } from "@/entities/notification";

import { useToggleAlert } from "../api";
import { TOGGLE_ALERTS_MESSAGES as MSG } from "../model";
import {
  hint,
  label,
  list,
  placeholder,
  row,
  text,
} from "./AlertPrefsPanel.css";

/**
 * 도메인별 알림 켬/끔(`FE-REQ-055` FR-6 · `BFF-REQ-046` FR-8). 도메인 목록 · 순서 · 값은 서버 것 — 프론트에 "기본값" 상수 0.
 * 값이 오기 전에는 토글을 그리지 않는다(꺼진 채 그렸다가 켜짐으로 뒤집히면 잘못 읽힌다) — 자리 칸은 줄 셋 높이. 로그인 전이면 패널째 없다.
 */
export const AlertPrefsPanel = () => {
  const prefs = useNotificationPrefs();
  const toggle = useToggleAlert();

  if (prefs.isSignedOut) return null;

  return (
    <section className={panel}>
      <div className={panelHead}>
        <h2 className={panelTitle}>{MSG.heading}</h2>
      </div>
      <p className={panelDescription}>{MSG.description}</p>
      {prefs.isError ? (
        <StatusLine kind="error">{MSG.unavailable}</StatusLine>
      ) : !prefs.data ? (
        <div className={placeholder} aria-busy="true" />
      ) : (
        <ul className={list}>
          {prefs.data.domains.map(({ domain, enabled }) => {
            const copy = MSG.domains[domain];
            if (!copy) return null;
            return (
              <li key={domain} className={row}>
                <div className={text}>
                  <span className={label}>{copy.label}</span>
                  <p className={hint}>{copy.hint}</p>
                </div>
                {/* 이름 · 설명은 왼쪽, 토글은 오른쪽 끝 — 이름 길이가 달라도 토글 열이 맞는다(2026-11-06 실화면) */}
                <Toggle
                  aria-label={copy.label}
                  checked={enabled}
                  // 저장 중에는 입력만 무시한다 — `disabled` 로 바꾸면 키보드 포커스가 빠진다
                  onChange={(next) => {
                    if (!toggle.isPending)
                      toggle.mutate({ domain, enabled: next });
                  }}
                  aria-busy={toggle.isPending}
                />
              </li>
            );
          })}
        </ul>
      )}
      {toggle.isError && <StatusLine kind="error">{MSG.failed}</StatusLine>}
    </section>
  );
};
