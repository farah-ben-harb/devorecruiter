import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiExtraModels,
} from '@nestjs/swagger';
import { CandidateQuizService } from '../../services/candidate-quiz/candidate-quiz.service';
import { SubmitQuizDto } from '../../dtos/candidate-quiz/candidate-quiz.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';

@ApiTags('🎯 Candidate Quiz')
@Controller('quiz')
export class CandidateQuizController {
  constructor(private readonly quizService: CandidateQuizService) {}

  // ── ROUTES PUBLIQUES (pas d'auth — accès par token sécurisé) ─────────────

  @Get(':token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Récupérer le quiz via token (public)',
    description: `
Route publique accessible via le lien envoyé par email au candidat.  
Retourne les questions **sans** les bonnes réponses.  
Vérifie que :
- Le token est valide
- La date limite n'est pas dépassée
- Le candidat n'a pas déjà soumis ce quiz
    `.trim(),
  })
  @ApiParam({
    name: 'token',
    description: 'Token unique sécurisé inclus dans le lien email du candidat',
    example: 'quiz-token-example',
  })
  @ApiResponse({
    status: 200,
    description: 'Quiz retourné avec succès — questions sans bonnes réponses',
    schema: {
      example: {
        invitationId: 10,
        evaluationId: 5,
        candidateFirstName: 'Alice',
        candidateName: 'Dupont',
        title: '🚀 Quiz NestJS Senior Developer v1.0.0',
        description: 'Évaluation des compétences NestJS et architecture backend',
        durationMinutes: 30,
        dueDate: '2025-02-01',
        questions: [
          {
            id: 1,
            question: "Quelle décorateur NestJS permet d'injecter un service ?",
            type: 'single_choice',
            options: ['@Inject()', '@Injectable()', '@Module()', '@Controller()'],
            domain: 'NestJS',
            difficulty: 'easy',
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Quiz déjà soumis ou date limite dépassée' })
  @ApiResponse({ status: 404, description: 'Token invalide ou expiré' })
  getQuiz(@Param('token') token: string) {
    return this.quizService.getQuizByToken(token);
  }

  @Post(':token/submit')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Soumettre les réponses du quiz (public)',
    description: `
Route publique — le candidat soumet ses réponses via le lien token.  
Le service :
1. Corrige via le corrigé privé (\`quizAnswerKey\`) stocké en DB
2. Génère un feedback IA via OpenRouter
3. Sauvegarde le résultat dans \`CandidateQuizResult\`
4. Retourne le score + feedback immédiatement au candidat
    `.trim(),
  })
  @ApiParam({
    name: 'token',
    description: 'Token unique sécurisé inclus dans le lien email du candidat',
    example: 'quiz-token-example',
  })
  @ApiBody({ type: SubmitQuizDto })
  @ApiResponse({
    status: 201,
    description: 'Quiz soumis — score et feedback IA retournés',
    schema: {
      example: {
        scorePercent: 73,
        correctAnswers: 11,
        totalQuestions: 15,
        detail: [
          {
            questionId: 1,
            question: "Quelle décorateur NestJS permet d'injecter un service ?",
            yourAnswer: '@Injectable()',
            correctAnswer: '@Injectable()',
            isCorrect: true,
            explanation: '@Injectable() marque une classe comme injectable dans le conteneur IoC de NestJS.',
          },
        ],
        aiFeedback: {
          globalScore: 73,
          recommendation: 'hire',
          globalFeedback: 'Très bon niveau global. Bonne maîtrise de NestJS et TypeORM.',
          strengths: ['Solide en NestJS', 'Bonne compréhension des guards'],
          weaknesses: ['Notions de microservices à approfondir'],
          domainAnalysis: [
            { domain: 'NestJS', mastery: 'strong', comment: 'Très bonne maîtrise du framework' },
          ],
          interviewRecommendations: [
            'Comment gérez-vous les transactions avec TypeORM ?',
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Quiz déjà soumis ou date limite dépassée' })
  @ApiResponse({ status: 404, description: 'Token invalide ou corrigé introuvable' })
  submitQuiz(@Param('token') token: string, @Body() dto: SubmitQuizDto) {
    return this.quizService.submitQuiz(token, dto);
  }

  // ── ROUTES PRIVÉES (RH — JWT requis) ────────────────────────────────────

  @Get('results/evaluation/:evaluationId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN_RH, UserRole.TALENT_ACQUISITION, UserRole.TECHNICAL_REFERENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Tous les résultats pour une évaluation (RH)',
    description: 'Retourne la liste des résultats de tous les candidats qui ont soumis ce quiz, triés du plus récent au plus ancien.',
  })
  @ApiParam({
    name: 'evaluationId',
    description: 'ID de l\'évaluation quiz',
    example: 5,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des résultats candidats pour cette évaluation',
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Rôle insuffisant' })
  getResultsByEvaluation(@Param('evaluationId', ParseIntPipe) evaluationId: number) {
    return this.quizService.getResultsByEvaluation(evaluationId);
  }

  @Get('results/invitation/:invitationId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN_RH, UserRole.TALENT_ACQUISITION, UserRole.TECHNICAL_REFERENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Résultat d\'un candidat pour une invitation (RH)',
    description: 'Retourne le résultat quiz d\'un candidat spécifique via l\'ID de son invitation. Retourne null si le candidat n\'a pas encore soumis.',
  })
  @ApiParam({
    name: 'invitationId',
    description: 'ID de l\'invitation du candidat',
    example: 10,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Résultat trouvé (ou null si non soumis)',
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Rôle insuffisant' })
  getResultByInvitation(@Param('invitationId', ParseIntPipe) invitationId: number) {
    return this.quizService.getResultByInvitation(invitationId);
  }
}
