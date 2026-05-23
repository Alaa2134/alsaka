export const ALL_ROLES: Role[] = [
  "system_manager",
  "company_admin",
  "admin",
  "manager",
  "cashier",
  "viewer",
];

// Role hierarchy weight — higher means more powerful.
const RANK: Record<Role, number> = {
  system_manager: 60,
  company_admin: 50,
  admin: 40,
  manager: 30,
  cashier: 20,
  viewer: 10,
};

export function hasRole(role: Role | undefined, allowed: Role[]): boolean {
  if (!role) return false;
  return allowed.includes(role);
}

export function atLeast(role: Role | undefined, minimum: Role): boolean {
  if (!role) return false;
  return RANK[role] >= RANK[minimum];
}

export const ROLE_LABEL: Record<Role, string> = {
  system_manager: "مدير النظام",
  company_admin: "مدير الشركة",
  admin: "مسؤول",
  manager: "مدير",
  cashier: "كاشير",
  viewer: "مشاهد",
};
