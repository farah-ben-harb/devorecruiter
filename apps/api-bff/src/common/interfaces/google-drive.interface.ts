export interface GoogleDriveFilesResponse {
  files: {
    id: string;
    name: string;
    mimeType: string;
  }[];
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
}
