import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { GoogleDriveService } from './google-drive.service';
import { UsersModule } from '../../users/users.module';

@Module({
  imports: [HttpModule, ConfigModule, UsersModule],
  providers: [GoogleDriveService],
  exports: [GoogleDriveService],
})
export class GoogleDriveModule {}
