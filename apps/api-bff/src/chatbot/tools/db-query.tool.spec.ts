import { DataSource } from 'typeorm';
import { createDbQueryTool, createSearchTool } from './db-query.tool';

describe('chatbot database tools', () => {
  it('normalizes filters and returns a bounded count result', async () => {
    const count = jest.fn().mockResolvedValue(3);
    const dataSource = {
      getRepository: jest.fn(() => ({ count })),
    } as unknown as DataSource;

    const [queryTool] = createDbQueryTool(dataSource);
    const result = await queryTool.invoke({
      table: 'technical_evaluations',
      action: 'count',
      filters: { status: 'approved' },
      limit: '10',
    });

    expect(count).toHaveBeenCalledWith({
      where: { status: 'approved' },
    });
    expect(JSON.parse(result as string)).toMatchObject({
      success: true,
      table: 'technical_evaluations',
      count: 3,
    });
  });

  it('uses parameterized search conditions for candidate lookup', async () => {
    const rows = [{ id: 7, nom: 'Ben Harb', prenom: 'Farah' }];
    const queryBuilder = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue(rows),
    };
    const dataSource = {
      createQueryBuilder: jest.fn(() => queryBuilder),
    } as unknown as DataSource;

    const searchTool = createSearchTool(dataSource);
    const result = await searchTool.invoke({ search: 'Farah Ben' });

    expect(queryBuilder.where).toHaveBeenCalledWith(
      expect.stringContaining('LOWER(c.name) LIKE :term0'),
      expect.objectContaining({ term0: '%farah%', term1: '%ben%' }),
    );
    expect(queryBuilder.limit).toHaveBeenCalledWith(10);
    expect(JSON.parse(result as string)).toMatchObject({
      success: true,
      total: 1,
      data: rows,
    });
  });

  it('rejects empty search terms without querying the database', async () => {
    const createQueryBuilder = jest.fn();
    const searchTool = createSearchTool({
      createQueryBuilder,
    } as unknown as DataSource);

    const result = await searchTool.invoke({ search: ' ' });

    expect(createQueryBuilder).not.toHaveBeenCalled();
    expect(JSON.parse(result as string)).toEqual({
      success: false,
      error: 'Terme de recherche trop court',
    });
  });
});
