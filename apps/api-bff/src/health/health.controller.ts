import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('health')
  @ApiOperation({ summary: 'Vérifier l\'état de santé de l\'application' })
  @ApiResponse({
    status: 200,
    description: 'Application opérationnelle.',
    schema: { example: { status: 'ok' } },
  })
  getHealth(): { status: string } {
    return this.healthService.getLiveness();
  }

  @Get('healthz')
  getLiveness(): { status: string } {
    return this.healthService.getLiveness();
  }

  @Get('readyz')
  getReadiness(): { status: string } {
    return this.healthService.getReadiness();
  }
}
