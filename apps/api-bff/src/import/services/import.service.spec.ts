import ExcelJS from 'exceljs';
import { ImportService } from './import.service';
import { UserRole } from '../../common/enums/user-role.enum';

describe('ImportService', () => {
  let service: ImportService;

  const buildWorkbookBuffer = async (rows: Record<string, string>[]) => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Users');
    sheet.columns = [
      { header: 'email', key: 'email' },
      { header: 'firstName', key: 'firstName' },
      { header: 'lastName', key: 'lastName' },
      { header: 'roles', key: 'roles' },
      { header: 'isActivated', key: 'isActivated' },
    ];
    rows.forEach((row) => sheet.addRow(row));
    return Buffer.from(await workbook.xlsx.writeBuffer());
  };

  beforeEach(() => {
    service = new ImportService();
  });

  it('parses valid users and flags activation state', async () => {
    const buffer = await buildWorkbookBuffer([
      {
        email: 'alice@example.com',
        firstName: 'Alice',
        lastName: 'Martin',
        roles: `${UserRole.ADMIN_RH}, ${UserRole.CONSULTANT}`,
        isActivated: 'Actif',
      },
    ]);

    const result = await service.parseUsersFromExcel(buffer);

    expect(result.errors).toEqual([]);
    expect(result.valid).toEqual([
      {
        email: 'alice@example.com',
        firstName: 'Alice',
        lastName: 'Martin',
        roles: [UserRole.ADMIN_RH, UserRole.CONSULTANT],
        isActivated: true,
      },
    ]);
  });

  it('returns errors when required fields or roles are missing', async () => {
    const buffer = await buildWorkbookBuffer([
      {
        email: '',
        firstName: 'Alice',
        lastName: 'Martin',
        roles: UserRole.ADMIN_RH,
      },
      {
        email: 'bob@example.com',
        firstName: '',
        lastName: 'Dupont',
        roles: UserRole.CONSULTANT,
      },
      {
        email: 'carol@example.com',
        firstName: 'Carol',
        lastName: 'Nguyen',
        roles: 'INVALID_ROLE',
      },
    ]);

    const result = await service.parseUsersFromExcel(buffer);

    expect(result.valid).toEqual([]);
    expect(result.errors).toEqual([
      'Ligne 2 : email manquant',
      'Ligne 3 : prénom manquant',
      'Ligne 4 : rôle(s) invalide(s) — valeurs acceptées : ADMIN_RH, TALENT_ACQUISITION, CONSULTANT, TECHNICAL_REFERENT',
    ]);
  });
});
