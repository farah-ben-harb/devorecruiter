import 'reflect-metadata';
import * as target from './jwt-auth.guard';

describe('jwt-auth.guard module', () => {
  it('should load without crashing', () => {
    expect(target).toBeDefined();
  });
});
