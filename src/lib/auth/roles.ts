import type { UserRole } from "@/lib/validations/auth";

/** Desktop staff surfaces — sidebar shell instead of the mobile bottom nav. */
export function isStaffRole(role?: UserRole) {
  return role === "intern" || role === "annotator" || role === "admin";
}

export function isContributorRole(role?: UserRole) {
  return !role || role === "contributor";
}

export function isInternRole(role?: UserRole) {
  return role === "intern" || role === "admin";
}

export function isAnnotatorRole(role?: UserRole) {
  return role === "annotator" || role === "admin";
}

export function isAdminRole(role?: UserRole) {
  return role === "admin";
}

/** Where a role lands after login or on hitting "/". */
export function homePathForRole(role?: UserRole) {
  if (role === "admin") return "/admin/dashboard";
  if (role === "annotator") return "/annotator/dashboard";
  if (role === "intern") return "/intern/dashboard";
  return "/contributor/dashboard";
}
