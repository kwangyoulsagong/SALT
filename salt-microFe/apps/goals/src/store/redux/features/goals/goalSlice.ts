import { initialState } from "@/constants/slice/goal/initialState";
import { AddBankAccount, AddCategory } from "@/types/store/goal/types";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export const goalSlice = createSlice({
  name: "goal",
  initialState,
  reducers: {
    setCategory: (state, action: PayloadAction<AddCategory>) => {
      state.category = action.payload.category;
    },
    setBankAccount: (state, action: PayloadAction<AddBankAccount>) => {
      state.bankAccount = action.payload.bankAccount;
    },
  },
});
export const { setCategory, setBankAccount } = goalSlice.actions;
export default goalSlice.reducer;
