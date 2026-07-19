import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JobOfferController } from './controllers/job-offer.controller';
import { JobOffer } from './entities/job-offer.entity';
import { JobOfferRepository } from './repositories/job-offer.repository';
import { JobOfferService } from './services/job-offer.service';
import { JobPost } from '../job-posts/entities/job-post.entity';
import { GoogleDriveModule } from '../common/google-drive/google-drive.module';


@Module({
  imports: [
    ConfigModule,                 
    TypeOrmModule.forFeature([JobOffer,JobPost,]),GoogleDriveModule,
  ],
  providers: [
    JobOfferRepository,
    JobOfferService,
  ],
  controllers: [JobOfferController],
  exports: [JobOfferService],
})
export class JobOfferModule {}