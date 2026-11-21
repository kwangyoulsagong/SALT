"use client";

import { useEffect, useState } from "react";

import { pushAvailability, pushStepsFor, pushToggleOn, type PushAvailability } from "@repo/core/mobile";
import { Toggle } from "@repo/ui/toggle";

import { MOBILE_PUSH_MESSAGES as M } from "./messages";
import { card, body, title } from "./MobileInstallCard.css";
import * as s from "./MobilePushCard.css";
import {
  currentSubscription,
  pushEnvironment,
  readPushConfig,
  readPushPrefs,
  savePushPref,
  subscribeDevice,
  unsubscribeDevice,
  type PushDomainPref,
} from "./pushClient";

interface PushState {
  availability: PushAvailability;
  publicKey: string | null;
  prefs: PushDomainPref[];
  subscribed: boolean;
}

/**
 * 휴대폰 알림 칸(`FE-REQ-078` FR-1 · FR-2) — 홈 맨 아래 설정 자리. 도메인 목록 · 순서 · 값은 서버 것(프론트 기본값 0).
 *
 * - 설치한 앱 안에서만 켤 수 있다 — 아니면 토글 없이 이유 한 줄(iOS 는 설치 전엔 푸시 API 가 없다)
 * - 켜기: 이 기기 구독(누름 안에서 권한 요청 — 거절이면 설정을 켜지 않는다) → 도메인 켬. 끄기: 도메인 끔 → 마지막이면 이 기기 구독도 뺌
 * - 서버 푸시가 꺼져 있거나 로그인 전이면 칸째 없다. 값이 오기 전엔 그리지 않는다(꺼진 채 그렸다 뒤집히면 잘못 읽힌다)
 * - 낙관적 갱신 0 — 권한 창 · 구독이 끼어 실패가 흔하다. 누른 동안 그 줄만 `aria-busy`
 */
export const MobilePushCard = () => {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const config = await readPushConfig(controller.signal);
        const availability = pushAvailability(pushEnvironment(config.enabled));
        if (availability === "off") return;
        const [prefs, subscription] = await Promise.all([readPushPrefs(controller.signal), currentSubscription().catch(() => null)]);
        setState({ availability, publicKey: config.publicKey, prefs, subscribed: subscription !== null });
      } catch {
        // 로그인 전 · 받기 실패 — 칸을 그리지 않는다(홈 본문이 이미 그 사정을 말한다)
      }
    })();
    return () => controller.abort();
  }, []);

  if (!state) return null;

  const toggle = async (domain: string, turnOn: boolean) => {
    if (!navigator.onLine) {
      setNotice(M.offline);
      return;
    }
    const pref = state.prefs.find((row) => row.domain === domain);
    const steps = pushStepsFor({
      turnOn,
      domainEnabled: pref?.enabled === true,
      deviceSubscribed: state.subscribed,
      otherEnabled: state.prefs.filter((row) => row.domain !== domain && row.enabled).length,
    });
    setBusy(domain);
    setNotice(null);
    let { prefs, subscribed } = state;
    try {
      for (const step of steps) {
        if (step === "subscribe") {
          if (!state.publicKey || !(await subscribeDevice(state.publicKey))) {
            setNotice(Notification.permission === "denied" ? M.denied : M.refused);
            setState({ ...state, availability: Notification.permission === "denied" ? "denied" : state.availability });
            return;
          }
          subscribed = true;
        }
        if (step === "enable" || step === "disable") prefs = await savePushPref(domain, step === "enable");
        if (step === "unsubscribe") {
          await unsubscribeDevice();
          subscribed = false;
        }
      }
    } catch {
      setNotice(M.failed);
    } finally {
      setState((prev) => (prev ? { ...prev, prefs, subscribed } : prev));
      setBusy(null);
    }
  };

  const reason = state.availability === "install" ? M.install : state.availability === "unsupported" ? M.unsupported : state.availability === "denied" ? M.denied : null;

  return (
    <section className={card} aria-labelledby="m-push-title">
      <h2 id="m-push-title" className={title}>
        {M.title}
      </h2>
      <p className={body}>{M.body}</p>
      {reason ? (
        <p className={s.reason}>{reason}</p>
      ) : (
        <ul className={s.rows}>
          {state.prefs.map(({ domain, enabled }) => {
            const copy = M.domains[domain];
            if (!copy) return null;
            return (
              <li key={domain} className={s.row}>
                <span className={s.text}>
                  <span className={s.label}>{copy.label}</span>
                  <span className={s.hint}>{copy.hint}</span>
                </span>
                <Toggle
                  aria-label={`${copy.label} 알림`}
                  className={s.toggleHit}
                  checked={pushToggleOn(enabled, state.subscribed)}
                  aria-busy={busy === domain}
                  // 저장 중 다른 줄은 기다린다 — 구독 · 권한 창이 한 번에 하나
                  onChange={(next) => {
                    if (busy === null) void toggle(domain, next);
                  }}
                />
              </li>
            );
          })}
        </ul>
      )}
      {notice ? (
        <p className={s.reason} role="status">
          {notice}
        </p>
      ) : null}
    </section>
  );
};
