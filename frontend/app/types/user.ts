export type User = {
  id: number;
  email: string;
  displayName: string;
  createdAt: string;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: User;
};
