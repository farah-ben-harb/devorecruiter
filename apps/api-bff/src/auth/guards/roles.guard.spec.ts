import 'reflect-metadata';
import * as target from './roles.guard';

describe('roles.guard module', () => {
  it('should load without crashing', () => {
    expect(target).toBeDefined();
  });
});
