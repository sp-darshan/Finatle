export interface SignUpDto {
  email: string;
  password: string;
  name: string; // Mandatory full name
  phone: string; // Mandatory phone number for upcoming users
  age?: number | string | null;
  otp?: string | number; // Verification OTP code
}

export interface SignInDto {
  email: string;
  password: string;
}

export interface SendOtpDto {
  email: string;
  purpose: 'SIGNUP' | 'FORGOT_PASSWORD';
}

export interface ForgotPasswordDto {
  email: string;
  otp: string | number;
  newPassword: string;
}

export interface UpdateProfileDto {
  name?: string;
  phone?: string;
  age?: number | string | null;
}

export interface OtpRecord {
  otp: string;
  email: string;
  purpose: 'SIGNUP' | 'FORGOT_PASSWORD' | 'SETTINGS';
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
