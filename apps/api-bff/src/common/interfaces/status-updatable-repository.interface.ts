export interface IStatusUpdatableRepository<TEntity, TId, TStatus> {
  updateStatus(id: TId, status: TStatus): Promise<TEntity>;
}
