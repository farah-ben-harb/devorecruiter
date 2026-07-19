import { describe, it, expect, beforeEach } from 'vitest';
import { SidebarService } from './sidebar.service';

describe('SidebarService', () => {
  let service: SidebarService;

  beforeEach(() => {
    service = new SidebarService();
  });

  describe('initial state', () => {
    it('should have isExpanded = true by default', () => {
      expect(service.isExpanded()).toBe(true);
    });

    it('should have isMobileOpen = false by default', () => {
      expect(service.isMobileOpen()).toBe(false);
    });

    it('should have isHovered = false by default', () => {
      expect(service.isHovered()).toBe(false);
    });
  });

  describe('setExpanded()', () => {
    it('should set isExpanded to false', () => {
      service.setExpanded(false);
      expect(service.isExpanded()).toBe(false);
    });

    it('should set isExpanded to true', () => {
      service.setExpanded(false);
      service.setExpanded(true);
      expect(service.isExpanded()).toBe(true);
    });
  });

  describe('toggleExpanded()', () => {
    it('should toggle isExpanded from true to false', () => {
      service.toggleExpanded();
      expect(service.isExpanded()).toBe(false);
    });

    it('should toggle isExpanded from false to true', () => {
      service.setExpanded(false);
      service.toggleExpanded();
      expect(service.isExpanded()).toBe(true);
    });
  });

  describe('setMobileOpen()', () => {
    it('should set isMobileOpen to true', () => {
      service.setMobileOpen(true);
      expect(service.isMobileOpen()).toBe(true);
    });

    it('should set isMobileOpen to false', () => {
      service.setMobileOpen(true);
      service.setMobileOpen(false);
      expect(service.isMobileOpen()).toBe(false);
    });
  });

  describe('toggleMobileOpen()', () => {
    it('should toggle isMobileOpen from false to true', () => {
      service.toggleMobileOpen();
      expect(service.isMobileOpen()).toBe(true);
    });

    it('should toggle isMobileOpen from true to false', () => {
      service.setMobileOpen(true);
      service.toggleMobileOpen();
      expect(service.isMobileOpen()).toBe(false);
    });
  });

  describe('setHovered()', () => {
    it('should set isHovered to true', () => {
      service.setHovered(true);
      expect(service.isHovered()).toBe(true);
    });

    it('should set isHovered to false', () => {
      service.setHovered(true);
      service.setHovered(false);
      expect(service.isHovered()).toBe(false);
    });
  });
});
