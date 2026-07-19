import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../users/entities/user.entity'; // adaptez le chemin
import { UserRole } from '../../../common/enums/user-role.enum';
import { TechnicalEvaluation } from '../../entities/technical-evaluations/technical-evaluations.entity';
import { JobPost } from '../../../job-posts/entities/job-post.entity';
import { buildEvaluationNotificationEmail } from '../../templates/evaluation-notification.template';

@Injectable()
export class EvaluationNotificationService {
  private readonly logger = new Logger(EvaluationNotificationService.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async notifyReferents(evaluation: TechnicalEvaluation, jobPost: JobPost): Promise<void> {
    const referents = await this.userRepo.find({
      where: { roles: UserRole.TECHNICAL_REFERENT },
      select: ['id', 'email', 'firstName', 'lastName'],
    });

    if (referents.length === 0) {
      this.logger.warn('Aucun référent technique trouvé — aucun email envoyé.');
      return;
    }

    const appUrl =
      this.configService.get<string>('APP_FRONTEND_URL') ??
      this.configService.getOrThrow<string>('FRONTEND_URL');
    const isQuiz = !!evaluation.quizContent;

    const { subject, html } = buildEvaluationNotificationEmail({
      evaluationTitle: evaluation.title,
      version: evaluation.version,
      jobPostName: jobPost.name,
      driveFileUrl: evaluation.driveFileUrl ?? evaluation.pdfUrl ?? '#',
      type: isQuiz ? 'quiz' : 'kata',
      appUrl,
      jobPostId: jobPost.id,
    });

    const sends = referents.map((referent) =>
      this.mailerService
        .sendMail({ to: referent.email, subject, html })
        .then(() => this.logger.log(`Email envoyé à ${referent.email}`))
        .catch((err) =>
          this.logger.error(`Échec envoi à ${referent.email}: ${err.message}`),
        ),
    );

    await Promise.allSettled(sends);
  }
}
