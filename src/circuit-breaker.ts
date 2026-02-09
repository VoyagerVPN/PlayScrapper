import { ICircuitBreaker } from './types';

interface CircuitBreakerOptions {
  failureThreshold: number;
  successThreshold: number;
  timeoutMs: number;
}

class CircuitBreaker implements ICircuitBreaker {
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(private options: CircuitBreakerOptions) {
    this.options = options;
  }

  canProceed(): boolean {
    if (this.state === 'closed') {
      return true;
    }

    if (this.state === 'open') {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.options.timeoutMs) {
        this.state = 'half-open';
        this.successCount = 0;
        return true;
      }
      return false;
    }

    return true;
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.state === 'half-open') {
      this.state = 'open';
      return;
    }

    if (this.failureCount >= this.options.failureThreshold) {
      this.state = 'open';
    }
  }

  recordSuccess(): void {
    if (this.state === 'half-open') {
      this.successCount++;
      
      if (this.successCount >= this.options.successThreshold) {
        this.state = 'closed';
        this.failureCount = 0;
      }
      return;
    }

    if (this.state === 'closed') {
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  reset(): void {
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    this.state = 'closed';
  }

  getState(): string {
    return this.state;
  }

  getFailureCount(): number {
    return this.failureCount;
  }
}

export { CircuitBreaker };
export const circuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  successThreshold: 2,
  timeoutMs: 60000
});
