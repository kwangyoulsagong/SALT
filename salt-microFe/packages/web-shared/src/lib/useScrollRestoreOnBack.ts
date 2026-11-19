"use client";

import { useEffect } from "react";

/**
 * 뒤로 와서 목록 화면에 돌아오면 떠날 때의 스크롤 자리로(`FE-REQ-047` FR-11).
 *
 * Next 의 기본 복원은 문서 높이가 다 서기 전에 돈다 — 시세 표처럼 브라우저에서 늦게 채워지는 목록은 높이가 모자라 0 으로 잘렸다
 * (2026-11-19 실측: 421 → 0). 그래서 ① 떠나는 누름(링크 · 버튼 — 캡처 단계라 이동보다 먼저) · 페이지 숨김 때 주소별 자리를 세션 저장소에 적고
 * (스크롤 이벤트로 적으면 상세로 바뀌며 높이가 줄 때 난 중간 값 250 이 덮었다) ② 방금 뒤로(popstate) 온 경우에만
 * 높이가 그 자리를 담을 만큼 자랄 때까지(최대 `WAIT_MS`) 기다렸다가 옮긴다. 그사이 사람이 직접 스크롤하면 그만둔다.
 * 머리 메뉴 · 링크로 새로 들어오면 맨 위 그대로다. 렌더 중에는 아무것도 읽지 않는다(`ssr.md` — effect 안에서만)
 */
const KEY_PREFIX = "salt:scroll:";
/** popstate 뒤 이 안에 마운트되면 "뒤로 왔다"로 본다 */
const POP_WINDOW_MS = 1500;
const WAIT_MS = 4000;

let lastPopAt = -Infinity;
let popListening = false;

const keyOf = () => `${KEY_PREFIX}${window.location.pathname}${window.location.search}`;

const read = (key: string): number | null => {
  try {
    const raw = window.sessionStorage.getItem(key);
    const value = raw === null ? NaN : Number(raw);
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
};

const write = (key: string, value: number) => {
  try {
    window.sessionStorage.setItem(key, String(Math.round(value)));
  } catch {
    // 저장소를 못 쓰면(사생활 모드 등) 복원을 포기한다 — 화면은 그대로 동작한다
  }
};

export const useScrollRestoreOnBack = () => {
  useEffect(() => {
    // 목록이 사라진 동안(상세에 있는 동안) 일어나는 뒤로를 들어야 해서 한 번 걸고 떼지 않는다
    if (!popListening) {
      window.addEventListener("popstate", () => {
        lastPopAt = performance.now();
      });
      popListening = true;
    }

    const key = keyOf();
    let frame = 0;
    let cancelled = false;
    const stop = () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };

    const target = performance.now() - lastPopAt < POP_WINDOW_MS ? read(key) : null;
    if (target !== null) {
      const startedAt = performance.now();
      const step = () => {
        if (cancelled) return;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        if (max >= target || performance.now() - startedAt > WAIT_MS) {
          window.scrollTo(0, Math.min(target, Math.max(0, max)));
          return;
        }
        frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
      window.addEventListener("wheel", stop, { once: true, passive: true });
      window.addEventListener("touchstart", stop, { once: true, passive: true });
      window.addEventListener("keydown", stop, { once: true });
    }

    // 적는 때의 주소로 — 표 탭을 바꾸면 같은 화면에서 주소(`?tab=`)가 바뀐다. 누름 캡처 단계는 이동 전이라 아직 목록 주소다
    const save = () => write(keyOf(), window.scrollY);
    document.addEventListener("click", save, true);
    window.addEventListener("pagehide", save);

    return () => {
      stop();
      document.removeEventListener("click", save, true);
      window.removeEventListener("pagehide", save);
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("keydown", stop);
    };
  }, []);
};
