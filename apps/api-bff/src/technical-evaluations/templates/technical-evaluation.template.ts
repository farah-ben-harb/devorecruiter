export function buildPdfTemplate(
  title: string,
  bodyHtml: string,
  version: string,
): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background: white;
      color: #1f2937;
      padding: 40px 48px;
    }

    .header {
      background: linear-gradient(135deg, #E2001A 0%, #b0000f 100%);
      padding: 48px 52px 40px;
      border-radius: 16px;
      position: relative;
      overflow: hidden;
      margin-bottom: 20px;
    }

    .header::before {
      content: '';
      position: absolute;
      top: -60px; right: -60px;
      width: 220px; height: 220px;
      background: rgba(255,255,255,0.06);
      border-radius: 50%;
    }

    .header::after {
      content: '';
      position: absolute;
      bottom: -40px; left: -40px;
      width: 160px; height: 160px;
      background: rgba(255,255,255,0.04);
      border-radius: 50%;
    }

    .header-label {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: rgba(255,255,255,0.65);
      margin-bottom: 14px;
    }

    .header h1 {
      font-size: 24px;
      font-weight: 700;
      color: white;
      line-height: 1.35;
      margin-bottom: 20px;
      position: relative;
      z-index: 1;
    }

    .header-meta {
      display: flex;
      align-items: center;
      gap: 10px;
      position: relative;
      z-index: 1;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255,255,255,0.18);
      border: 1px solid rgba(255,255,255,0.25);
      color: white;
      padding: 5px 14px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 500;
    }

    .badge-dot {
      width: 6px; height: 6px;
      background: #fff;
      border-radius: 50%;
      opacity: 0.8;
    }

    .section {
      margin-bottom: 16px;
    }

    h2 {
      font-size: 15px;
      font-weight: 700;
      color: #111827;
      margin-top: 24px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    h2::before {
      content: '';
      display: inline-block;
      width: 4px; height: 16px;
      background: #E2001A;
      border-radius: 4px;
      flex-shrink: 0;
    }

    h3 {
      font-size: 13.5px;
      font-weight: 600;
      color: #374151;
      margin-top: 16px;
      margin-bottom: 8px;
      padding-left: 12px;
      border-left: 2px solid #e5e7eb;
    }

    p {
      font-size: 13px;
      line-height: 1.85;
      color: #4b5563;
      margin-bottom: 10px;
    }

    ul {
      margin: 8px 0 12px 20px;
    }

    li {
      font-size: 13px;
      line-height: 1.75;
      color: #4b5563;
      margin-bottom: 5px;
    }

    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin: 12px 0;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid #e5e7eb;
      font-size: 12.5px;
    }

    th {
      background: #1f2937;
      color: white;
      padding: 11px 15px;
      text-align: left;
      font-weight: 600;
      font-size: 11.5px;
      letter-spacing: 0.3px;
    }

    td {
      padding: 10px 15px;
      border-top: 1px solid #f0f2f5;
      color: #374151;
    }

    tr:nth-child(even) td { background: #f9fafb; }

    blockquote {
      background: #fff5f5;
      border-left: 4px solid #E2001A;
      padding: 12px 16px;
      margin: 12px 0;
      border-radius: 0 10px 10px 0;
      font-size: 12.5px;
      color: #4b5563;
    }

    code {
      background: #1f2937;
      color: #f3f4f6;
      padding: 2px 7px;
      border-radius: 5px;
      font-family: monospace;
      font-size: 12px;
    }

    strong { color: #111827; font-weight: 600; }

    hr {
      margin: 20px 0;
      border: none;
      border-top: 1px solid #e5e7eb;
    }

    .footer {
      text-align: center;
      margin-top: 28px;
      padding: 18px 0;
      font-size: 12px;
      color: #9ca3af;
      letter-spacing: 0.3px;
    }
  </style>
</head>
<body>

  <div class="header">
    <div class="header-label">Évaluation Technique</div>
    <h1>${title}</h1>
    <div class="header-meta">
      <span class="badge"><span class="badge-dot"></span>Version ${version}</span>
    </div>
  </div>

  <div class="card">
    ${bodyHtml}
  </div>

  <div class="footer">
    🍀 Bonne chance et continuez à progresser !
  </div>

</body>
</html>
    `;
}
