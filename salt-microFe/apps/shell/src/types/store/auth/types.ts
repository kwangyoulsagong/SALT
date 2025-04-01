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
