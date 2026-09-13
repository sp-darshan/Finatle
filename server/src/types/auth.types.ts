export interface SignUpDto {
  email: string;
  password: string;
  name?: string;
  age?: number | string | null;
}

export interface SignInDto {
  email: string;
  password: string;
}

export interface UpdateProfileDto {
  name?: string;
  phone?: string;
  age?: number | string | null;
}

export interface OtpRecord {
  otp: string;
  email: string;
  expiresAt: number;
}

export interface ChangePasswordWithOtpDto {
  otp: string | number;
  newPassword: string;
}

export interface UserSummaryDto {
  uid: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  age?: number | null;
  createdAt: Date | string;
  account?: any;
}
