export type StatusType = 'success' | 'error' | 'warning' | 'info';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
}

export interface ModalConfig {
  type: StatusType;
  title: string;
  message: string;
  showCancel?: boolean;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface GoogleDriveFilesResponse {
  files?: DriveFile[];
}
