// src/common/interfaces/n8n-response.interface.ts

export interface RawCriteriaPayload {
  intitulePoste?:                 string;
  competencesTechniquesRequises?: string[];
  competencesGeneralesRequises?:  string[];
  experienceMinimaleAnnees?:      number;
  formationRequise?:              string;
  languesRequises?:               string[];
  missionsprincipales?:           string[];
  certificationsRequises?:        string[];
}

export interface N8nResponse {
  document_id:         string;
  document_name:       string;
  document_url?:       string;
  company?:            string;
  date_demarrage?:     string;
  intitule_poste?:     string;
  requires_coding?:    boolean;
  docx_id?:            string;
  job_post_criteria?:  RawCriteriaPayload; // ← NOUVEAU
  email?:           string | null;
  github_username?: string | null;
}