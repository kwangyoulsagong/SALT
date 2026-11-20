"use client";

/** 휴대폰 코치 리포트 본문(`FE-REQ-072` FR-3) */

// 클라이언트 잎: `ssr:false` 는 서버 컴포넌트에서 쓸 수 없다(데스크톱 `CoachReportBody` 와 같은 이유)
import dynamic from "next/dynamic";

import { SignInRequired } from "@repo/web-shared/ui";

import { COACH_REPORT_MOBILE as M } from "../model/messages";

/** 리포트 본문 — 데스크톱 `/coach/report` 와 같은 위젯 · 같은 지연 청크. 칸은 위젯 안에서 한 열로 접힌다(패널 격자는 폭으로 고른다) */
const CoachReport = dynamic(() => import("@/widgets/coach-console").then((mod) => mod.CoachReport), {
  ssr: false,
  loading: () => null,
});

/** 로그인 없이 오면 본문 전체가 유리막(데스크톱 리포트와 같은 `SignInRequired`) */
export const CoachReportMobile = () => (
  <SignInRequired what={M.title} minHeight={480}>
    <CoachReport />
  </SignInRequired>
);
