import React, { Suspense, lazy, useEffect } from "react";
import { themeClass, container } from "@repo/ui/styles";
import { Button } from "@repo/ui/button";
import { useAppSelector } from "@/hooks/redux/hooks";
const Game = lazy(() => import("game/App"));
const Social = lazy(() => import("social/App"));
const Missions = lazy(() => import("missions/App"));
const Analysis = lazy(() => import("analysis/App"));
const Ranking = lazy(() => import("ranking/App"));
const Notification = lazy(() => import("notification/App"));

export default function Home() {
  const profile = useAppSelector((state) => state.auth);
  return (
    <div className={`${themeClass} ${container}`}>
      <main>
        <h1>쉘 (Shell) 애플리케이션</h1>
        <h1 style={{ color: "#ffffff" }}>{profile.user?.nickname}</h1>

        <Suspense fallback={<div>로딩 중...</div>}>
          <Button variant="primary" eventType="route" eventValue="/goals">
            목표
          </Button>

          <div>
            <Game />
            <Social />
            <Missions />
            <Analysis />
            <Ranking />
            <Notification />
          </div>
        </Suspense>
      </main>

      <footer>© 2024 내 애플리케이션</footer>
    </div>
  );
}
