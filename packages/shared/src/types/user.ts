export type UserRole = "healthcare-professional" | "patient";

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  createdAt: Date;
  lastLoginAt: Date;
}

