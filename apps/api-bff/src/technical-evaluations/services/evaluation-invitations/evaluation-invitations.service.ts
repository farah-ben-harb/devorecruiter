import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { MailerService } from '@nestjs-modules/mailer';
import { GithubService } from '../github/github.service';
import { randomBytes } from 'crypto'; // ✅ Import statique — résout l'erreur dynamic import

import { Invitation } from '../../entities/evaluation-invitations/evaluation-invitation.entity';
import { SendInvitationDto } from '../../dtos/evaluation-invitations/evaluation-invitation.dto';
import { TechnicalEvaluation } from '../../entities/technical-evaluations/technical-evaluations.entity';
import { ResumeEvaluation } from '../../../resume-evaluations/entities/resume-evaluation.entity';
import { Candidate } from '../../../candidates/entities/candidate.entity';
import { ConfigService } from '@nestjs/config';
import { CandidateCodeEvaluation } from '../../entities/candidate-code-evaluations/candidate-code-evaluations.entity';

@Injectable()
export class InvitationsService {
  constructor(
    @InjectRepository(Invitation)
    private readonly invitationRepo: Repository<Invitation>,

    @InjectRepository(TechnicalEvaluation)
    private readonly evaluationRepo: Repository<TechnicalEvaluation>,

    @InjectRepository(ResumeEvaluation)
    private readonly resumeEvaluationRepo: Repository<ResumeEvaluation>,

    @InjectRepository(Candidate)
    private readonly candidateRepo: Repository<Candidate>,

    @InjectRepository(CandidateCodeEvaluation)
    private readonly codeEvaluationRepo: Repository<CandidateCodeEvaluation>,

    private readonly mailerService: MailerService,

    private readonly githubService: GithubService,
    private readonly configService: ConfigService,
  ) {}

  async sendInvitations(dto: SendInvitationDto): Promise<{ sent: number }> {
    const evaluation = await this.evaluationRepo.findOne({
      where: { id: dto.evaluationId },
      relations: ['jobPost'],
    });

    console.log('isQuiz:', !!evaluation?.quizContent);
    console.log('quizContent length:', evaluation?.quizContent?.length ?? 0);

    if (!evaluation) {
      throw new NotFoundException(
        `Évaluation ${dto.evaluationId} introuvable.`,
      );
    }

    let sent = 0;

    if (dto.scoringResumeIds?.length) {
      const scoringResumes = await this.resumeEvaluationRepo.find({
        where: { id: In(dto.scoringResumeIds) },
      });

      for (const scoringResume of scoringResumes) {
        const candidate = await this.findCandidateByFileId(
          scoringResume.resumeFileId,
        );

        if (!candidate?.email) {
          continue;
        }

        await this.sendAndSave({
          email: candidate.email,
          name: candidate.name ?? 'Candidat',
          firstName: candidate.firstName ?? '',
          evaluation,
          dto,
          candidateId: candidate.id,
          resumeFileId: scoringResume.resumeFileId,
          githubUsername: candidate.githubUsername ?? null,
        });

        sent++;
      }
    }

    // ──────────────── B) CVs NON SCORÉS ────────────────
    if (dto.unscoredResumeIds?.length) {
      for (const driveFileId of dto.unscoredResumeIds) {
        const candidate = await this.findCandidateByFileId(driveFileId);

        if (!candidate?.email) {
          continue;
        }

        await this.sendAndSave({
          email: candidate.email,
          name: candidate.name ?? 'Candidat',
          firstName: candidate.firstName ?? '',
          evaluation,
          dto,
          candidateId: candidate.id,
          resumeFileId: driveFileId,
          githubUsername: candidate.githubUsername ?? null,
        });

        sent++;
      }
    }

    return { sent };
  }

