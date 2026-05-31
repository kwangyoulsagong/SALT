import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import type { Dispatch, UnknownAction } from "@reduxjs/toolkit";

type RootState = Record<string, never>;
type AppDispatch = Dispatch<UnknownAction>;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
