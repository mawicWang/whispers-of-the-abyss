
import { describe, it, expect } from 'vitest';
import { AssetLoader } from './AssetLoader';

describe('AssetLoader', () => {
  it('should be a singleton', () => {
    const instance1 = AssetLoader.getInstance();
    const instance2 = AssetLoader.getInstance();
    expect(instance1).toBe(instance2);
  });
});
