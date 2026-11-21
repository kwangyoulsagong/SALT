"use client";

import { useEffect, useState } from "react";

import { useLazyComponent } from "../../lib";

import {
  consumeInstallPrompt,
  installPromptEvent,
  isAppleTouch,
  isStandalone,
  readInstallHint,
  subscribeInstallPrompt,
  writeInstallHint,
} from "./installPrompt";
import type { MobileInstallCardBodyProps } from "./MobileInstallCardBody";

type Mode = "hidden" | MobileInstallCardBodyProps["mode"];

const loadBody = () => import("./MobileInstallCardBody").then((m) => m.MobileInstallCardBody);

/**
 * 설치 안내 카드(`FE-REQ-073` FR-4) — 홈 맨 아래 설정 자리, 띄우는 창이 아니라 카드 한 장.
 *
 * - **첫 진입엔 0** — 그때는 "봤음"만 적는다(`screen-mobile.md` §5 첫 진입에 시트 · 안내를 띄우지 않는다). 다음 진입부터
 * - 닫으면 다시 안 뜸 · 설치한 앱(standalone)에선 0 · 설치하면 사라짐
 * - Android(Chromium)는 `beforeinstallprompt` 를 받았을 때만 — 버튼이 브라우저 설치 창을 연다. iOS 는 공유 → 홈 화면에 추가 그림 한 장(시트)
 * - 둘 다 아니면(사건이 안 오는 브라우저) 0 — 할 수 없는 일을 안내하지 않는다
 * - 판정만 여기, 몸통(시트 · 모션 그림)은 보일 때 받는다 — 홈 첫 로드 147 → 아래 수치(`checklists/FE-REQ-073.md`). 청크를 못 받으면 0(안내는 덤)
 * 서버 · 첫 렌더는 0(브라우저 판정은 효과 안) — 수화 일치
 */
export const MobileInstallCard = () => {
  const [mode, setMode] = useState<Mode>("hidden");
  const { Component: Body, ensure } = useLazyComponent(loadBody);

  useEffect(() => {
    if (isStandalone()) return;
    const hint = readInstallHint();
    if (hint === null) {
      writeInstallHint("seen");
      return;
    }
    if (hint === "dismissed") return;
    if (isAppleTouch()) {
      setMode("apple");
      return;
    }
    const sync = () => setMode(installPromptEvent() ? "prompt" : "hidden");
    sync();
    return subscribeInstallPrompt(sync);
  }, []);

  useEffect(() => {
    if (mode !== "hidden") void ensure();
  }, [mode, ensure]);

  const dismiss = () => {
    writeInstallHint("dismissed");
    setMode("hidden");
  };

  const install = async () => {
    if (await consumeInstallPrompt()) dismiss();
  };

  if (mode === "hidden" || !Body) return null;
  return <Body mode={mode} onDismiss={dismiss} onInstall={() => void install()} />;
};
