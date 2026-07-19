export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    totalAll?: number;
    totalUnified?: number;
    totalRaw?: number;
    totalWithEvaluation?: number;
  };
}
