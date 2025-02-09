import { initialState } from "@/constants/slice/goal/initialState";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AddGoal } from "@/types/store/goal/types";
export const goalSlice = createSlice({
  name: "goal",
  initialState,
  reducers: {
    setGoal: (state, action: PayloadAction<AddGoal>) => {
      state.category = action.payload.category;
      state.bankAccount = action.payload.bankAccount;
    },
  },
});
export const { setGoal } = goalSlice.actions;
export default goalSlice.reducer;
