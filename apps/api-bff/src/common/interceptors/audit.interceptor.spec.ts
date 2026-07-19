import 'reflect-metadata';
import * as target from './audit.interceptor';

describe('audit.interceptor module', () => {
  it('should load without crashing', () => {
    expect(target).toBeDefined();
  });
});
