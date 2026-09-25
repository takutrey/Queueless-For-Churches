import { z } from "zod";

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

export const fullSignupSchema = z
  .object({
    churchName: z.string().min(2, "Church name is too short"),
    churchPhone: z.string().min(7, "Enter a valid phone number"),
    churchEmail: z.string().email("Enter a valid email"),
    churchAddress: z.string().optional(),
    ownerName: z.string().min(2, "Enter your full name"),
    ownerEmail: z.string().email("Enter a valid email"),
    password: z
      .string()
      .regex(
        passwordRegex,
        "Use 8+ characters with upper, lower, number, and symbol",
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignupFormValues = z.infer<typeof fullSignupSchema>;

export const STEP_FIELDS: Record<number, (keyof SignupFormValues)[]> = {
  0: ["churchName", "churchPhone", "churchEmail", "churchAddress"],
  1: ["ownerName", "ownerEmail", "password", "confirmPassword"],
};
