export type UserRole = 'ADMIN' | 'DOWNLOADER' | null;

export interface UserDto {
  id: number;
  email: string;
  displayName: string | null;
  profileImageUrl: string | null;
  storageUsedBytes: number;
  volume: number;
  role?: UserRole;
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
  verificationCode: string;
  password: string;
  displayName?: string;
}

export type AuthProviderType = 'GOOGLE' | 'GITHUB' | 'LOCAL';

export interface IdentityDto {
  provider: AuthProviderType;
  identifier: string;
  createdAt: string;
}

export interface UserIdentitiesResponse {
  hasPassword: boolean;
  identities: IdentityDto[];
}

export interface SetPasswordRequest {
  code: string;
  currentPassword?: string;
  newPassword: string;
}

export interface LinkGoogleRequest {
  idToken: string;
}
