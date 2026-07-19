import 'reflect-metadata';
import * as target from './health.service';

describe('health.service module', () => {
  it('should load without crashing', () => {
    expect(target).toBeDefined();
  });
});
