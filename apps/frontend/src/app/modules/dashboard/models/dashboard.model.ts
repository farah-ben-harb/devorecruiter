export interface UserStats {
  total: number;
  actifs: number;
  inactifs: number;
  parRole: Record<string, number>;
}

export interface JobPostStats {
  total: number;
  bruts: number;
  unifies: number;
  parStatut: Record<string, number>;
  parJobStatus: Record<string, number>;
  topClients: { company: string; count: number }[];
  topProfils: { title: string; count: number }[];
}

export interface ResumeStats {
  total: number;
  bruts: number;
  unifies: number;
}

export interface EvaluationStats {
  total: number;
  enCours: number;
  validees: number;
  rejetees: number;
}

export interface DashboardStats {
  users?: UserStats;
  jobPosts?: JobPostStats;
  resumes?: ResumeStats;
  evaluations?: EvaluationStats;
}

export interface ReferentEvaluationStats {
  pending: number;
  completed: number;
  approved: number;
  rejected: number;
  inProgress: number;
  total: number;
}

export interface ReferentInvitationStats {
  sent: number;
  submitted: number;
  expired: number;
  total: number;
}

export interface ActivityPoint {
  date: string;
  generated: number;
  approved: number;
  invitations: number;
}

export interface PendingEvaluation {
  id: number;
  title: string;
  jobPostId: number;
  jobPostTitle: string | null;
  company: string | null;
  status: string;
  createdAt: string;
}

export interface ConsultantStats {
  totalConversations: number;
  totalMessages: number;
  hasMemory: boolean;
}

export interface ConsultantActivityPoint {
  date: string;
  sessions: number;
  messages: number;
}

export interface ConsultantHourlyPoint {
  hour: number;
  count: number;
}

export interface RecentConversation {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
}

export interface DomainStat {
  domain: string;
  count: number;
  countLastWeek: number;
  countPreviousWeek: number;
}

export interface ConsultantDomainStats {
  domains: DomainStat[];
  total: number;
}
