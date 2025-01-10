import { Suspense, lazy } from "react";
import { themeClass, container } from "@repo/ui/styles";
import { Button } from "@repo/ui/button";

const Goals = lazy(() => import("goals/App"));
const Game = lazy(() => import("game/App"));
const Social = lazy(() => import("social/App"));

export default function Page() {
  return (
    <div className={themeClass}>
      <h1> 여기는 쉘입니다 </h1>
      <div className={container}>
        {/* 레이아웃 스타일을 위한 컨테이너 */}
        <Button appName="shell" variant="primary">
          Primary Button
        </Button>
      </div>
      <Suspense fallback={<div>is loading...</div>}>
        <Goals />
        <Game />
        <Social />
      </Suspense>
    </div>
  );
}
