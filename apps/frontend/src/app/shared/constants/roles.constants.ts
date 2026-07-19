export const ROLES = {
  ADMIN_RH: 'ADMIN_RH',
  TALENT_ACQUISITION: 'TALENT_ACQUISITION',
  CONSULTANT: 'CONSULTANT',
  TECHNICAL_REFERENT: 'TECHNICAL_REFERENT',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ALL_ROLES: Role[] = [
  ROLES.ADMIN_RH,
  ROLES.TALENT_ACQUISITION,
  ROLES.CONSULTANT,
  ROLES.TECHNICAL_REFERENT,
];

export function isRole(value: string | null | undefined): value is Role {
  return !!value && ALL_ROLES.includes(value as Role);
}
