import React, { Suspense, lazy, useEffect } from "react";
import HomeContainer from "@/components/Home/Container/HomeContainer";
import Header from "@/components/Home/Header/Header";
const Game = lazy(() => import("game/App"));
const Social = lazy(() => import("social/App"));
const Missions = lazy(() => import("missions/App"));
const Analysis = lazy(() => import("analysis/App"));
const Ranking = lazy(() => import("ranking/App"));
const Notification = lazy(() => import("notification/App"));

export default function Home() {
  return (
    <HomeContainer>
      <Header></Header>
    </HomeContainer>
  );
}
