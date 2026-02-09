import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CircuitBreaker } from './circuit-breaker';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({
      failureThreshold: 3,
      successThreshold: 2,
      timeoutMs: 1000
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should start in closed state', () => {
      expect(breaker.canProceed()).toBe(true);
      expect(breaker.getState()).toBe('closed');
    });

    it('should have zero failures initially', () => {
      expect(breaker.getFailureCount()).toBe(0);
    });
  });

  describe('recordFailure', () => {
    it('should increment failure count', () => {
      breaker.recordFailure();
      expect(breaker.getFailureCount()).toBe(1);
    });

    it('should open circuit after threshold failures', () => {
      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.canProceed()).toBe(true);
      
      breaker.recordFailure();
      expect(breaker.canProceed()).toBe(false);
      expect(breaker.getState()).toBe('open');
    });

    it('should prevent operations when open', () => {
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure();
      }
      
      expect(breaker.canProceed()).toBe(false);
    });

    it('should reset to half-open after timeout', async () => {
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure();
      }
      
      expect(breaker.canProceed()).toBe(false);
      
      vi.useFakeTimers();
      vi.advanceTimersByTime(1000);
      
      breaker.canProceed();
      
      expect(breaker.getState()).toBe('half-open');
      expect(breaker.canProceed()).toBe(true);
      
      vi.useRealTimers();
    });

    it('should return to open immediately on failure in half-open state', () => {
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure();
      }
      
      vi.useFakeTimers();
      vi.advanceTimersByTime(1000);
      
      breaker.canProceed();
      
      expect(breaker.getState()).toBe('half-open');
      expect(breaker.canProceed()).toBe(true);
      
      breaker.recordFailure();
      
      expect(breaker.getState()).toBe('open');
      expect(breaker.canProceed()).toBe(false);
      
      vi.useRealTimers();
    });
  });

  describe('recordSuccess', () => {
    it('should decrement failure count in closed state', () => {
      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.getFailureCount()).toBe(2);
      
      breaker.recordSuccess();
      expect(breaker.getFailureCount()).toBe(1);
    });

    it('should not make failure count negative', () => {
      breaker.recordSuccess();
      expect(breaker.getFailureCount()).toBe(0);
    });

    it('should increment success count in half-open state', () => {
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure();
      }
      
      vi.useFakeTimers();
      vi.advanceTimersByTime(1000);
      
      breaker.canProceed();
      
      expect(breaker.getState()).toBe('half-open');
      
      breaker.recordSuccess();
      expect(breaker.getState()).toBe('half-open');
      expect(breaker.canProceed()).toBe(true);
      
      breaker.recordSuccess();
      expect(breaker.getState()).toBe('closed');
      
      vi.useRealTimers();
    });

    it('should close circuit after success threshold in half-open', () => {
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure();
      }
      
      vi.useFakeTimers();
      vi.advanceTimersByTime(1000);
      
      breaker.canProceed();
      
      breaker.recordSuccess();
      breaker.recordSuccess();
      
      expect(breaker.getState()).toBe('closed');
      expect(breaker.canProceed()).toBe(true);
      expect(breaker.getFailureCount()).toBe(0);
      
      vi.useRealTimers();
    });

    it('should ignore success in closed state when no failures', () => {
      breaker.recordSuccess();
      breaker.recordSuccess();
      expect(breaker.getState()).toBe('closed');
      expect(breaker.canProceed()).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset to closed state', () => {
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure();
      }
      
      expect(breaker.getState()).toBe('open');
      expect(breaker.canProceed()).toBe(false);
      
      breaker.reset();
      
      expect(breaker.getState()).toBe('closed');
      expect(breaker.canProceed()).toBe(true);
    });

    it('should clear failure count', () => {
      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.getFailureCount()).toBe(2);
      
      breaker.reset();
      expect(breaker.getFailureCount()).toBe(0);
    });

    it('should clear success count', () => {
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure();
      }
      
      vi.useFakeTimers();
      vi.advanceTimersByTime(1000);
      
      breaker.recordSuccess();
      breaker.reset();
      
      expect(breaker.getState()).toBe('closed');
      
      vi.useRealTimers();
    });
  });

  describe('integration scenarios', () => {
    it('should handle burst of failures then recover', async () => {
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure();
      }
      
      expect(breaker.canProceed()).toBe(false);
      
      vi.useFakeTimers();
      vi.advanceTimersByTime(1000);
      
      expect(breaker.canProceed()).toBe(true);
      breaker.recordSuccess();
      breaker.recordSuccess();
      
      expect(breaker.getState()).toBe('closed');
      
      vi.useRealTimers();
    });

    it('should handle partial recovery', async () => {
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure();
      }
      
      vi.useFakeTimers();
      vi.advanceTimersByTime(1000);
      
      breaker.recordSuccess();
      breaker.recordFailure();
      
      expect(breaker.getState()).toBe('open');
      expect(breaker.canProceed()).toBe(false);
      
      vi.useRealTimers();
    });

    it('should handle timeout before reaching success threshold', async () => {
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure();
      }
      
      vi.useFakeTimers();
      vi.advanceTimersByTime(1000);
      
      breaker.recordSuccess();
      
      vi.advanceTimersByTime(2000);
      
      expect(breaker.getState()).toBe('half-open');
      breaker.recordSuccess();
      
      expect(breaker.getState()).toBe('closed');
      
      vi.useRealTimers();
    });
  });

  describe('getState', () => {
    it('should return correct state transitions', () => {
      expect(breaker.getState()).toBe('closed');
      
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();
      
      expect(breaker.getState()).toBe('open');
    });
  });

  describe('getFailureCount', () => {
    it('should return accurate count', () => {
      expect(breaker.getFailureCount()).toBe(0);
      
      breaker.recordFailure();
      expect(breaker.getFailureCount()).toBe(1);
      
      breaker.recordFailure();
      expect(breaker.getFailureCount()).toBe(2);
      
      breaker.recordSuccess();
      expect(breaker.getFailureCount()).toBe(1);
    });
  });
});
