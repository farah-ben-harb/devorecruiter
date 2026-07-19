import { FindOptionsWhere } from 'typeorm';
import { PaginatedResult } from './paginated-result.interface';

export interface IBaseRepository<T> {
  create(data: Partial<T>): Promise<T>;
  findAll(page: number, limit: number): Promise<PaginatedResult<T>>;
  findBy(criteria: FindOptionsWhere<T>): Promise<T | null>;
  save(entity: T): Promise<T>;
  deleteBy(criteria: FindOptionsWhere<T>): Promise<void>;
}
