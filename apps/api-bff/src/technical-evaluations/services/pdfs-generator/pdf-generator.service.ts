import { Injectable } from '@nestjs/common';
import { buildPdfTemplate } from '../../templates/technical-evaluation.template';

@Injectable()
export class PdfGeneratorService {
  private extractTitle(html: string): string {
    const match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
    return match ? match[1].replace(/<[^>]+>/g, '') : 'Évaluation Technique';
  }

  private stripH1(html: string): string {
    return html.replace(/<h1[^>]*>.*?<\/h1>/is, '').trim();
  }

  async generateFromHtml(html: string, version: string): Promise<Buffer> {
    const title = this.extractTitle(html);
    const bodyHtml = this.stripH1(html);
    const fullHtml = buildPdfTemplate(title, bodyHtml, version);
    return this.renderPdf(fullHtml);
  }

  async generateFromRawHtml(html: string): Promise<Buffer> {
    return this.renderPdf(html);
  }

  protected async renderPdf(html: string): Promise<Buffer> {
    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.default.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '40px', bottom: '40px', left: '0px', right: '0px' },
    });
    await browser.close();
    return Buffer.from(pdfBuffer);
  }
}
