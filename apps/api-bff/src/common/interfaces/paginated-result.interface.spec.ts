import { PaginatedResult } from './paginated-result.interface';

describe('paginated-result.interface module', () => {
  it('should accept the extended pagination meta shape', () => {
    const result: PaginatedResult<string> = {
      data: ['a'],
      meta: {
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        totalAll: 3,
        totalUnified: 1,
        totalRaw: 2,
      },
    };

    expect(result.meta.totalAll).toBe(3);
    expect(result.meta.totalUnified).toBe(1);
    expect(result.meta.totalRaw).toBe(2);
  });
});
