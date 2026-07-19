import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { N8nWorkflowService } from './n8n-workflow.service';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [N8nWorkflowService],
  exports: [N8nWorkflowService],
})
export class N8nWorkflowModule {}
