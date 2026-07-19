import { Test, TestingModule } from '@nestjs/testing';
import { PdfGeneratorService } from './pdf-generator.service';

describe('PdfGeneratorService', () => {
  let service: PdfGeneratorService;
  let renderPdfSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfGeneratorService],
    }).compile();

    service = module.get<PdfGeneratorService>(PdfGeneratorService);
    const prototype = Object.getPrototypeOf(service) as {
      renderPdf: (html: string) => Promise<Buffer>;
    };

    renderPdfSpy = jest
      .spyOn(prototype, 'renderPdf')
      .mockResolvedValue(Buffer.from('PDF_BINARY'));
  });

  afterEach(() => {
    renderPdfSpy.mockRestore();
  });

  it('should generate PDF', async () => {
    const html = `<h1>Title</h1><p>Body</p>`;
    const result = await service.generateFromHtml(html, 'v1');

    expect(result).toBeInstanceOf(Buffer);
    expect(renderPdfSpy).toHaveBeenCalled();
  });

  it('should strip h1 from body and inject it into header', async () => {
    await service.generateFromHtml('<h1>Mon Titre</h1><p>Contenu</p>', 'v1');

    const calledWith = renderPdfSpy.mock.calls[0][0] as string;

    expect(calledWith).not.toContain('</h1><p>Contenu</p>');
    expect(calledWith).toContain('Mon Titre');
    expect(calledWith).toContain('<h1>Mon Titre</h1>');
  });

  it('should fallback title when no h1 present', async () => {
    await service.generateFromHtml('<p>Pas de titre ici</p>', 'v1');

    const calledWith = renderPdfSpy.mock.calls[0][0] as string;
    expect(calledWith).toContain('Évaluation Technique');
  });
});