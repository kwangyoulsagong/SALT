import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./features/auth/authSlice";
import goalReducer from "./features/goals/goalSlice";

/**
 * zone 하나에 store 하나 (FE-REQ-007).
 *
 * 이전에는 앱(remote)마다 store가 따로 있었다. 세 앱이 `apps/web` 하나가 되면서
 * reducer를 여기서 합친다.
 */
export const store = configureStore({
  reducer: {
    auth: authReducer,
    goal: goalReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
