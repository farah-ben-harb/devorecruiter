export function buildGeneratePrompt(jobPostContent: string): string {
  return `
Tu es un expert technique RH. À partir de la fiche de poste ci-dessous, tu dois générer un sujet de coding kata.

Fiche de poste :
${jobPostContent}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RÈGLE FONDAMENTALE — LIS ATTENTIVEMENT AVANT DE GÉNÉRER :

1. IDENTIFIE uniquement les compétences techniques demandées dans la fiche
   (frameworks, langages, outils, pratiques — ex: PySpark, Databricks, Azure, Delta Lake, Kafka...).

2. INVENTE un contexte métier fictif COMPLÈTEMENT DIFFÉRENT de celui de l'entreprise
   (si la fiche parle d'assurance → choisis e-commerce, logistique, sport, santé, transport, etc.)
   Le candidat ne doit PAS avoir l'impression de travailler pour l'entreprise citée dans la fiche.

3. Le kata doit tester les compétences techniques identifiées à l'étape 1,
   appliquées au contexte fictif inventé à l'étape 2.

4. NE JAMAIS copier-coller des éléments de la mission ou du contexte de l'entreprise.
   NE JAMAIS mentionner l'entreprise, ses produits ou ses clients dans le kata.

Exemples de transformation correcte :
  ❌ "Concevoir un pipeline d'ingestion pour les données actuarielles d'AXA avec PySpark"
  ✅ "Concevoir un pipeline PySpark pour ingérer les données de commandes d'une plateforme e-commerce"

  ❌ "Analyser les données de fraude d'assurance avec Databricks"
  ✅ "Analyser les logs de transactions d'une application de streaming musical avec Databricks"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tu DOIS générer du HTML pur (sans balises <html>, <head>, <body>, <style>) EN FRANÇAIS
en respectant EXACTEMENT cette structure :

<h1>[Titre créatif du Kata avec emoji 🚀 — domaine fictif choisi, PAS le domaine de l'entreprise]</h1>

<div class="section">
  <h2>🎯 Contexte</h2>
  <p>[Description d'une entreprise fictive dans le domaine choisi — jamais l'entreprise de la fiche.
     Explique le problème data à résoudre dans ce contexte fictif.]</p>
</div>

<div class="section">
  <h2>📋 Instructions</h2>
  <p>Développez un MVP simplifié avec 2 user stories. Des fonctionnalités bonus sont disponibles pour mettre en valeur des compétences supplémentaires.</p>

  <h3>⚙️ Contraintes</h3>
  <table>
    <tr><th>Aspect</th><th>Détail</th></tr>
    <tr><td><strong>⏱️ Durée recommandée</strong></td><td>2-3 heures (MVP de base, hors bonus)</td></tr>
    <tr><td><strong>🛠️ Stack technique</strong></td><td>[Les outils/frameworks extraits de la fiche — ex: PySpark, Databricks, Azure]</td></tr>
    <tr><td><strong>📦 Installation</strong></td><td>Installation et configuration faciles</td></tr>
    <tr><td><strong>✍️ Authenticité</strong></td><td>Tout le code doit être votre propre travail</td></tr>
    <tr><td><strong>💻 Démo en direct</strong></td><td>Projet fonctionnel en local pour l'entretien</td></tr>
  </table>

  <blockquote><strong>📌 Note :</strong> La stack technique doit correspondre aux compétences requises dans la fiche de poste.</blockquote>

  <h3>📦 Livrables</h3>
  <p>Le code doit être disponible dans ce dépôt GitLab.</p>
  <p>Une fois terminé, informez-nous de la complétion de l'exercice via ce formulaire Google.</p>

  <h3>🏆 Critères d'évaluation</h3>
  <table>
    <tr><th>Critère</th><th>Description</th></tr>
    <tr><td><strong>✅ Fonctionnalité</strong></td><td>Répond aux user stories de base</td></tr>
    <tr><td><strong>🧹 Qualité du code</strong></td><td>Bonnes pratiques, architecture robuste, typage</td></tr>
    <tr><td><strong>⚡ Maîtrise technique</strong></td><td>Utilisation efficace de la stack, optimisation des traitements</td></tr>
    <tr><td><strong>🧠 Compréhension</strong></td><td>Capacité à expliquer tous les aspects du code en entretien</td></tr>
    <tr><td><strong>🔀 Processus de développement</strong></td><td>Historique de commits clair et logique</td></tr>
    <tr><td><strong>📝 Documentation</strong></td><td>README.md avec installation, fonctionnalités, architecture</td></tr>
  </table>
</div>

<div class="section">
  <h2>🔍 Détails du défi</h2>

  <h3>👤 User Story 1 : [Titre US1 — action technique dans le contexte fictif]</h3>
  <ul>
    <li>[En tant que data engineer sur la plateforme fictive, je dois... — décrit une tâche technique concrète]</li>
    <li>[Critères d'acceptation mesurables et précis]</li>
  </ul>

  <h3>👤 User Story 2 : [Titre US2 — action technique dans le contexte fictif]</h3>
  <ul>
    <li>[En tant que data engineer sur la plateforme fictive, je dois... — décrit une tâche technique concrète]</li>
    <li>[Critères d'acceptation mesurables et précis]</li>
  </ul>
</div>

<div class="section">
  <h2>⭐ Fonctionnalités Bonus (Optionnel)</h2>
  <ul>
    <li>🎁 [Bonus 1 — compétence avancée de la fiche appliquée au contexte fictif]</li>
    <li>🎁 [Bonus 2 — compétence avancée de la fiche appliquée au contexte fictif]</li>
    <li>🎁 [Bonus 3 — compétence avancée de la fiche appliquée au contexte fictif]</li>
    <li>🎁 [Bonus 4 — compétence avancée de la fiche appliquée au contexte fictif]</li>
  </ul>
</div>

<div class="section">
  <h2>💡 Conseils</h2>
  <table>
    <tr><th>Domaine</th><th>Détails</th></tr>
    <tr><td><strong>🛠️ Développement</strong></td><td>[Conseils techniques spécifiques à la stack identifiée dans la fiche]</td></tr>
    <tr><td><strong>📖 Code & Documentation</strong></td><td>[Conseils de documentation adaptés au type de projet]</td></tr>
    <tr><td><strong>🎤 Préparation à l'entretien</strong></td><td>[Points clés à préparer selon les compétences de la fiche]</td></tr>
    <tr><td><strong>🌟 Mise en valeur des compétences</strong></td><td>[Compétences prioritaires à démontrer selon la fiche]</td></tr>
  </table>
</div>

IMPORTANT :
- Le contexte métier doit être 100% fictif et différent du secteur de l'entreprise dans la fiche
- Les compétences techniques testées doivent correspondre exactement à celles listées dans la fiche
- Change le domaine fictif à chaque génération (e-commerce, transport, santé, sport, agriculture, énergie...)
- Garde EXACTEMENT la structure HTML ci-dessus
- Utilise des emojis partout pour rendre le document vivant
- Réponds en HTML uniquement, rien d'autre, pas de balises \`\`\`html
  `;
}

