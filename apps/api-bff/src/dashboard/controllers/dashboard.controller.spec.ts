// Mock the util that extracts the user from the request before importing controller
jest.mock('../../common/utils/auth-request.util', () => ({
  requireGoogleAccessToken: jest.fn((req: any) => req.user || { id: 1 }),
}));

import { DashboardController } from './dashboard.controller';

const mockService: any = {
  getUserStats: jest.fn(),
  getJobPostStats: jest.fn(),
  getCvStats: jest.fn(),
  getEvaluationStats: jest.fn(),
  getReferentEvaluationStats: jest.fn(),
  getReferentInvitationStats: jest.fn(),
  getReferentActivity: jest.fn(),
  getPendingEvaluations: jest.fn(),
  getConsultantStats: jest.fn(),
  getConsultantActivity: jest.fn(),
  getConsultantHourlyActivity: jest.fn(),
  getRecentConversations: jest.fn(),
  getConsultantDomainStats: jest.fn(),
};

describe('DashboardController', () => {
  let controller: DashboardController;
  const {
    requireGoogleAccessToken,
  } = require('../../common/utils/auth-request.util');

  beforeEach(() => {
    jest.resetAllMocks();
    controller = new DashboardController(mockService);
  });

  it('forwards simple stats calls to service', async () => {
    mockService.getUserStats.mockResolvedValue({ total: 1 });
    await expect(controller.getUserStats()).resolves.toEqual({ total: 1 });
    expect(mockService.getUserStats).toHaveBeenCalled();
  });

  it('extracts user from request and forwards to service for consultant endpoints', async () => {
    (requireGoogleAccessToken as jest.Mock).mockImplementation((req: any) => ({
      id: 42,
    }));
    mockService.getConsultantStats.mockResolvedValue({
      totalConversations: 0,
      totalMessages: 0,
      hasMemory: false,
    });

    const fakeReq = { user: { id: 42 } } as any;
    await expect(controller.getConsultantStats(fakeReq)).resolves.toEqual({
      totalConversations: 0,
      totalMessages: 0,
      hasMemory: false,
    });
    expect(mockService.getConsultantStats).toHaveBeenCalledWith(42);
  });
});
