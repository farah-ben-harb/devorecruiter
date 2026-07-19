export interface QuizQuestion {
  id: number;
  question: string;
  type: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  domain: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface QuizQuestionPublic {
  id: number;
  question: string;
  type: string;
  options: string[];
  domain: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface QuizAnswerKey {
  id: number;
  question: string;
  correct_answer: string;
  explanation: string;
  domain: string;
  difficulty: string;
}

export interface QuizData {
  name: string;
  title: string;
  description: string;
  duration_minutes: number;
  questions: QuizQuestion[];
}

export function buildQuizPdfTemplate(
  title: string,
  description: string,
  questions: QuizQuestion[],
  version: string,
): string {
  const questionsHtml = questions
    .map(
      (q, i) => `
    <div class="question-block">
      <div class="question-header">
        <span class="question-number">Q${i + 1}</span>
        <span class="difficulty difficulty-${q.difficulty}">${q.difficulty.toUpperCase()}</span>
        <span class="domain-tag">${q.domain}</span>
      </div>
      <p class="question-text">${q.question}</p>
      <ul class="options">
        ${q.options
          .map(
            (opt, idx) => `
          <li class="option">
            <span class="option-letter">${String.fromCharCode(65 + idx)}</span>
            ${opt}
          </li>`,
          )
          .join('')}
      </ul>
    </div>`,
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Segoe UI',Arial,sans-serif; background:white; color:#1f2937; padding:40px 48px; }
    .header { background:linear-gradient(135deg,#E2001A 0%,#b0000f 100%); padding:40px 48px; border-radius:16px; margin-bottom:24px; }
    .header-label { font-size:11px; font-weight:600; letter-spacing:2px; text-transform:uppercase; color:rgba(255,255,255,0.65); margin-bottom:10px; }
    .header h1 { font-size:22px; font-weight:700; color:white; margin-bottom:10px; }
    .header p { font-size:13px; color:rgba(255,255,255,0.8); margin-bottom:16px; }
    .badge { display:inline-flex; align-items:center; gap:6px; background:rgba(255,255,255,0.18); border:1px solid rgba(255,255,255,0.25); color:white; padding:5px 14px; border-radius:999px; font-size:12px; margin-right:8px; }
    .question-block { background:#f9fafb; border:1px solid #e5e7eb; border-radius:12px; padding:20px 24px; margin-bottom:16px; }
    .question-header { display:flex; align-items:center; gap:10px; margin-bottom:12px; }
    .question-number { background:#E2001A; color:white; font-size:11px; font-weight:700; padding:3px 10px; border-radius:999px; }
    .difficulty { font-size:10px; font-weight:600; padding:3px 8px; border-radius:999px; text-transform:uppercase; }
    .difficulty-easy { background:#d1fae5; color:#065f46; }
    .difficulty-medium { background:#fef3c7; color:#92400e; }
    .difficulty-hard { background:#fee2e2; color:#991b1b; }
    .domain-tag { font-size:11px; color:#6b7280; background:#f3f4f6; padding:3px 10px; border-radius:999px; border:1px solid #e5e7eb; }
    .question-text { font-size:13.5px; font-weight:600; color:#111827; margin-bottom:14px; line-height:1.6; }
    .options { list-style:none; display:flex; flex-direction:column; gap:8px; }
    .option { display:flex; align-items:center; gap:10px; font-size:13px; color:#374151; background:white; border:1px solid #e5e7eb; border-radius:8px; padding:9px 14px; }
    .option-letter { background:#f3f4f6; color:#6b7280; font-size:11px; font-weight:700; width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .footer { text-align:center; margin-top:28px; padding:18px 0; font-size:12px; color:#9ca3af; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-label">Quiz d'Évaluation</div>
    <h1>${title}</h1>
    <p>${description}</p>
    <span class="badge">Version ${version}</span>
    <span class="badge">❓ ${questions.length} questions</span>
    <span class="badge">⏱️ ${questions.length <= 10 ? 20 : 30} min</span>
  </div>
  ${questionsHtml}
  <div class="footer">🍀 Bonne chance !</div>
</body>
</html>`;
}