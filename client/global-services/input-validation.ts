// import { localfiles } from "@/directory/path/to/localimport";

export function validateEmail(email: string): boolean {
  // Simple regex for email validation
  // It checks for the presence of "@" and "."
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): boolean {
  // Password must be at least 8 characters long and contain at least one number and one special character
  // This is just the basic validation, we can enhance as needed to meet specific security requirements
  const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[A-Za-z0-9!@#$%^&*]{8,}$/;
  return passwordRegex.test(password);
}