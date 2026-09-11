export interface User {
  id: number;
  nickname: string;
  email: string;
  profile?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

/** 이 슬라이스가 store 에 붙는 자리. 셀렉터가 이 가지만 본다. */
export interface AuthRootState {
  auth: AuthState;
}
