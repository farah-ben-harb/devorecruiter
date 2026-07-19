export function buildEvaluationNotificationEmail(params: {
  evaluationTitle: string;
  version: string;
  jobPostName: string;
  driveFileUrl: string;
  type: 'quiz' | 'kata';
  appUrl: string;
  jobPostId: number;
}): { subject: string; html: string } {
  const typeLabel = params.type === 'quiz' ? 'Quiz' : 'Kata (Coding Test)';
  const typeColor = params.type === 'quiz' ? '#4F46E5' : '#0891B2';
  const typeBadgeBg = params.type === 'quiz' ? '#EEF2FF' : '#ECFEFF';

  const subject = `Nouvelle évaluation technique à approuver — ${params.jobPostName} v${params.version}`;

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Nouvelle évaluation à approuver</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#E2001A;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">
                Nouvelle évaluation technique
              </h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">
                Une action de votre part est requise
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">

              <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
                Bonjour,
              </p>
              <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
                Une nouvelle évaluation technique vient d'être générée pour le poste
                <strong style="color:#111827;">${params.jobPostName}</strong>.
                En tant que <strong style="color:#111827;">référent technique</strong>, votre approbation est nécessaire avant qu'elle puisse être envoyée aux candidats.
              </p>

              <!-- Evaluation card -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;
                            background:${typeBadgeBg};color:${typeColor};letter-spacing:0.3px;text-transform:uppercase;">
                            ${typeLabel}
                          </span>
                        </td>
                        <td align="right">
                          <span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;
                            background:#FEF9C3;color:#854D0E;">
                            ⏳ En attente d'approbation
                          </span>
                        </td>
                      </tr>
                    </table>
                    <h2 style="margin:14px 0 4px;color:#111827;font-size:17px;font-weight:700;">
                      ${params.evaluationTitle}
                    </h2>
                    <p style="margin:0;color:#6B7280;font-size:13px;">
                      Version <strong>v${params.version}</strong> · Poste : ${params.jobPostName}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA buttons -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="padding-right:12px;">
                    <a href="${params.appUrl}/technical-evaluations?jobPostId=${params.jobPostId}"
                      style="display:inline-block;padding:12px 24px;background:#E2001A;color:#ffffff;
                        text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
                      ✓ Approuver / Rejeter
                    </a>
                  </td>
                  <td>
                    <a href="${params.driveFileUrl}"
                      style="display:inline-block;padding:12px 24px;background:#F9FAFB;color:#374151;
                        text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;
                        border:1px solid #E5E7EB;">
                      📄 Consulter le PDF
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#9CA3AF;font-size:13px;line-height:1.6;">
                Si vous n'êtes pas concerné par cette évaluation ou avez des questions, 
                contactez votre équipe RH.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#9CA3AF;font-size:12px;">
                Cet email est envoyé automatiquement — merci de ne pas y répondre directement.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return { subject, html };
}