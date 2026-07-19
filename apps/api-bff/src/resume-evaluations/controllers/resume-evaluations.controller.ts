import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ResumeEvaluationService } from '../services/resume-evaluations.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import type { AuthRequest } from '../../auth/interfaces/auth.interface';
import { requireGoogleAccessToken } from '../../common/utils/auth-request.util';

@Controller('scoringresume')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TALENT_ACQUISITION, UserRole.ADMIN_RH)
export class ResumeEvaluationController {
  constructor(private readonly scoringresumeService: ResumeEvaluationService) {}

  @Post('trigger-all')
  triggerAll(
    @Body() dto: { jobPostGoogleDriveFileId: string; jobPostId: number },
    @Req() req: AuthRequest,
  ) {
    const user = requireGoogleAccessToken(
      req,
      () => new BadRequestException('Token Google manquant'),
    );

    return this.scoringresumeService.triggerAllAndSave(
      dto.jobPostGoogleDriveFileId,
      dto.jobPostId,
      user.googleAccessToken,       // ← token passé au service
    );
  }

  @Get('job-post/:id')
  getByJobPost(@Param('id', ParseIntPipe) id: number) {
    return this.scoringresumeService.getByJobPost(id);
  }

  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.scoringresumeService.getById(id);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.scoringresumeService.delete(id);
  }


@Post(':id/rescore')
rescoreOne(
  @Param('id', ParseIntPipe) id: number,
  @Req() req: AuthRequest,
) {
  const user = requireGoogleAccessToken(
    req,
    () => new BadRequestException('Token Google manquant'),
  );
  return this.scoringresumeService.rescoreOne(id, user.googleAccessToken);
}


}