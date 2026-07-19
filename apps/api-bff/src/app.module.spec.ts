import 'reflect-metadata';
import * as target from './app.module';
import { ExportModule } from './export/export.module';

describe('app.module module', () => {
  it('should load without crashing', () => {
    expect(target).toBeDefined();
  });

  it('should register the export module', () => {
    const imports = Reflect.getMetadata(
      'imports',
      target.AppModule,
    ) as Array<unknown>;

    expect(imports).toContain(ExportModule);
  });
});
