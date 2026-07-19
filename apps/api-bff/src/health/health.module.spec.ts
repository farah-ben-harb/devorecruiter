import 'reflect-metadata';
import * as target from './health.module';

describe('health.module module', () => {
  it('should load without crashing', () => {
    expect(target).toBeDefined();
  });
});