  private async sendAndSave(params: {
    email: string;
    name: string;
    firstName: string;
    evaluation: TechnicalEvaluation;
    dto: SendInvitationDto;
    candidateId: string;
    resumeFileId: string | null;
    githubUsername?: string | null;
  }) {
    const {
      email,
      name,
      firstName,
      evaluation,
      dto,
      candidateId,
      resumeFileId,
      githubUsername,
    } = params;

    // ✅ Détecter si c'est un quiz
    const isQuiz = !!evaluation.quizContent;

    let candidateGitRepoUrl: string | null = null;
    let quizToken: string | null = null;

    if (isQuiz) {
      // ✅ Import statique utilisé directement — plus de dynamic import
      quizToken = randomBytes(32).toString('hex');
    } else {
      // ── Coding test : créer le repo GitHub ──────────────────────────────
      try {
        candidateGitRepoUrl = await this.githubService.createRepoForCandidate(
          evaluation.title,
          name,
          firstName,
          email,
          githubUsername ?? null,
        );
      } catch (err) {
        console.error('❌ GitHub repo creation failed:', err);
      }
    }

    const finalGitRepoUrl = candidateGitRepoUrl ?? evaluation.gitRepoUrl;
    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');

    // ── Envoi email ────────────────────────────────────────────────────────
    await this.mailerService.sendMail({
      to: email,
      subject: `Invitation à l'évaluation technique — ${evaluation.title}`,
      from: `"Devoteam" <${this.configService.get<string>('MAIL_USER')}>`,
      html: this.buildEmailHtml({
        candidateName: name,
        candidateFirstName: firstName,
        evaluationTitle: evaluation.title,
        dueDate: dto.dueDate,
        gitRepoUrl: isQuiz ? null : finalGitRepoUrl,
        pdfUrl: isQuiz ? null : evaluation.pdfUrl,
        isQuiz,
        quizToken,
        quizUrl: isQuiz ? `${frontendUrl}/quiz/${quizToken}` : null,
      }),
      textEncoding: 'base64',
    });

    // ── Sauvegarder en DB ──────────────────────────────────────────────────
    const invitation = this.invitationRepo.create({
      candidateId,
      candidateName: name,
      candidateFirstName: firstName,
      candidateEmail: email,
      jobPostId: dto.jobPostId,
      evaluationId: dto.evaluationId,
      dueDate: dto.dueDate,
      candidateResumeFileId: resumeFileId ?? null,
      gitRepoUrl: isQuiz ? null : candidateGitRepoUrl,
      quizToken: isQuiz ? quizToken : null,
    });

    await this.invitationRepo.save(invitation);
  }

