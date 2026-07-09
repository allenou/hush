import { describe, it, expect } from 'vitest';
import {
  AUTO_DETECT_PERSISTENCE_CONFIDENCE,
  shouldPersistAutoDetectedEngine,
} from '@/helpers/detector';

describe('shouldPersistAutoDetectedEngine', () => {
  it('rejects detections below the persistence threshold', () => {
    expect(shouldPersistAutoDetectedEngine({
      confidence: AUTO_DETECT_PERSISTENCE_CONFIDENCE - 1,
    })).toBe(false);
  });

  it('accepts detections at the persistence threshold', () => {
    expect(shouldPersistAutoDetectedEngine({
      confidence: AUTO_DETECT_PERSISTENCE_CONFIDENCE,
    })).toBe(true);
  });

  it('accepts detections above the persistence threshold', () => {
    expect(shouldPersistAutoDetectedEngine({
      confidence: AUTO_DETECT_PERSISTENCE_CONFIDENCE + 1,
    })).toBe(true);
  });
});
