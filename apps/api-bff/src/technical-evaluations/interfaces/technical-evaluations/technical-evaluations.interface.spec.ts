import { TECHNICAL_EVALUATION_REPOSITORY } from './technical-evaluations.interface';

describe('TechnicalEvaluationRepository Contract', () => {
  const mockRepo = {
    create: jest.fn(),
    findAll: jest.fn(),
    findAllEvaluations: jest.fn(),
    findById: jest.fn(),
    findByDriveFileId: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // 1. TOKEN EXISTENCE
  // ─────────────────────────────────────────────
  it('should export repository token', () => {
    expect(TECHNICAL_EVALUATION_REPOSITORY).toBeDefined();
    expect(typeof TECHNICAL_EVALUATION_REPOSITORY).toBe('string');
  });

  // ─────────────────────────────────────────────
  // 2. CREATE METHOD CONTRACT
  // ─────────────────────────────────────────────
  it('should call create method', async () => {
    mockRepo.create.mockResolvedValue({ id: 1 });

    const result = await mockRepo.create({ title: 'test' });

    expect(mockRepo.create).toHaveBeenCalledWith({ title: 'test' });
    expect(result).toEqual({ id: 1 });
  });

  // ─────────────────────────────────────────────
  // 3. FIND ALL
  // ─────────────────────────────────────────────
  it('should call findAll', async () => {
    mockRepo.findAll.mockResolvedValue([{ id: 1 }]);

    const result = await mockRepo.findAll(1);

    expect(mockRepo.findAll).toHaveBeenCalledWith(1);
    expect(result.length).toBe(1);
  });

  // ─────────────────────────────────────────────
  // 4. FIND BY ID
  // ─────────────────────────────────────────────
  it('should return evaluation by id', async () => {
    mockRepo.findById.mockResolvedValue({ id: 1 });

    const result = await mockRepo.findById(1);

    expect(mockRepo.findById).toHaveBeenCalledWith(1);
    expect(result).toEqual({ id: 1 });
  });

  // ─────────────────────────────────────────────
  // 5. UPDATE
  // ─────────────────────────────────────────────
  it('should update evaluation', async () => {
    mockRepo.update.mockResolvedValue({ id: 1, title: 'updated' });

    const result = await mockRepo.update(1, { title: 'updated' });

    expect(mockRepo.update).toHaveBeenCalledWith(1, {
      title: 'updated',
    });
    expect(result.title).toBe('updated');
  });

  // ─────────────────────────────────────────────
  // 6. DELETE
  // ─────────────────────────────────────────────
  it('should call delete', async () => {
    mockRepo.delete.mockResolvedValue(undefined);

    await mockRepo.delete(1);

    expect(mockRepo.delete).toHaveBeenCalledWith(1);
  });

  // ─────────────────────────────────────────────
  // 7. FIND BY DRIVE FILE ID
  // ─────────────────────────────────────────────
  it('should find by drive file id', async () => {
    mockRepo.findByDriveFileId.mockResolvedValue({ id: 1 });

    const result = await mockRepo.findByDriveFileId('file123');

    expect(mockRepo.findByDriveFileId).toHaveBeenCalledWith('file123');
    expect(result.id).toBe(1);
  });
});
