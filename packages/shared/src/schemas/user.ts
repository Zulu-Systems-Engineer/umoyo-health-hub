import { z } from "zod";

export const userRoleSchema = z.enum(["healthcare-professional", "patient"]);

export const userProfileSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  displayName: z.string().optional(),
  role: userRoleSchema,
  createdAt: z.date(),
  lastLoginAt: z.date(),
});

export type UserProfile = z.infer<typeof userProfileSchema>;

