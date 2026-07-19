import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(() => {
    service = new StorageService();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('set()', () => {
    it('should store a value in localStorage', () => {
      service.set('key1', 'value1');
      expect(localStorage.getItem('key1')).toBe('value1');
    });
  });

  describe('get()', () => {
    it('should retrieve a stored value', () => {
      localStorage.setItem('key1', 'value1');
      expect(service.get('key1')).toBe('value1');
    });

    it('should return null for a non-existent key', () => {
      expect(service.get('nonexistent')).toBeNull();
    });
  });

  describe('clear()', () => {
    it('should clear all stored values', () => {
      localStorage.setItem('key1', 'value1');
      localStorage.setItem('key2', 'value2');
      service.clear();
      expect(localStorage.getItem('key1')).toBeNull();
      expect(localStorage.getItem('key2')).toBeNull();
    });
  });
});
