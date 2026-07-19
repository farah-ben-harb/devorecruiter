import { Role } from '@shared/constants/roles.constants';

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  picture: string;
  roles: Role[];
  isActivated: boolean;
  createdAt: string;
  lastLogin: string;
}

export interface AddUserDto {
  email: string;
  firstName: string;
  lastName: string;
  roles: Role[];
  isActivated: boolean;
}

export interface UpdateUserDto {
  email: string;
  firstName: string;
  lastName: string;
  roles: Role[];
  isActivated: boolean;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResult {
  data: User[];
  meta: PaginationMeta;
}

export interface AddUserPayload {
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  isActivated: boolean;
}

export interface EditUserPayload {
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  isActivated: boolean;
}

export interface RoleOption {
  value: string;
  label: string;
  badgeClass: string;
}

export const ALL_ROLES: RoleOption[] = [
  { value: 'ADMIN_RH', label: 'Admin RH', badgeClass: 'bg-red-100 text-red-800' },
  { value: 'TALENT_ACQUISITION', label: 'Recruteur', badgeClass: 'bg-blue-100 text-blue-700' },
  { value: 'CONSULTANT', label: 'Consultant', badgeClass: 'bg-green-100 text-green-700' },
  {
    value: 'TECHNICAL_REFERENT',
    label: 'Référent Technique',
    badgeClass: 'bg-purple-100 text-purple-700',
  },
];

export const ASSIGNABLE_ROLES: RoleOption[] = ALL_ROLES.filter((r) => r.value !== 'ADMIN_RH');
