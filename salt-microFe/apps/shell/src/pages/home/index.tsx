import React, { Suspense, lazy, useEffect } from "react";
import HomeContainer from "@/components/Home/Container/HomeContainer";
import Header from "@/components/Home/Header/Header";
import Tip from "@/components/TipsApp/TipsApp";
const Goals = lazy(() => import("goals/GoalsApp"));
export default function HomePage() {
  return (
    <HomeContainer>
      <Header />
      <Suspense fallback={<div>로딩</div>}>
        <Goals />
        <Tip />
      </Suspense>
    </HomeContainer>
  );
}
