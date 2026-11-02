"use client";

import { useDispatch } from "react-redux";

/**
 * 디스패치 훅.
 *
 * **`RootState` 타입은 여기 없다.** store 조립은 `app` 레이어가 하므로 `shared` 가
 * 그 타입을 알면 위로 향하는 의존이 된다. 각 슬라이스는 자기 가지만 타이핑한
 * 셀렉터를 `model/selectors.ts` 에 둔다 (`entities/auth/model/selectors.ts` 참고).
 */
export const useAppDispatch = () => useDispatch();
