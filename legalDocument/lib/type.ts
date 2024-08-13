export type LegalDocumentType = 'tos' | 'privacy';
export const documentTypes = ['tos', 'privacy'] as LegalDocumentType[];

export type LegalDocumentContentType = {
  _id: string;
  createdAt: string;
  createdBy: string;
  url: string;
  appId: string;
  title: string;
  html: string;
  markdown: string;
  type: LegalDocumentType;
  outdated: boolean;
  required: boolean;
  updatedAt?: string;
  updatedBy?: string;
};
