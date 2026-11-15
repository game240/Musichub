export interface UserDto {
  id: number;
  email: string;
  displayName: string | null;
  profileImageUrl: string | null;
  storageUsedBytes: number;
}

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  user: UserDto;
}

export interface GoogleLoginRequest {
  idToken: string;
}
