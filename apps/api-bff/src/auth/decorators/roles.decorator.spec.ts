import 'reflect-metadata';
import * as target from './roles.decorator';

describe('roles.decorator module', () => {
  it('should load without crashing', () => {
    expect(target).toBeDefined();
  });
});
