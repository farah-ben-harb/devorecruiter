import 'reflect-metadata';
import * as target from './n8n-workflow.service';

describe('n8n-workflow.service module', () => {
  it('should load without crashing', () => {
    expect(target).toBeDefined();
  });
});
