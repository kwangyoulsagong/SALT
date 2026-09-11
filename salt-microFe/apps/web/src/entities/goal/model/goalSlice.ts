import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { initialState } from "./initialState";
import { AddBankAccount, AddCategory } from "./types";

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
