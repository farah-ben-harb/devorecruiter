import 'reflect-metadata';
import * as target from './users-repository.interface';

describe('users-repository.interface module', () => {
  it('should load without crashing', () => {
    expect(target).toBeDefined();
  });
});
