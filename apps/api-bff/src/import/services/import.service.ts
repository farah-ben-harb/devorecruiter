import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../common/enums/user-role.enum';

@Injectable()
export class ImportService {
  async parseUsersFromExcel(buffer: Buffer): Promise<{
    valid: Partial<User>[];
    errors: string[];
  }> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(
      buffer as unknown as Parameters<typeof workbook.xlsx.load>[0],
    );
    const sheet = workbook.worksheets[0];

    const valid: Partial<User>[] = [];
    const errors: string[] = [];
    if (!sheet) {
      return { valid, errors: ['Fichier Excel vide'] };
    }

    const headers = new Map<string, number>();
    sheet.getRow(1).eachCell((cell, colNumber) => {
      headers.set(cell.text.trim(), colNumber);
    });

    const getCell = (row: ExcelJS.Row, header: string): string => {
      const colNumber = headers.get(header);
      return colNumber ? row.getCell(colNumber).text.trim() : '';
    };

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const line = rowNumber;
      const email = getCell(row, 'email');
      const firstName = getCell(row, 'firstName');
      const lastName = getCell(row, 'lastName');
      const rawRoles = getCell(row, 'roles');
      const isActivated = getCell(row, 'isActivated');

      if (!email) {
        errors.push(`Ligne ${line} : email manquant`);
        return;
      }
      if (!firstName) {
        errors.push(`Ligne ${line} : prénom manquant`);
        return;
      }
      if (!lastName) {
        errors.push(`Ligne ${line} : nom manquant`);
        return;
      }

      const roles = rawRoles
        .split(',')
        .map((r: string) => r.trim())
        .filter((r: string) =>
          Object.values(UserRole).includes(r as UserRole),
        ) as UserRole[];

      if (roles.length === 0) {
        errors.push(
          `Ligne ${line} : rôle(s) invalide(s) — valeurs acceptées : ${Object.values(UserRole).join(', ')}`,
        );
        return;
      }

      valid.push({
        email,
        firstName,
        lastName,
        roles,
        isActivated: isActivated.toLowerCase() !== 'inactif',
      });
    });

    return { valid, errors };
  }
}
