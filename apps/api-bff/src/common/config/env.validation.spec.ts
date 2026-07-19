import 'reflect-metadata';
import * as target from './env.validation';

describe('env.validation module', () => {
  it('should load without crashing', () => {
    expect(target).toBeDefined();
  });
});
