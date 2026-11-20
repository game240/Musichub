export interface UserDto {
  id: number;
  email: string;
  displayName: string | null;
  profileImageUrl: string | null;
  storageUsedBytes: number;
  volume: number;
}

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  user: UserDto;
}

export interface GoogleLoginRequest {
  idToken: string;
}

export interface LocalLoginRequest {
  email: string;
  password: string;
}

export interface LocalRegisterRequest {
  email: string;
  password: string;
  displayName?: string;
}
