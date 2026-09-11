import { configureStore } from "@reduxjs/toolkit";

import { authReducer } from "@/entities/auth";
import { goalReducer } from "@/entities/goal";

/**
 * zone 하나에 store 하나 (FE-REQ-007).
 *
 * **조립은 `app` 레이어가 한다.** 각 슬라이스는 자기 reducer 만 export 하고
 * `RootState` 를 보지 않는다 — 그래야 슬라이스가 위 레이어에 의존하지 않는다.
 * 슬라이스 셀렉터는 자기 가지만 타이핑한다 (`entities/auth/model/selectors.ts`).
 */
export const store = configureStore({
  reducer: {
    auth: authReducer,
    goal: goalReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
