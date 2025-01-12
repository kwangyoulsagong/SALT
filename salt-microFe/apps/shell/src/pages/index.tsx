import React, { Suspense, lazy, useEffect } from "react";
import { themeClass, container } from "@repo/ui/styles";
import { Button } from "@repo/ui/button";
import { useAppDispatch, useAppSelector } from "@/hooks/redux/hooks";
import { setUser } from "@/store/redux/features/auth/authSlice";
const Game = lazy(() => import("game/App"));
const Social = lazy(() => import("social/App"));

export default function Home({ children }: { children?: React.ReactNode }) {
  const dispatch = useAppDispatch();
  useEffect(() => {
    const userData = {
      id: 1,
      nickname: "광열",
      email: "user@example.com",
    }; // 예시 데이터

    dispatch(setUser(userData)); // setUser 액션 호출
  }, [dispatch]);
  const profile = useAppSelector((state) => state.auth);
  return (
    <div className={`${themeClass} ${container}`}>
      <main>
        <h1>쉘 (Shell) 애플리케이션</h1>
        <h1 style={{ color: "#ffffff" }}>{profile.user?.nickname}</h1>

        <Suspense fallback={<div>로딩 중...</div>}>
          <Button variant="primary" eventType="route" eventValue="/goals">
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
