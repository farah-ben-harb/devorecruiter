import { ICONS } from '../../../core/icons/constants/icon.registry';
import { Role, ROLES } from '@shared/constants/roles.constants';

export type NavItem = {
  name: string;
  icon: string;
  path?: string;
  new?: boolean;
  roles?: Role[];
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

export const ALL_NAV_ITEMS: NavItem[] = [
  {
    icon: ICONS.dashboard,
    name: 'Tableau de bord',
    path: '/',
    roles: ['ADMIN_RH', 'TALENT_ACQUISITION', 'CONSULTANT', 'TECHNICAL_REFERENT'],
  },
  {
    icon: ICONS.users,
    name: 'Utilisateurs',
    path: '/users',
    roles: ['ADMIN_RH'],
  },
  {
    icon: ICONS.posts,
    name: 'Fiches de poste',
    path: '/posts',
    roles: ['ADMIN_RH', 'TALENT_ACQUISITION', 'TECHNICAL_REFERENT'],
  },
  {
    icon: ICONS.candidates,
    name: 'Candidats',
    path: '/candidates',
    roles: [ROLES.ADMIN_RH, ROLES.TALENT_ACQUISITION],
  },
  // {
  //   icon: ICONS.assistance,
  //   name: 'Assistant technique',
  //   path: '/assistance',
  //   roles: ['ADMIN_RH', 'CONSULTANT'],
  // },

  // {
  //   icon: ICONS.assistance,
  //   name: 'Assistant RH',
  //   path: '/rh-assistant',
  //   roles: ['ADMIN_RH', 'CONSULTANT', 'TECHNICAL_REFERENT'],
  // },

  // {
  //   icon: ICONS.assistance,
  //   name: 'Assistant',
  //   path: '/assistant',
  //   roles: ['ADMIN_RH', 'CONSULTANT', 'TECHNICAL_REFERENT'],
  // },

  {
    icon: ICONS.posts,
    name: 'Offres LinkedIn',
    path: '/job-offers',
    roles: ['ADMIN_RH', 'TALENT_ACQUISITION'],
  },
];
