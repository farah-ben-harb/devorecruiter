import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { CandidateQuizResult } from '../../entities/candidate-quiz-results/candidate-quiz-result.entity';
import { Invitation } from '../../entities/evaluation-invitations/evaluation-invitation.entity';
import { TechnicalEvaluation } from '../../entities/technical-evaluations/technical-evaluations.entity';
import { SubmitQuizDto } from '../../dtos/candidate-quiz/candidate-quiz.dto';
import { AiQuizFeedback, QuizPublicView, QuizSubmitResult } from '../../interfaces/candidate-quiz/candidate-quiz.interface';
import { QuizAnswerKey, QuizQuestionPublic } from '../../templates/quiz-evaluation.template';

@Injectable()
export class CandidateQuizService {
  constructor(
    @InjectRepository(CandidateQuizResult)
    private readonly resultRepo: Repository<CandidateQuizResult>,
    @InjectRepository(Invitation)
    private readonly invitationRepo: Repository<Invitation>,
    @InjectRepository(TechnicalEvaluation)
    private readonly evaluationRepo: Repository<TechnicalEvaluation>,
    private readonly configService: ConfigService,
  ) {}

  async getQuizByToken(token: string): Promise<QuizPublicView> {
    const invitation = await this.invitationRepo.findOne({
      where: { quizToken: token },
      relations: ['evaluation'],
    });
    if (!invitation) throw new NotFoundException('Lien de quiz invalide ou expiré');

    const due = new Date(invitation.dueDate);
    due.setHours(23, 59, 59);
    if (new Date() > due) throw new BadRequestException('La date limite est dépassée');

    const existing = await this.resultRepo.findOne({ where: { invitationId: invitation.id } });
    if (existing) throw new BadRequestException('Vous avez déjà soumis ce quiz');

    const evaluation = invitation.evaluation;
    if (!evaluation?.quizContent) throw new NotFoundException('Contenu du quiz introuvable');

    const questions: QuizQuestionPublic[] = JSON.parse(evaluation.quizContent);

    return {
      invitationId: invitation.id,
      evaluationId: evaluation.id,
      candidateFirstName: invitation.candidateFirstName,
      candidateName: invitation.candidateName,
      title: evaluation.title,
      description: '',
      durationMinutes: 30,
      dueDate: invitation.dueDate,
      questions,
    };
  }

  async submitQuiz(token: string, dto: SubmitQuizDto): Promise<QuizSubmitResult> {
    const invitation = await this.invitationRepo.findOne({
      where: { quizToken: token },
      relations: ['evaluation'],
    });
    if (!invitation) throw new NotFoundException('Lien invalide ou expiré');

    const due = new Date(invitation.dueDate);
    due.setHours(23, 59, 59);
    if (new Date() > due) throw new BadRequestException('Date limite dépassée');

    const existing = await this.resultRepo.findOne({ where: { invitationId: invitation.id } });
    if (existing) throw new BadRequestException('Quiz déjà soumis');

    const evaluation = invitation.evaluation;
    if (!evaluation?.quizAnswerKey) throw new NotFoundException('Corrigé introuvable');

    const answerKey: QuizAnswerKey[] = JSON.parse(evaluation.quizAnswerKey);

    const detail = answerKey.map((q) => {
      const submitted = dto.answers.find((a) => a.questionId === q.id);
      const isCorrect = submitted?.answer === q.correct_answer;
      return {
        questionId: q.id,
        question: q.question,
        yourAnswer: submitted?.answer ?? '(sans réponse)',
        correctAnswer: q.correct_answer,
        isCorrect,
        explanation: q.explanation,
        domain: q.domain,
        difficulty: q.difficulty,
      };
    });

    const correctAnswers = detail.filter((d) => d.isCorrect).length;
    const totalQuestions = answerKey.length;
    const scorePercent = Math.round((correctAnswers / totalQuestions) * 100);


    await this.resultRepo.save(
      this.resultRepo.create({
        invitationId: invitation.id,
        candidateId: invitation.candidateId,
        evaluationId: evaluation.id,
        answersJson: JSON.stringify(dto.answers),
        totalQuestions,
        correctAnswers,
        scorePercent,
        detailJson: JSON.stringify(detail),
        durationSeconds: dto.durationSeconds ?? null,
      }),
    );

    return { scorePercent, correctAnswers, totalQuestions, detail };
  }

  async getResultsByEvaluation(evaluationId: number): Promise<CandidateQuizResult[]> {
    return this.resultRepo.find({
      where: { evaluationId },
      order: { submittedAt: 'DESC' },
    });
  }

  async getResultByInvitation(invitationId: number): Promise<CandidateQuizResult | null> {
    return this.resultRepo.findOne({ where: { invitationId } });
  }

}