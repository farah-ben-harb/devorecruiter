import { JobPost, JobPostActivityStatus, JobPostStatus } from '../entities/job-post.entity';
import { IBaseRepository } from '../../common/interfaces/base-repository.interface';
import { IStatusUpdatableRepository } from '../../common/interfaces/status-updatable-repository.interface';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

export interface IJobPostRepository
  extends
    IBaseRepository<JobPost>,
    IStatusUpdatableRepository<JobPost, number, JobPostStatus> {
  findAll(
    page: number,
    limit: number,
    search?: string,
    status?: string,
    onlyWithEvaluations?: boolean,
    jobStatus?: string,
  ): Promise<PaginatedResult<JobPost>>;
  findByGoogleDriveFileId(googleDriveFileId: string): Promise<JobPost | null>;
  updateUnifie(
    id: number,
    data: {
      googleDocId: string;
      docx_id?: string; 
      status: JobPostStatus;
      unifiedUrl?: string;
      company?: string;
      startDate?: string;
      title?: string;
      requiresCoding?: boolean;
      hasQcm?: boolean;
      unifiedDocxId?: string;
    },
  ): Promise<JobPost>;
  resetToRaw(id: number): Promise<JobPost>;
  updateEvaluationsFolder(id: number, folderId: string): Promise<void>;

  updateRequiresCoding(id: number, requiresCoding: boolean|null): Promise<JobPost>;
  updateHasQcm(id: number, hasQcm: boolean | null): Promise<JobPost>;
  updateTitle(id: number, title: string, company: string): Promise<JobPost>;
  updateJobStatus(id: number,jobStatus: JobPostActivityStatus | null,linkedCandidateIds?: string[],): Promise<JobPost>;
}

export interface CandidateSearchResult {
  id: string;
  name: string;
  firstName: string;
  email: string | null;
  unifieDriveName: string | null;
  unifieDriveLink: string | null;
}



export const JOB_POST_REPOSITORY = 'JOB_POST_REPOSITORY';