export function buildRegeneratePrompt(
  jobPostContent: string,
  hrInstructions: string,
): string {
  return `
Tu es un expert technique RH. Tu dois modifier une évaluation technique existante selon les instructions du RH.

Fiche de poste (pour référence des compétences techniques uniquement) :
${jobPostContent}

Instructions de modification du RH :
${hrInstructions}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RÈGLE FONDAMENTALE :
- Utilise les compétences techniques de la fiche UNIQUEMENT pour définir la stack à tester.
- Le contexte métier doit rester fictif et différent du secteur de l'entreprise de la fiche.
- Applique TOUTES les modifications demandées par le RH dans ses instructions.
- Si le RH ne précise pas de nouveau contexte, garde le même domaine fictif ou choisis-en un nouveau.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tu DOIS générer du HTML pur (sans balises <html>, <head>, <body>, <style>) EN FRANÇAIS
en respectant EXACTEMENT cette structure :

<h1>[Titre créatif du Kata avec emoji 🚀 — contexte fictif, pas celui de l'entreprise]</h1>

<div class="section">
  <h2>🎯 Contexte</h2>
  <p>[Contexte fictif adapté selon les modifications demandées]</p>
</div>

<div class="section">
  <h2>📋 Instructions</h2>
  <p>Développez un MVP simplifié avec 2 user stories.</p>

  <h3>⚙️ Contraintes</h3>
  <table>
    <tr><th>Aspect</th><th>Détail</th></tr>
    <tr><td><strong>⏱️ Durée recommandée</strong></td><td>2-3 heures (MVP de base, hors bonus)</td></tr>
    <tr><td><strong>🛠️ Stack technique</strong></td><td>[Stack extraite de la fiche, adaptée si le RH l'a modifiée]</td></tr>
    <tr><td><strong>📦 Installation</strong></td><td>Installation et configuration faciles</td></tr>
    <tr><td><strong>✍️ Authenticité</strong></td><td>Tout le code doit être votre propre travail</td></tr>
    <tr><td><strong>💻 Démo en direct</strong></td><td>Projet fonctionnel en local pour l'entretien</td></tr>
  </table>

  <blockquote><strong>📌 Note :</strong> La stack technique doit correspondre aux compétences requises dans la fiche de poste.</blockquote>

  <h3>📦 Livrables</h3>
  <p>Le code doit être disponible dans ce dépôt GitLab.</p>
  <p>Une fois terminé, informez-nous de la complétion de l'exercice via ce formulaire Google.</p>

  <h3>🏆 Critères d'évaluation</h3>
  <table>
    <tr><th>Critère</th><th>Description</th></tr>
    <tr><td><strong>✅ Fonctionnalité</strong></td><td>Répond aux user stories de base</td></tr>
    <tr><td><strong>🧹 Qualité du code</strong></td><td>Bonnes pratiques, architecture robuste, typage</td></tr>
    <tr><td><strong>⚡ Maîtrise technique</strong></td><td>Utilisation efficace de la stack, optimisation des traitements</td></tr>
    <tr><td><strong>🧠 Compréhension</strong></td><td>Capacité à expliquer tous les aspects du code en entretien</td></tr>
    <tr><td><strong>🔀 Processus de développement</strong></td><td>Historique de commits clair et logique</td></tr>
    <tr><td><strong>📝 Documentation</strong></td><td>README.md avec installation, fonctionnalités, architecture</td></tr>
  </table>
</div>

<div class="section">
  <h2>🔍 Détails du défi</h2>

  <h3>👤 User Story 1 : [Titre US1 adapté selon les modifications]</h3>
  <ul>
    <li>[Description technique dans le contexte fictif]</li>
    <li>[Critères d'acceptation précis]</li>
  </ul>

  <h3>👤 User Story 2 : [Titre US2 adapté selon les modifications]</h3>
  <ul>
    <li>[Description technique dans le contexte fictif]</li>
    <li>[Critères d'acceptation précis]</li>
  </ul>
</div>

<div class="section">
  <h2>⭐ Fonctionnalités Bonus (Optionnel)</h2>
  <ul>
    <li>🎁 [Bonus 1]</li>
    <li>🎁 [Bonus 2]</li>
    <li>🎁 [Bonus 3]</li>
  </ul>
</div>

<div class="section">
  <h2>💡 Conseils</h2>
  <table>
    <tr><th>Domaine</th><th>Détails</th></tr>
    <tr><td><strong>🛠️ Développement</strong></td><td>[Conseils techniques adaptés]</td></tr>
    <tr><td><strong>📖 Code & Documentation</strong></td><td>[Conseils documentation]</td></tr>
    <tr><td><strong>🎤 Préparation à l'entretien</strong></td><td>[Conseils entretien selon la fiche]</td></tr>
    <tr><td><strong>🌟 Mise en valeur des compétences</strong></td><td>[Compétences prioritaires selon la fiche]</td></tr>
  </table>
</div>

IMPORTANT :
- Applique TOUTES les modifications demandées par le RH
- Le contexte métier reste fictif, jamais celui de l'entreprise de la fiche
- Garde EXACTEMENT la structure HTML ci-dessus
- Utilise des emojis partout
- Réponds en HTML uniquement, rien d'autre, pas de balises \`\`\`html
  `;
}


export function extractNameFromHtml(html: string): string | null {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!match) return null;
  return match[1].replace(/<[^>]+>/g, '').trim() || null;
}