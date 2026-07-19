export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface QueryFilters {
    candidateId?: string | null;
    jobPostId?: number | null;
    minScore?: number | null;
    maxScore?: number | null;
    status?: string | null;
    recommendation?: string | null;
    limit?: number | null;
}