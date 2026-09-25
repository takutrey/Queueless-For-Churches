export interface ChurchSettings {
  id?: string;
  churchName?: string;
  name?: string;
  slug?: string;
  status?: string;
  logo?: string;
  favicon?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export interface Church {
  id: string;
  name: string;
  slug: string;
  status?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string;
  churchId?: string;
  church?: Church;
  churchSettings?: ChurchSettings;
  accessToken?: string;
  refreshToken?: string;
}

export interface ChurchSignupPayload {
  churchName: string;
  churchPhone: string;
  churchEmail: string;
  churchAddress?: string;
  ownerName: string;
  ownerEmail: string;
  password: string;
}

export interface ChurchSignupResponse {
  message: string;
  church: { id: string; name: string; slug: string };
  user: {
    id: string;
    name: string;
    email: string;
    churchId?: string;
  };
}

export interface SignUpPayload {
  name: string;
  phone: string;
  password: string;
  confirmPassword: string;
  token: string;
}

export interface CreateUserPayload {
  name: string;
  phone?: string;
  email: string;
  role: string;
}

export interface AuthState {
  user: User | null;
  error: string | null;
  success: string | null;
  isLoading: boolean;
  isRehydrated: boolean;
  isAuthenticated: boolean;
  isInitialized: boolean;
}
// ─── Forgot Password Types ──────────────────────────────────────────────────

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  email: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ValidateResetTokenResponse {
  valid: boolean;
  message: string;
  email?: string;
}

// ─── Complete Signup ───────────────────────────────────────────────────────────

/** Returned by GET /auth/verify-invite?token=<token> */
export interface InviteUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

/** POST /auth/signup — set password via invite token */
export interface CompletePasswordPayload {
  token: string;
  password: string;
  confirmPassword: string;
}

/** POST /api/users/:id/teacher-details */
export interface TeacherDetailsPayload {
  gender: string;
  joinDate: string;
  employmentType: string;
  departmentId: string;
}

/** POST /api/users/:id/student-details */
export interface StudentDetailsPayload {
  gender: string;
  dateOfBirth: string;
  classId?: string;
  guardianName: string;
  guardianEmail: string;
  guardianPhone: string;
  guardianGender: string;
  occupation: string;
  address: string;
  relationshipToStudent: string;
}

/** Generic details payload for all other staff roles */
export interface StaffDetailsPayload {
  gender: string;
  joinDate?: string;
  hireDate?: string;
  dateOfBirth?: string;
  qualification?: string;
  employmentType?: string;
  licenseNumber?: string;
  licenseExpiryDate?: string;
  departmentId?: string;
  shift?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  occupation?: string;
  [key: string]: string | undefined;
}

export type RoleDetailsPayload =
  | TeacherDetailsPayload
  | StudentDetailsPayload
  | StaffDetailsPayload;
