import { IBaseRepository } from '../../common/interfaces/base-repository.interface';
import { IStatusUpdatableRepository } from '../../common/interfaces/status-updatable-repository.interface';
import { Candidate, ResumeStatus } from '../entities/candidate.entity';

export interface ICandidateRepository
  extends
    IBaseRepository<Candidate>,
    IStatusUpdatableRepository<Candidate, string, ResumeStatus> {
  updateUnifie(
    id: string,
    data: {
      unifieDriveId: string;
      unifieDriveName: string;
      unifieDriveLink: string;
      status: ResumeStatus;
      email?: string | null;
      githubUsername?: string | null;
    },
  ): Promise<Candidate>;
}

export interface DriveErrorResponse {
  message: string;
}

export const CANDIDATE_REPOSITORY = 'CANDIDATE_REPOSITORY';

export interface ResumeListItem {
  id: string;
  name: string;
  driveLink: string;
  driveId: string;
  type: 'brut' | 'unifie';
  createdAt: Date;
  status: ResumeStatus;
  hasUnifie: boolean;
  brutDriveLink?: string;
  email?: string | null;
  githubUsername?: string | null;
  hasMissingFields?: boolean;
}