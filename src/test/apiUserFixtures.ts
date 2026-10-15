import { ADMIN_USERS } from "@/data/admin/users";
import type { ApiUser } from "@/lib/api/users";

/**
 * The seeded accounts, in the shape `GET /users` returns.
 *
 * The admin users screen reads from the network now, so a test that renders it
 * needs a server or a stand-in. This is the stand-in, built from the same
 * seeded rows the screen used to read directly, so what the tests assert
 * against has not changed.
 */
export function seededApiUsers(): ApiUser[] {
  return ADMIN_USERS.map((row) => ({
    id: row.id,
    email: row.email,
    full_name: row.fullName,
    phone: row.phone,
    role: row.role,
    is_active: row.isActive,
    intern_approved: row.approval !== "pending",
    created_at: new Date(row.createdAt).toISOString(),
  }));
}
