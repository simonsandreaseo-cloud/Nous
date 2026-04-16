import { describe, it, expect } from 'vitest';
import { LayoutRole } from './layout';

describe('LayoutRole Enum', () => {
  it('should have the correct roles defined', () => {
    expect(LayoutRole.HERO).toBe('HERO');
    expect(LayoutRole.ICON).toBe('ICON');
    expect(LayoutRole.FEATURE).toBe('FEATURE');
    expect(LayoutRole.INFO).toBe('INFO');
  });

  it('should not have unexpected roles', () => {
    const roles = Object.values(LayoutRole);
    expect(roles).toHaveLength(4);
  });
});
