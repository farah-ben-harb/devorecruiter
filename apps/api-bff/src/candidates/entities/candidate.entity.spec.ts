import 'reflect-metadata';
import * as target from './candidate.entity';

describe('candidate.entity module', () => {
  it('should load without crashing', () => {
    expect(target).toBeDefined();
  });
});
