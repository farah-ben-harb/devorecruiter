import 'reflect-metadata';
import * as target from './pdf-parse.util';

describe('pdf-parse.util module', () => {
  it('should load without crashing', () => {
    expect(target).toBeDefined();
  });
});
