import React, { Suspense, lazy, useEffect } from "react";
import HomeContainer from "@/components/Home/Container/HomeContainer";
import Header from "@/components/Home/Header/Header";
import Tip from "@/components/TipsApp/TipsApp";
const Goals = lazy(() => import("goals/GoalsApp"));
const Game = lazy(() => import("game/App"));
const Social = lazy(() => import("social/App"));
const Missions = lazy(() => import("missions/MissionsApp"));
const Analysis = lazy(() => import("analysis/AnalysisApp"));
const Ranking = lazy(() => import("ranking/RankingApp"));
const Notification = lazy(() => import("notification/App"));

export default function Home() {
  return (
    <HomeContainer>
      <Header />
      <Suspense fallback={<div>로딩</div>}>
        <Goals />
        <Missions />
        <Analysis />
        <Ranking />
        <Tip />
      </Suspense>
    </HomeContainer>
  );
}
