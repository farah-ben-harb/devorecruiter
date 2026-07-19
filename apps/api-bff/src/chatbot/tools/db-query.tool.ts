import { DataSource, IsNull, Not } from 'typeorm';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { QueryFilters } from '../interfaces/tool-result.interface';

// ── Helpers Zod ───────────────────────────────────────────────────────────────
const nullableNumber = (defaultVal: number) =>
    z.union([z.number(), z.null(), z.string()])
        .optional()
        .transform(v => {
            if (v === null || v === undefined || v === '') return defaultVal;
            const n = Number(v);
            return isNaN(n) ? defaultVal : n;
        });
const nullableObject = () =>
    z.union([z.record(z.any()), z.null(), z.string()])
        .optional()
        .default({})
        .transform(v => {
            if (!v) return {};
            if (typeof v === 'string') {
                try { return JSON.parse(v); } catch { return {}; }
            }
            return v;
        });
const nullableArray = () =>
    z.union([z.array(z.string()), z.null(), z.string()])
        .optional()
        .transform(v => {
            if (!v) return undefined;
            if (typeof v === 'string') {
                try {
                    const parsed = JSON.parse(v);
                    return Array.isArray(parsed) ? parsed : undefined;
                } catch { return undefined; }
            }
            return v;
        });
function normalizeRecommendation(value: string): string {
    const map: Record<string, string> = {
        'retenir': 'retenir',
        'retenu': 'retenir',
        'accepte': 'retenir',
        'accepted': 'retenir',
        'accept': 'retenir',
        'ecarter': 'ecarter',
        'ecarte': 'ecarter',
        'rejete': 'ecarter',
        'rejected': 'ecarter',
        'reject': 'ecarter',
        'embaucher': 'hire',
        'hire': 'hire',
        'maybe': 'maybe',
        'rejeter': 'reject',
    };
    const normalized = value.toLowerCase()
        .normalize('NFD').replace(/\p{Diacritic}/gu, '');
    return map[normalized] ?? value;
}
function normalizeStatus(table: string, value: string): string {
    if (table === 'technical_evaluations') {
        const map: Record<string, string> = {
            'approuvé': 'approved', 'approved': 'approved',
            'rejeté': 'rejected', 'rejected': 'rejected',
            'complété': 'completed', 'completed': 'completed',
            'en cours': 'in_progress', 'in_progress': 'in_progress',
            'en attente': 'pending', 'pending': 'pending',
        };
        return map[value.toLowerCase()] ?? value;
    }
    if (table === 'invitations') {
        const map: Record<string, string> = {
            'envoyée': 'sent', 'envoyé': 'sent', 'sent': 'sent',
            'ouverte': 'opened', 'ouvert': 'opened', 'opened': 'opened',
            'soumise': 'submitted', 'soumis': 'submitted', 'submitted': 'submitted',
        };
        return map[value.toLowerCase()] ?? value;
    }
    if (table === 'candidates') {
        const map: Record<string, string> = {
            'traité': 'done', 'done': 'done',
            'en attente': 'pending', 'pending': 'pending',
            'en cours': 'processing', 'processing': 'processing',
            'erreur': 'error', 'error': 'error',
        };
        return map[value.toLowerCase()] ?? value;
    }
    return value;
}
// ─────────────────────────────────────────────────────────────────────────────
export function createDbQueryTool(dataSource: DataSource) {
    const simpleQueryTool = new DynamicStructuredTool({
        name: 'query_database',
        description: `
      Interroge UNE table de la base de données DevoRecruiter.
      Utilise pour : compter, lister, obtenir des stats sur une seule table.
      Tables disponibles :
        users, candidates, job_posts, job_offers,
        technical_evaluations, invitations, candidate_quiz_results,
        candidate_code_evaluations, resume_evaluation, job_post_evaluation
      IMPORTANT pour job_posts :
        - hasQcm est un flag indicatif NON fiable
        - Pour savoir quelles fiches ont de VRAIS QCM, utiliser query_database_joined job_posts_with_qcm
    `,
        schema: z.object({
            table: z.enum([
                'users', 'candidates', 'job_posts', 'job_offers',
                'technical_evaluations', 'invitations', 'candidate_quiz_results',
                'candidate_code_evaluations', 'resume_evaluation', 'job_post_evaluation','job_posts_with_technical_eval',
            ]),
            action: z.enum(['count', 'list', 'stats']),
            filters: nullableObject(),
            limit: nullableNumber(10),
            select: nullableArray(),
        }),
        func: async ({ table, action, filters, limit, select }) => {
            try {
                const repo = dataSource.getRepository(table);
                const safeLimit = limit ?? 10;
                const safeWhere: Record<string, any> = {};
                if (filters && typeof filters === 'object') {
                    for (const [key, val] of Object.entries(filters)) {
                        if (val === null || val === undefined) continue;
                        if (key === 'status') safeWhere[key] = normalizeStatus(table, String(val));
                        else if (key === 'recommendation') safeWhere[key] = normalizeRecommendation(String(val));
                        else safeWhere[key] = val;
                    }
                }
                if (action === 'count') {
                    const count = await repo.count({ where: safeWhere });
                    return JSON.stringify({ success: true, table, count, filters: safeWhere });
                }
                if (action === 'list') {
                    const items = await repo.find({
                        where: safeWhere,
                        take: safeLimit,
                        select: (select ?? undefined) as any,
                        order: { createdAt: 'DESC' } as any,
                    });
                    return JSON.stringify({ success: true, table, total: items.length, items });
                }
                if (action === 'stats') {
                    return JSON.stringify(await getTableStats(dataSource, table));
                }
                return JSON.stringify({ success: false, error: 'Action non reconnue' });
            } catch (err: any) {
                return JSON.stringify({ success: false, error: err.message });
            }
        },
    });
    // ── Tool 2 : Requêtes avec jointures ──────────────────────────────────────
    const joinQueryTool = new DynamicStructuredTool({
        name: 'query_database_joined',
        description: `
      Exécute des requêtes CROISÉES entre plusieurs tables de DevoRecruiter.
      Requêtes disponibles (query_type) :
      "candidates_with_invitations"
        → Candidats avec leurs invitations. Filtre: jobPostId, status
        → "à qui j'ai envoyé un test ?"
      "candidates_with_quiz_results"
        → Candidats avec scores QCM. Filtre: minScore, maxScore
        → "quels candidats ont un score > 80 ?"
      "candidates_with_code_evaluation"
        → Candidats avec évaluation de code. Filtre: recommendation (hire/maybe/reject)
        → "quels candidats recommandés pour l'embauche ?"
      "candidates_full_profile"
        → Profil complet d'UN candidat. Filtre OBLIGATOIRE: candidateId (UUID)
      "invitations_with_candidate_info"
        → Invitations avec nom/email candidat. Filtre: jobPostId, status
      "job_posts_with_evaluations_count"
        → Fiches de poste avec nombre d'évaluations et invitations.
        "job_posts_with_technical_eval"
    → Fiches de poste qui ont une évaluation technique générée (PAS un QCM).
    → quizContent IS NULL ET (htmlContent IS NOT NULL OR gitRepoUrl IS NOT NULL OR pdfUrl IS NOT NULL)
    → UTILISER CE QUERY TYPE pour "quelles fiches ont une évaluation technique ?"
      "job_posts_with_qcm"
        → Fiches de poste qui ont un QCM RÉELLEMENT GÉNÉRÉ (quizContent IS NOT NULL).
        → UTILISER CE QUERY TYPE pour "quelles fiches ont un QCM ?"
        → Ne pas confondre avec hasQcm=true qui signifie seulement que la fiche PEUT avoir un QCM.
      "conversion_funnel"
        → Taux de conversion invitations. Filtre: jobPostId
      "top_candidates_by_score"
        → Classement meilleurs candidats par score QCM + code.
      "candidates_with_score_filter"
        → Candidats filtrés par score QCM minimum. Filtre OBLIGATOIRE: minScore (0-100)
      "resume_evaluations_by_job_post"
        → CVs évalués pour une fiche SPECIFIQUE.
        → Filtres: company, jobTitle, ficheName, recommendation, jobPostId
        → "CVs non retenus pour BNP" → company:bnp, recommendation:ecarter
      "resume_evaluations_with_emails"
        → CVs évalués AVEC email candidat, sans filtre de fiche.
        → Filtre: recommendation (retenir ou ecarter)
    `,
        schema: z.object({
    query_type: z.enum([
        'candidates_with_invitations',
        'candidates_with_quiz_results',
        'candidates_with_code_evaluation',
        'candidates_full_profile',
        'invitations_with_candidate_info',
        'job_posts_with_evaluations_count',
        'job_posts_with_qcm',
        'conversion_funnel',
        'top_candidates_by_score',
        'candidates_with_score_filter',
        'resume_evaluations_by_job_post',
        'resume_evaluations_with_emails',
        'job_posts_with_technical_eval',
    ]),
    // ✅ z.any() — accepte undefined/null/absent sans erreur de validation
    filters: z.any().optional().transform((v: any) => {
        if (!v || v === null) return {};
        if (typeof v === 'string') {
            try { return JSON.parse(v); } catch { return {}; }
        }
        return typeof v === 'object' ? v : {};
    }),
}),
        func: async ({ query_type, filters }) => {
            try {
                const raw = (filters ?? {}) as Record<string, any>;
                const f: QueryFilters = {
                    candidateId: raw['candidateId'] ?? null,
                    jobPostId: raw['jobPostId'] != null ? Number(raw['jobPostId']) : null,
                    minScore: raw['minScore'] != null ? Number(raw['minScore']) : null,
                    maxScore: raw['maxScore'] != null ? Number(raw['maxScore']) : null,
                    status: raw['status'] ?? null,
                    recommendation: raw['recommendation'] != null
                        ? normalizeRecommendation(String(raw['recommendation'])) : null,
                    limit: raw['limit'] != null ? Number(raw['limit']) : 10,
                };
                const limit = f.limit ?? 10;
                switch (query_type) {
                    // ── Candidats + invitations ────────────────────────────────────
                    case 'candidates_with_invitations': {
                        const qb = dataSource.createQueryBuilder()
                            .select([
                                'c.id            AS "candidateId"',
                                'c.name          AS "nom"',
                                'c."firstName"   AS "prenom"',
                                'c.email         AS "email"',
                                'c.status        AS "cvStatus"',
                                'i.id            AS "invitationId"',
                                'i.status        AS "invitationStatus"',
                                'i."dueDate"     AS "dateLimit"',
                                'i."sentAt"      AS "envoyeeLe"',
                                'jp.name         AS "ficheDePoste"',
                                'jp.title        AS "titrePoste"',
                            ])
                            .from('candidates', 'c')
                            .innerJoin('invitations', 'i', 'i."candidateId" = c.id::text')
                            .innerJoin('job_posts', 'jp', 'jp.id = i."jobPostId"');
                        if (f.jobPostId != null) qb.where('i."jobPostId" = :jp', { jp: f.jobPostId });
                        if (f.status != null) qb.andWhere('i.status = :s', { s: normalizeStatus('invitations', f.status) });
                        qb.orderBy('i."sentAt"', 'DESC').limit(limit);
                        const rows = await qb.getRawMany();
                        return JSON.stringify({ success: true, query_type, total: rows.length, data: rows });
                    }
                    // ── Candidats + scores QCM ─────────────────────────────────────
                    case 'candidates_with_quiz_results': {
                        const qb = dataSource.createQueryBuilder()
                            .select([
                                'c.id                AS "candidateId"',
                                'c.name              AS "nom"',
                                'c."firstName"       AS "prenom"',
                                'c.email             AS "email"',
                                'qr."scorePercent"   AS "scoreQCM"',
                                'qr."correctAnswers" AS "bonnesReponses"',
                                'qr."totalQuestions" AS "totalQuestions"',
                                'qr.status           AS "statutQCM"',
                                'qr."submittedAt"    AS "soumisLe"',
                            ])
                            .from('candidates', 'c')
                            .innerJoin('candidate_quiz_results', 'qr', 'qr."candidateId" = c.id::text');
                        if (f.minScore != null) qb.where('qr."scorePercent" >= :min', { min: f.minScore });
                        if (f.maxScore != null) qb.andWhere('qr."scorePercent" <= :max', { max: f.maxScore });
                        qb.orderBy('qr."scorePercent"', 'DESC').limit(limit);
                        const rows = await qb.getRawMany();
                        return JSON.stringify({ success: true, query_type, total: rows.length, data: rows });
                    }
                    // ── Candidats + évaluation code ────────────────────────────────
                    case 'candidates_with_code_evaluation': {
                        const qb = dataSource.createQueryBuilder()
                            .select([
                                'c.id                  AS "candidateId"',
                                'c.name                AS "nom"',
                                'c."firstName"         AS "prenom"',
                                'c.email               AS "email"',
                                'ce."globalScore"      AS "scoreGlobal"',
                                'ce."technicalScore"   AS "scoreTechnique"',
                                'ce."qualityScore"     AS "scoreQualite"',
                                'ce.recommendation     AS "recommandation"',
                                'ce.feedback           AS "feedback"',
                                'ce."evaluatedAt"      AS "evalueLe"',
                            ])
                            .from('candidates', 'c')
                            .innerJoin('candidate_code_evaluations', 'ce', 'ce."candidateId" = c.id::text');
                        if (f.recommendation != null) qb.where('ce.recommendation = :r', { r: f.recommendation });
                        qb.orderBy('ce."globalScore"', 'DESC').limit(limit);
                        const rows = await qb.getRawMany();
                        return JSON.stringify({ success: true, query_type, total: rows.length, data: rows });
                    }
                    case 'job_posts_with_technical_eval': {
    const rows = await dataSource.createQueryBuilder()
        .select([
            'jp.id           AS "jobPostId"',
            'jp.name         AS "fichier"',
            'jp.title        AS "titre"',
            'jp.company      AS "entreprise"',
            'jp.status       AS "statutFiche"',
            'te.id           AS "evaluationId"',
            'te.status       AS "statutTest"',
            'te."gitRepoUrl" AS "gitRepo"',
            'te."pdfUrl"     AS "pdfUrl"',
        ])
        .from('job_posts', 'jp')
        .innerJoin(
            'technical_evaluations',
            'te',
            `te."jobPostId" = jp.id 
             AND te."quizContent" IS NULL 
             AND (
                 te."htmlContent" IS NOT NULL 
                 OR te."gitRepoUrl" IS NOT NULL 
                 OR te."pdfUrl"    IS NOT NULL
             )`,
        )
        .orderBy('jp.id', 'ASC')
        .getRawMany();
    return JSON.stringify({
        success: true,
        query_type,
        total: rows.length,
        note: 'Fiches avec une évaluation technique générée (quizContent IS NULL, pas un QCM)',
        data: rows,
    });
}
                    // ── Profil complet d'un candidat ───────────────────────────────
                    case 'candidates_full_profile': {
                        if (!f.candidateId) {
                            return JSON.stringify({ success: false, error: 'candidateId est obligatoire' });
                        }
                        const [candidate, invitations, quizResults, codeEval, resumeEvals] = await Promise.all([
                            dataSource.getRepository('candidates').findOne({ where: { id: f.candidateId } as any }),
                            dataSource.createQueryBuilder()
                                .select(['i.*', 'jp.name AS "ficheDePoste"', 'jp.title AS "titrePoste"'])
                                .from('invitations', 'i')
                                .leftJoin('job_posts', 'jp', 'jp.id = i."jobPostId"')
                                .where('i."candidateId" = :id', { id: f.candidateId })
                                .getRawMany(),
                            dataSource.getRepository('candidate_quiz_results')
                                .find({ where: { candidateId: f.candidateId } as any }),
                            dataSource.getRepository('candidate_code_evaluations')
                                .findOne({ where: { candidateId: f.candidateId } as any }),
                            dataSource.getRepository('resume_evaluation')
                                .find({ where: { resumeFileId: f.candidateId } as any }),
                        ]);
                        return JSON.stringify({
                            success: true, query_type,
                            data: { candidate, invitations, quizResults, codeEvaluation: codeEval, resumeEvaluations: resumeEvals },
                        });
                    }
                    // ── Invitations enrichies ──────────────────────────────────────
                    case 'invitations_with_candidate_info': {
                        const qb = dataSource.createQueryBuilder()
                            .select([
                                'i.id                    AS "invitationId"',
                                'i.status                AS "statut"',
                                'i."dueDate"             AS "dateLimit"',
                                'i."sentAt"              AS "envoyeeLe"',
                                'i."candidateName"       AS "nom"',
                                'i."candidateFirstName"  AS "prenom"',
                                'i."candidateEmail"      AS "email"',
                                'jp.name                 AS "ficheDePoste"',
                                'jp.title                AS "titrePoste"',
                                'jp.company              AS "entreprise"',
                            ])
                            .from('invitations', 'i')
                            .leftJoin('job_posts', 'jp', 'jp.id = i."jobPostId"');
                        if (f.jobPostId != null) qb.where('i."jobPostId" = :jp', { jp: f.jobPostId });
                        if (f.status != null) qb.andWhere('i.status = :s', { s: normalizeStatus('invitations', f.status) });
                        qb.orderBy('i."sentAt"', 'DESC').limit(limit);
                        const rows = await qb.getRawMany();
                        return JSON.stringify({ success: true, query_type, total: rows.length, data: rows });
                    }
                    // ── Fiches de poste avec compteurs ─────────────────────────────
                    case 'job_posts_with_evaluations_count': {
                        const rows = await dataSource.createQueryBuilder()
                            .select([
                                'jp.id                 AS "jobPostId"',
                                'jp.name               AS "nom"',
                                'jp.title              AS "titre"',
                                'jp.status             AS "statut"',
                                'jp.company            AS "entreprise"',
                                'COUNT(DISTINCT i.id)  AS "nbInvitations"',
                                'COUNT(DISTINCT te.id) AS "nbTests"',
                            ])
                            .from('job_posts', 'jp')
                            .leftJoin('invitations', 'i', 'i."jobPostId"  = jp.id')
                            .leftJoin('technical_evaluations', 'te', 'te."jobPostId" = jp.id')
                            .groupBy('jp.id')
                            .orderBy('"nbInvitations"', 'DESC')
                            .limit(limit)
                            .getRawMany();
                        return JSON.stringify({ success: true, query_type, total: rows.length, data: rows });
                    }
                    // ── Fiches de poste avec de VRAIS QCM ─────────────────────────
case 'job_posts_with_qcm': {
    try {
        const rows = await dataSource.createQueryBuilder()
            .select([
                'jp.id           AS "jobPostId"',
                'jp.name         AS "fichier"',
                'jp.title        AS "titre"',
                'jp.company      AS "entreprise"',
                'jp.status       AS "statutFiche"',
                'te.id           AS "evaluationId"',
                'te.status       AS "statutTest"',
            ])
            .from('job_posts', 'jp')
            .innerJoin(
                'technical_evaluations',
                'te',
                'te."jobPostId" = jp.id AND te."quizContent" IS NOT NULL',
            )
            .orderBy('jp.id', 'ASC')
            .getRawMany();
        return JSON.stringify({
            success: true,
            query_type,
            total: rows.length,
            note: 'Fiches avec un QCM réellement généré',
            data: rows,
        });
    } catch (innerErr: any) {
        // Log l'erreur SQL exacte
        console.error('job_posts_with_qcm ERROR:', innerErr.message);
        return JSON.stringify({ success: false, error: innerErr.message });
    }
}
                    // ── Funnel de conversion ───────────────────────────────────────
                    case 'conversion_funnel': {
                        const baseWhere = f.jobPostId != null ? { jobPostId: f.jobPostId } : {};
                        const [total, sent, opened, submitted] = await Promise.all([
                            dataSource.getRepository('invitations').count({ where: baseWhere as any }),
                            dataSource.getRepository('invitations').count({ where: { status: 'sent', ...baseWhere } as any }),
                            dataSource.getRepository('invitations').count({ where: { status: 'opened', ...baseWhere } as any }),
                            dataSource.getRepository('invitations').count({ where: { status: 'submitted', ...baseWhere } as any }),
                        ]);
                        const tauxOuverture = total > 0 ? Math.round(((opened + submitted) / total) * 100) : 0;
                        const tauxSoumission = total > 0 ? Math.round((submitted / total) * 100) : 0;
                        return JSON.stringify({
                            success: true, query_type,
                            jobPostId: f.jobPostId ?? 'tous les postes',
                            funnel: {
                                totalEnvoyees: total, enAttente: sent, ouvertes: opened, soumises: submitted,
                                tauxOuverture: `${tauxOuverture}%`, tauxSoumission: `${tauxSoumission}%`
                            },
                        });
                    }
                    // ── Top candidats par score ────────────────────────────────────
                    case 'top_candidates_by_score': {
                        const rows = await dataSource.createQueryBuilder()
                            .select([
                                'c.id                  AS "candidateId"',
                                'c.name                AS "nom"',
                                'c."firstName"         AS "prenom"',
                                'c.email               AS "email"',
                                'qr."scorePercent"     AS "scoreQCM"',
                                'ce."globalScore"      AS "scoreCode"',
                                'ce.recommendation     AS "recommandation"',
                                'COALESCE(qr."scorePercent", 0) + COALESCE(ce."globalScore", 0) AS "scoreCumule"',
                            ])
                            .from('candidates', 'c')
                            .leftJoin('candidate_quiz_results', 'qr', 'qr."candidateId" = c.id::text')
                            .leftJoin('candidate_code_evaluations', 'ce', 'ce."candidateId" = c.id::text')
                            .where('qr.id IS NOT NULL OR ce.id IS NOT NULL')
                            .orderBy('"scoreCumule"', 'DESC')
                            .limit(limit)
                            .getRawMany();
                        return JSON.stringify({ success: true, query_type, total: rows.length, data: rows });
                    }
                    // ── Candidats filtrés par score QCM ───────────────────────────
                    case 'candidates_with_score_filter': {
                        if (f.minScore == null) {
                            return JSON.stringify({ success: false, error: 'minScore est obligatoire' });
                        }
                        const rows = await dataSource.createQueryBuilder()
                            .select([
                                'c.id                AS "candidateId"',
                                'c.name              AS "nom"',
                                'c."firstName"       AS "prenom"',
                                'c.email             AS "email"',
                                'qr."scorePercent"   AS "scoreQCM"',
                                'qr."correctAnswers" AS "bonnesReponses"',
                                'qr."totalQuestions" AS "totalQuestions"',
                            ])
                            .from('candidates', 'c')
                            .innerJoin('candidate_quiz_results', 'qr', 'qr."candidateId" = c.id::text')
                            .where('qr."scorePercent" >= :min', { min: f.minScore })
                            .orderBy('qr."scorePercent"', 'DESC')
                            .limit(limit)
                            .getRawMany();
                        return JSON.stringify({ success: true, query_type, total: rows.length, minScore: f.minScore, data: rows });
                    }
                    // ── CVs évalués par fiche de poste spécifique ─────────────────
                    case 'resume_evaluations_by_job_post': {
                        const qb = dataSource.createQueryBuilder()
                            .select([
                                're.id                    AS "evaluationId"',
                                're."resumeName"          AS "nomCV"',
                                're."scoreGlobal"         AS "scoreGlobal"',
                                're.recommendation        AS "recommandation"',
                                're.status                AS "statut"',
                                're."jobPostId"           AS "jobPostId"',
                                'jp.name                  AS "ficheDePoste"',
                                'jp.title                 AS "titrePoste"',
                                'jp.company               AS "entreprise"',
                                'c.name                   AS "nomCandidat"',
                                'c."firstName"            AS "prenomCandidat"',
                                'c.email                  AS "emailCandidat"',
                            ])
                            .from('resume_evaluation', 're')
                            .leftJoin('job_posts', 'jp', 'jp.id = re."jobPostId"')
                            .leftJoin('candidates', 'c', 'c."brutDriveId" = re."resumeFileId"');
                        if (f.jobPostId != null) {
                            qb.where('re."jobPostId" = :jp', { jp: f.jobPostId });
                        }
                        const company = raw['company'];
                        if (company != null) {
                            const terms = String(company).toLowerCase().split(' ').filter((t: string) => t.length > 1);
                            terms.forEach((term: string, idx: number) => {
                                const key = `company${idx}`;
                                if (idx === 0 && f.jobPostId == null) qb.where(`LOWER(jp.company) LIKE :${key}`, { [key]: `%${term}%` });
                                else qb.andWhere(`LOWER(jp.company) LIKE :${key}`, { [key]: `%${term}%` });
                            });
                        }
                        const jobTitle = raw['jobTitle'];
                        if (jobTitle != null) {
                            String(jobTitle).toLowerCase().split(' ')
                                .filter((t: string) => t.length > 1)
                                .forEach((term: string, idx: number) => {
                                    const key = `title${idx}`;
                                    qb.andWhere(`LOWER(jp.title) LIKE :${key}`, { [key]: `%${term}%` });
                                });
                        }
                        const ficheName = raw['ficheName'];
                        if (ficheName != null) {
                            qb.andWhere('LOWER(jp.name) LIKE :ficheName', {
                                ficheName: `%${String(ficheName).toLowerCase()}%`
                            });
                        }
                        if (f.recommendation != null) {
                            qb.andWhere('re.recommendation = :r', { r: f.recommendation });
                        }
                        qb.orderBy('re."scoreGlobal"', 'DESC').limit(limit);
                        const rows = await qb.getRawMany();
                        return JSON.stringify({ success: true, query_type, total: rows.length, data: rows });
                    }
                    // ── CVs évalués avec email du candidat ────────────────────────
                    case 'resume_evaluations_with_emails': {
                        const qb = dataSource.createQueryBuilder()
                            .select([
                                're.id                AS "evaluationId"',
                                're."resumeName"      AS "nomCV"',
                                're."scoreGlobal"     AS "scoreGlobal"',
                                're.recommendation    AS "recommandation"',
                                're.status            AS "statut"',
                                'c.name               AS "nom"',
                                'c."firstName"        AS "prenom"',
                                'c.email              AS "email"',
                                'c."githubUsername"   AS "github"',
                            ])
                            .from('resume_evaluation', 're')
                            .leftJoin('candidates', 'c', 'c."brutDriveId" = re."resumeFileId"');
                        if (f.recommendation != null) {
                            qb.where('re.recommendation = :r', { r: f.recommendation });
                        }
                        qb.orderBy('re."scoreGlobal"', 'DESC').limit(limit);
                        const rows = await qb.getRawMany();
                        return JSON.stringify({ success: true, query_type, total: rows.length, data: rows });
                    }
                    default:
                        return JSON.stringify({ success: false, error: 'query_type non reconnu' });
                }
            } catch (err: any) {
                return JSON.stringify({ success: false, error: err.message });
            }
        },
    });
    return [simpleQueryTool, joinQueryTool];
}
// ── Stats détaillées par table ────────────────────────────────────────────────
async function getTableStats(dataSource: DataSource, table: string): Promise<object> {
    const repo = dataSource.getRepository(table);
    if (table === 'users') {
        const total = await repo.count();
        const active = await repo.count({ where: { isActivated: true } as any });
        return { success: true, table, total, active, inactive: total - active };
    }
    if (table === 'candidates') {
        const [total, done, pending, processing, error] = await Promise.all([
            repo.count(),
            repo.count({ where: { status: 'done' } as any }),
            repo.count({ where: { status: 'pending' } as any }),
            repo.count({ where: { status: 'processing' } as any }),
            repo.count({ where: { status: 'error' } as any }),
        ]);
        return { success: true, table, total, done, pending, processing, error };
    }
    if (table === 'job_posts') {
        const [total, raw, processing, unified, error] = await Promise.all([
            repo.count(),
            repo.count({ where: { status: 'raw' } as any }),
            repo.count({ where: { status: 'processing' } as any }),
            repo.count({ where: { status: 'unified' } as any }),
            repo.count({ where: { status: 'error' } as any }),
        ]);
        // ✅ FIX 3 : compter les vrais QCM via quizContent IS NOT NULL
        // et non via hasQcm = true qui est un flag non fiable
        const withRealQcm = await dataSource
            .createQueryBuilder()
            .select('COUNT(DISTINCT te."jobPostId")', 'count')
            .from('technical_evaluations', 'te')
            .where('te."quizContent" IS NOT NULL')
            .getRawOne();
        const withRealCoding = await dataSource
            .createQueryBuilder()
            .select('COUNT(DISTINCT te."jobPostId")', 'count')
            .from('technical_evaluations', 'te')
            .where('te."requiresCoding" = true')
            .getRawOne();
        return {
            success: true, table, total, raw, processing, unified, error,
            withQcm: parseInt(withRealQcm?.count ?? '0'),
            withCoding: parseInt(withRealCoding?.count ?? '0'),
            note: 'withQcm compté via quizContent IS NOT NULL (source fiable), withCoding via requiresCoding=true',
        };
    }
    if (table === 'technical_evaluations') {
        const [total, pending, inProgress, completed, approved, rejected] = await Promise.all([
            repo.count(),
            repo.count({ where: { status: 'pending' } as any }),
            repo.count({ where: { status: 'in_progress' } as any }),
            repo.count({ where: { status: 'completed' } as any }),
            repo.count({ where: { status: 'approved' } as any }),
            repo.count({ where: { status: 'rejected' } as any }),
        ]);
        // ✅ FIX 3 (bis) : même correction ici
        const withQcm = await repo.count({ where: { quizContent: Not(IsNull()) } as any });
        const withCoding = await repo.count({ where: { requiresCoding: true } as any });
        return { success: true, table, total, pending, inProgress, completed, approved, rejected, withQcm, withCoding };
    }
    if (table === 'invitations') {
        const [total, sent, opened, submitted] = await Promise.all([
            repo.count(),
            repo.count({ where: { status: 'sent' } as any }),
            repo.count({ where: { status: 'opened' } as any }),
            repo.count({ where: { status: 'submitted' } as any }),
        ]);
        const tauxSoumission = total > 0 ? Math.round((submitted / total) * 100) : 0;
        return { success: true, table, total, sent, opened, submitted, tauxSoumission: `${tauxSoumission}%` };
    }
    if (table === 'candidate_quiz_results') {
        const total = await repo.count();
        const avg = await dataSource.createQueryBuilder()
            .select('AVG(t."scorePercent")', 'avg')
            .from('candidate_quiz_results', 't')
            .getRawOne();
        return { success: true, table, total, scoreMoyen: Math.round(parseFloat(avg?.avg ?? '0')) };
    }
    if (table === 'candidate_code_evaluations') {
        const [total, hire, maybe, reject] = await Promise.all([
            repo.count(),
            repo.count({ where: { recommendation: 'hire' } as any }),
            repo.count({ where: { recommendation: 'maybe' } as any }),
            repo.count({ where: { recommendation: 'reject' } as any }),
        ]);
        const avgGlobal = await dataSource.createQueryBuilder()
            .select('AVG(t."globalScore")', 'avg')
            .from('candidate_code_evaluations', 't')
            .getRawOne();
        return {
            success: true, table, total, hire, maybe, reject,
            scoreMoyenGlobal: Math.round(parseFloat(avgGlobal?.avg ?? '0'))
        };
    }
    if (table === 'resume_evaluation') {
        const [total, accepted, rejected, match, noMatch] = await Promise.all([
            repo.count(),
            repo.count({ where: { recommendation: 'ACCEPTED' } as any }),
            repo.count({ where: { recommendation: 'REJECTED' } as any }),
            repo.count({ where: { status: 'MATCH' } as any }),
            repo.count({ where: { status: 'NO_MATCH' } as any }),
        ]);
        return {
            success: true, table, total,
            retenus: accepted, rejetes: rejected, match, noMatch,
            note: 'retenus=ACCEPTED, match=MATCH'
        };
    }
    if (table === 'job_post_evaluation') {
        const [total, pending, running, done, error] = await Promise.all([
            repo.count(),
            repo.count({ where: { status: 'pending' } as any }),
            repo.count({ where: { status: 'running' } as any }),
            repo.count({ where: { status: 'done' } as any }),
            repo.count({ where: { status: 'error' } as any }),
        ]);
        return { success: true, table, total, pending, running, done, error };
    }
    if (table === 'job_offers') {
        const total = await repo.count();
        const published = await repo.count({ where: { isPublished: true } as any });
        return { success: true, table, total, published, unpublished: total - published };
    }
    const total = await repo.count();
    return { success: true, table, total };
}
// ── Tool 3 : Recherche par nom ────────────────────────────────────────────────
export function createSearchTool(dataSource: DataSource) {
    return new DynamicStructuredTool({
        name: 'search_candidate_by_name',
        description: `
      Recherche un candidat par son nom ou prenom (partielle, insensible à la casse).
      name et firstName sont stockés séparément en base.
      Retourne : id, nom, prenom, email, statut, github.
    `,
        schema: z.object({
            search: z.string().describe('Prénom, nom ou partie du nom. Ex: "Wissem" ou "Salma Ben Romdhane"'),
        }),
        func: async ({ search }: { search: string }) => {
            try {
                const terms = search.trim().toLowerCase().split(' ').filter((t: string) => t.length > 1);
                if (terms.length === 0) {
                    return JSON.stringify({ success: false, error: 'Terme de recherche trop court' });
                }
                const qb = dataSource.createQueryBuilder()
                    .select([
                        'c.id               AS "id"',
                        'c.name             AS "nom"',
                        'c."firstName"      AS "prenom"',
                        'c.email            AS "email"',
                        'c.status           AS "statut"',
                        'c."githubUsername" AS "github"',
                    ])
                    .from('candidates', 'c');
                const params: Record<string, string> = {};
                const conditions: string[] = [];
                terms.forEach((term: string, idx: number) => {
                    const key = `term${idx}`;
                    params[key] = `%${term}%`;
                    conditions.push(`(LOWER(c.name) LIKE :${key} OR LOWER(c."firstName") LIKE :${key})`);
                });
                qb.where(conditions.join(' OR '), params).limit(10);
                const rows = await qb.getRawMany();
                if (rows.length === 0) {
                    return JSON.stringify({ success: true, total: 0, message: `Aucun candidat trouvé pour "${search}"` });
                }
                return JSON.stringify({ success: true, total: rows.length, data: rows });
            } catch (err: any) {
                return JSON.stringify({ success: false, error: err.message });
            }
        },
    });
}