import 'reflect-metadata';
import * as target from './auth.module';

describe('auth.module module', () => {
  it('should load without crashing', () => {
    expect(target).toBeDefined();
  });
});
