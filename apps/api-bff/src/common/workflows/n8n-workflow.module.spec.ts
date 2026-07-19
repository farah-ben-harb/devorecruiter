import 'reflect-metadata';
import * as target from './n8n-workflow.module';

describe('n8n-workflow.module module', () => {
  it('should load without crashing', () => {
    expect(target).toBeDefined();
  });
});
