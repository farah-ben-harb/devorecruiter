import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  getLiveness(): { status: string } {
    return { status: 'ok' };
  }

  getReadiness(): { status: string } {
    return { status: 'ready' };
  }
}
