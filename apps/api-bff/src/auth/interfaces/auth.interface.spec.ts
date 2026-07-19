import 'reflect-metadata';
import * as target from './auth.interface';

describe('auth.interface module', () => {
  it('should load without crashing', () => {
    expect(target).toBeDefined();
  });
});
