import 'reflect-metadata';
import * as target from './user.entity';

describe('user.entity module', () => {
  it('should load without crashing', () => {
    expect(target).toBeDefined();
  });
});
