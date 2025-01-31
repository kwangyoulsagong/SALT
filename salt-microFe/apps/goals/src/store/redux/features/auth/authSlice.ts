import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { initialState } from "../../../../constants/slice/auth/initialState";
import { User } from "../../../../types/store/auth/types";
export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.error = null;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
  },
});
export const { setUser, logout, setLoading, setError } = authSlice.actions;
export default authSlice.reducer;
