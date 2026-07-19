import pdfParse from 'pdf-parse';

type PdfParseResult = { text: string };
type PdfParseFn = (buffer: Buffer) => Promise<PdfParseResult>;

const parsePdfFile = pdfParse as unknown as PdfParseFn;

export async function parsePdf(buffer: Buffer): Promise<PdfParseResult> {
  return parsePdfFile(buffer);
}
