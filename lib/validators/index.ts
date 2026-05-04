import { z } from "zod";

export const userSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "user", "moderator"]),
  status: z.enum(["active", "inactive"]).optional(),
});

export const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  bio: z.string().max(200, "Bio must be under 200 characters").optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
});

export const settingsSchema = z.object({
  currentPassword: z.string().min(6, "Password must be at least 6 characters"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type UserFormValues = z.infer<typeof userSchema>;
export type ProfileFormValues = z.infer<typeof profileSchema>;
export type SettingsFormValues = z.infer<typeof settingsSchema>;
export type LoginFormValues = z.infer<typeof loginSchema>;
