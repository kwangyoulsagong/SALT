import { AuthState } from "../../../types/store/auth/types";

export const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};
