export interface SignInRequest {
  id: string;
  password: string;
}

export interface SignInResponse {
  user: {
    id: number;
    nickname: string;
    email: string;
    profile?: string;
  };
  token: string;
}
