import React, { Suspense, lazy, useEffect } from "react";
import { themeClass, container } from "@repo/ui/styles";
import { Button } from "@repo/ui/button";
import { useAppSelector } from "@/hooks/redux/hooks";
import HomeContainer from "@/components/Home/Container/HomeContainer";
const Game = lazy(() => import("game/App"));
const Social = lazy(() => import("social/App"));
const Missions = lazy(() => import("missions/App"));
const Analysis = lazy(() => import("analysis/App"));
const Ranking = lazy(() => import("ranking/App"));
const Notification = lazy(() => import("notification/App"));

export default function Home() {
  const profile = useAppSelector((state) => state.auth);
  return (
    <HomeContainer>
      <Header></Header>
      {/* <Button variant="primary" eventType="route" eventValue="/goals">
        목표
      </Button> */}
    </HomeContainer>
  );
}
