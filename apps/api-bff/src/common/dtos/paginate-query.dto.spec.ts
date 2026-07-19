import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { PaginateQueryDto } from './paginate-query.dto';

describe('paginate-query.dto module', () => {
  it('should validate pagination and filter fields', () => {
    const dto = plainToInstance(PaginateQueryDto, {
      page: 2,
      limit: 25,
      search: 'developer',
      status: 'raw',
    });

    expect(validateSync(dto)).toHaveLength(0);
    expect(dto.search).toBe('developer');
    expect(dto.status).toBe('raw');
  });

  it('should reject non-string search values', () => {
    const dto = plainToInstance(PaginateQueryDto, {
      search: 123,
    });

    expect(validateSync(dto).some((error) => error.property === 'search')).toBe(
      true,
    );
  });
});
