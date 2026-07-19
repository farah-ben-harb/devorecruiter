export function buildQuizPrompt(jobPostContent: string): string {
  return `
Tu es un expert technique RH. À partir de la fiche de poste ci-dessous, génère un quiz d'évaluation technique.

Fiche de poste :
${jobPostContent}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RÈGLE FONDAMENTALE — LIS ATTENTIVEMENT AVANT DE GÉNÉRER :

1. IDENTIFIE les compétences techniques listées dans la fiche
   (frameworks, langages, outils, concepts — ex: PySpark, Databricks, Delta Lake, Kafka, Azure...).

2. Les questions doivent tester la MAÎTRISE TECHNIQUE de ces compétences.
   Elles sont universelles, indépendantes de l'entreprise et de son secteur.

3. NE JAMAIS générer de questions sur :
   - Le contexte ou le secteur de l'entreprise (ex: assurance, banque, santé...)
   - L'organisation interne de l'entreprise
   - Des scénarios propres au métier de l'entreprise (ex: "dans le contexte actuariel...")

4. Les questions doivent avoir UNE seule bonne réponse objective et vérifiable.
   Les 3 mauvaises options doivent être plausibles mais clairement incorrectes.

Exemples de questions CORRECTES pour une fiche PySpark/Databricks :
  ✅ "Quelle méthode PySpark permet de repartitionner un DataFrame pour optimiser les performances ?"
  ✅ "Quel est l'avantage principal du format Delta Lake par rapport à Parquet classique ?"
  ✅ "Comment fonctionne le mécanisme de checkpointing dans Spark Structured Streaming ?"

Exemples de questions INCORRECTES :
  ❌ "Quelle est la stratégie data d'AXA pour 2026 ?"
  ❌ "Dans le contexte assurantiel, comment modéliser un risque actuariel avec PySpark ?"
  ❌ "Quel outil AXA utilise-t-il pour la gouvernance des données ?"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RÈGLE POUR LE TITRE :
- Le titre doit être EXACTEMENT 3 à 4 mots, ni plus ni moins.
- Pas de slogan, pas de question, pas de tiret, pas de sous-titre.
- Un emoji en début, suivi du domaine technique principal et du niveau.
- NE PAS énumérer les outils ou frameworks.

Exemples de titres CORRECTS :
  ✅ "🚀 Data Engineering Sénior"
  ✅ "⚡ Quiz Backend Cloud"
  ✅ "🧠 Quiz DevOps Avancé"
  ✅ "💡 Quiz Frontend React"
  ✅ "🔥 Data Engineer Quiz"

Exemples de titres INCORRECTS :
  ❌ "Backend Senior — Êtes-vous au niveau ?"
  ❌ "Quiz Go, gRPC, Kubernetes, Azure"
  ❌ "Évaluation technique Data Engineering"
  ❌ "🔥 Backend Senior — Passez à l'étape suivante"

Retourne UNIQUEMENT un JSON valide, sans markdown, sans explication, avec cette structure exacte :
{
  "title": "Titre court et accrocheur — 3 à 6 mots, PAS une liste de technologies",
  "description": "Courte description des compétences techniques évaluées (2 lignes max, sans mentionner l'entreprise)",
  "duration_minutes": 30,
  "questions": [
    {
      "id": 1,
      "question": "Question technique précise et objective",
      "type": "single_choice",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option A",
      "explanation": "Explication technique concise de la bonne réponse",
      "domain": "Nom de la compétence évaluée (ex: PySpark, Delta Lake, Azure...)",
      "difficulty": "easy"
    }
  ]
}

Règles de génération :
- Génère exactement 15 questions couvrant les compétences techniques de la fiche
- Répartis la difficulté : 5 easy, 7 medium, 3 hard
- Tous les types "single_choice" avec exactement 4 options
- correct_answer doit être EXACTEMENT une des 4 options (copie mot pour mot)
- Le champ "domain" identifie la compétence spécifique testée par la question
- Les 3 options incorrectes doivent être techniquement plausibles (pas d'options absurdes)
- Couvre au minimum 5 compétences différentes listées dans la fiche
- Retourne uniquement le JSON valide, rien d'autre
  `.trim();
}

export function buildQuizRegeneratePrompt(
  jobPostContent: string,
  hrInstructions: string,
): string {
  return `
Tu es un expert technique RH. Modifie ce quiz selon les instructions du RH.

Fiche de poste (référence des compétences techniques uniquement) :
${jobPostContent}

Instructions de modification du RH :
${hrInstructions}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RÈGLE FONDAMENTALE :
- Les questions testent la maîtrise technique des compétences listées dans la fiche.
- Les questions sont universelles et indépendantes du contexte de l'entreprise.
- Applique TOUTES les modifications demandées par le RH.
- Si le RH demande d'ajouter des questions sur une compétence spécifique,
  assure-toi qu'elle est bien listée dans la fiche ou explicitement demandée.
- Respecte la répartition de difficulté sauf si le RH la modifie explicitement.

RÈGLE POUR LE TITRE :
- Le titre doit être EXACTEMENT 3 à 4 mots, ni plus ni moins.
- Pas de slogan, pas de question, pas de tiret, pas de sous-titre.
- Un emoji en début, suivi du domaine technique principal et du niveau.
- NE PAS énumérer les outils ou frameworks.

Exemples de titres CORRECTS :
  ✅ " Data Engineering Sénior"
  ✅ " Quiz Backend Cloud"
  ✅ " Quiz DevOps Avancé"
  ✅ " Quiz Frontend React"
  ✅ " Data Engineer Quiz"

Exemples de titres INCORRECTS :
  ❌ "Backend Senior — Êtes-vous au niveau ?"
  ❌ "Quiz Go, gRPC, Kubernetes, Azure"
  ❌ "Évaluation technique Data Engineering"
  ❌ "🔥 Backend Senior — Passez à l'étape suivante"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Retourne UNIQUEMENT un JSON valide avec la même structure :
{
  "title": "Titre court et accrocheur — 3 à 6 mots, PAS une liste de technologies",
  "description": "...",
  "duration_minutes": 30,
  "questions": [
    {
      "id": 1,
      "question": "...",
      "type": "single_choice",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "A",
      "explanation": "...",
      "domain": "Compétence évaluée",
      "difficulty": "easy|medium|hard"
    }
  ]
}

Applique TOUTES les modifications demandées. JSON valide uniquement, rien d'autre.
  `.trim();
}