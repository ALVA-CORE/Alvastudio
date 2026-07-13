import type { UserRole } from "@/lib/validations/auth";

export function isStaffRole(role?: UserRole) {
  return role === "intern" || role === "admin";
}

export function isContributorRole(role?: UserRole) {
  return !role || role === "contributor";
}
