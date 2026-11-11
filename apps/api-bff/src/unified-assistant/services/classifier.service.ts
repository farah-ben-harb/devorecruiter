import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

type GroqResponse = { choices: [{ message: { content: string } }] };

@Injectable()
export class ClassifierService {
  private readonly logger = new Logger(ClassifierService.name);
  private readonly GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
  private readonly MODEL = 'llama-3.3-70b-versatile';
  private readonly API_KEY = process.env.GROQ_API_KEY;

  constructor(private readonly httpService: HttpService) {}

  async classify(question: string): Promise<'it' | 'rh' | 'db'> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<GroqResponse>(
          this.GROQ_URL,
          {
            model: this.MODEL,
            max_tokens: 5,
            temperature: 0,
            messages: [
              {
                role: 'system',
                content: `Tu es un classificateur strict. Réponds UNIQUEMENT par "rh", "it" ou "db", rien d'autre, pas de ponctuation, pas d'explication.

Réponds "db" si la question concerne les DONNÉES de la plateforme DevoRecruiter :
- candidats, CVs, scores, évaluations de candidats
- fiches de poste, invitations envoyées
- statistiques, comptages, classements de candidats
- résultats QCM, évaluations de code
- "combien de...", "liste les...", "qui a le meilleur score..."
- tout ce qui concerne le recrutement et les candidatures

Réponds "rh" si la question concerne l'entreprise Devoteam elle-même :
- salaires, primes, avantages salariaux, rémunération
- congés, absences, RTT, arrêt maladie
- règlement intérieur, politique interne
- organigramme, hiérarchie, postes, employés internes
- télétravail, horaires, contrats de travail
- sanctions disciplinaires, licenciement
- directeur, manager, chef, responsable (en tant qu'employé interne)
- ressources humaines internes de Devoteam

Réponds "it" si la question concerne la technologie :
- programmation, développement logiciel, code
- DevOps, CI/CD, pipelines, cloud, Docker, Kubernetes
- bases de données, SQL, cybersécurité
- Angular, React, NestJS, Node.js, Java, Python
- intelligence artificielle, machine learning
- architecture logicielle, microservices`,
              },
              {
                role: 'user',
                content: question,
              },
            ],
          },
          {
            headers: {
              Authorization: `Bearer ${this.API_KEY}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const raw = response.data.choices[0].message.content
        .trim()
        .toLowerCase()
        .replace(/[^a-z]/g, '');

      this.logger.log(`Assistant request classified as ${raw}`);

      if (raw === 'rh') return 'rh';
      if (raw === 'db') return 'db';
      return 'it';
    } catch {
      this.logger.error('Assistant request classification failed.');
      return 'it';
    }
  }
}
