import React, { Suspense, lazy, useState, useEffect } from "react";
import { themeClass, container } from "@repo/ui/styles";
import { Button } from "@repo/ui/button";
const Game = lazy(() => import("game/App"));
const Social = lazy(() => import("social/App"));

export default function Home({ children }: { children?: React.ReactNode }) {
  return (
    <div className={`${themeClass} ${container}`}>
      <main>
        <h1>쉘 (Shell) 애플리케이션</h1>

        <Suspense fallback={<div>로딩 중...</div>}>
          <Button variant="primary" routes="/goals">
            Primary Button
          </Button>

          {children}

          <div>
            <Game />
            <Social />
          </div>
        </Suspense>
      </main>

      <footer>© 2024 내 애플리케이션</footer>
    </div>
  );
}