  // ──────────────── TEMPLATE EMAIL ────────────────
  private buildEmailHtml(params: {
    candidateName: string;
    candidateFirstName: string;
    evaluationTitle: string;
    dueDate: string;
    gitRepoUrl: string | null;
    pdfUrl: string | null;
    isQuiz: boolean;
    quizToken: string | null;
    quizUrl: string | null;
  }): string {
    const {
      candidateName,
      candidateFirstName,
      evaluationTitle,
      dueDate,
      gitRepoUrl,
      pdfUrl,
      isQuiz,
      quizUrl,
    } = params;

    const formattedDate = new Date(dueDate).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const contentBlock = isQuiz
      ? `
      <p style="font-size:14px; line-height:1.6; color:#374151;">
        Vous avez été invité(e) à passer un <strong>quiz d'évaluation</strong> en ligne.
        Cliquez sur le bouton ci-dessous pour commencer.
      </p>
      <div style="text-align:center; margin:28px 0;">
        <a href="${quizUrl}"
           style="display:inline-block; background:#E2001A; color:white; padding:14px 32px;
                  text-decoration:none; border-radius:10px; font-weight:bold; font-size:15px;
                  letter-spacing:0.3px;">
          📝 Passer le Quiz
        </a>
      </div>
      <p style="font-size:12px; color:#9ca3af; text-align:center;">
        Ce lien est unique et personnel. Il ne peut être utilisé qu'une seule fois.
      </p>
    `
      : `
      <p style="font-size:14px; line-height:1.6; color:#374151;">
        Nous vous invitons à compléter votre évaluation technique.
      </p>
      ${
        pdfUrl
          ? `
        <div style="text-align:center; margin:25px 0;">
          <a href="${pdfUrl}" target="_blank"
             style="background:#E2001A; color:white; padding:12px 24px;
                    text-decoration:none; border-radius:8px; font-weight:bold;">
            📄 Voir l'énoncé (PDF)
          </a>
        </div>
      `
          : ''
      }
      ${
        gitRepoUrl
          ? `
        <p style="font-size:14px; color:#374151;">
          <b>Repository Git :</b><br/>
          <a href="${gitRepoUrl}" style="color:#E2001A;">${gitRepoUrl}</a>
        </p>
      `
          : ''
      }
    `;

    return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
</head>
<body style="margin:0; padding:0; background:#f4f6f9; font-family:Arial, sans-serif;">
  <table width="100%" style="padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.08);">
          <!-- HEADER -->
          <tr>
            <td style="background:#E2001A; padding:30px;">
              <h2 style="margin:0; color:white;">Évaluation Technique</h2>
              <p style="margin:5px 0 0; color:#ffe5e5;">${evaluationTitle}</p>
            </td>
          </tr>
          <!-- CONTENT -->
          <tr>
            <td style="padding:30px; color:#333;">
              <p style="font-size:16px;">
                Bonjour <b>${candidateFirstName} ${candidateName}</b>,
              </p>

              ${contentBlock}

              <div style="background:#fff4e5; border:1px solid #ffd59e; padding:15px;
                          border-radius:8px; margin:20px 0;">
                <p style="margin:0; font-size:12px; color:#a16207; text-transform:uppercase;
                           letter-spacing:1px; font-weight:600;">Date limite</p>
                <p style="margin:5px 0 0; font-size:16px; font-weight:bold; color:#92400e;">
                  ${formattedDate}
                </p>
              </div>

              <p style="margin-top:30px; font-size:13px; color:#666;">
                Bonne chance et bon courage pour cette évaluation 🍀
              </p>
            </td>
          </tr>
          <!-- FOOTER -->
          <tr>
            <td style="background:#f9fafb; padding:20px; text-align:center;
                       font-size:12px; color:#999;">
              Cet email a été envoyé automatiquement. Merci de ne pas y répondre.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  async findByResumeFileId(resumeFileId: string): Promise<Invitation[]> {
    const candidate = await this.candidateRepo.findOne({
      where: [{ brutDriveId: resumeFileId }, { unifieDriveId: resumeFileId }],
    });
    if (!candidate) return [];

    const invitations = await this.invitationRepo.find({
      where: { candidateId: candidate.id },
      relations: ['evaluation'],
      order: { sentAt: 'DESC' },
    });

    return this.attachCodeEvaluations(invitations);
  }

  async findByJobPost(jobPostId: number): Promise<Invitation[]> {
    return this.invitationRepo.find({
      where: { jobPostId },
      order: { sentAt: 'DESC' },
    });
  }

  async deleteInvitation(id: number): Promise<void> {
    await this.invitationRepo.delete(id);
  }

  private async findCandidateByFileId(
    fileId: string,
  ): Promise<Candidate | null> {
    if (!fileId) return null;
    return this.candidateRepo.findOne({
      where: [{ brutDriveId: fileId }, { unifieDriveId: fileId }],
    });
  }

  async findByEvaluation(evaluationId: number): Promise<Invitation[]> {
    const invitations = await this.invitationRepo.find({
      where: { evaluationId },
      order: { sentAt: 'DESC' },
    });

    return this.attachCodeEvaluations(invitations);
  }

  private async attachCodeEvaluations(
    invitations: Invitation[],
  ): Promise<
    (Invitation & { codeEvaluation: CandidateCodeEvaluation | null })[]
  > {
    return Promise.all(
      invitations.map(async (inv) => {
        const codeEvaluation = await this.codeEvaluationRepo.findOne({
          where: { invitationId: inv.id },
        });
        return { ...inv, codeEvaluation: codeEvaluation ?? null };
      }),
    );
  }
}
