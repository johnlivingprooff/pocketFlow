/**
 * Test to verify writeQueue compiles correctly with generic type support.
 * This ensures the flushWriteQueue and enqueueWrite functions work together properly.
 */

import { enqueueWrite, flushWriteQueue, getWriteQueueDiagnostics } from '@/lib/db/writeQueue';

describe('WriteQueue Type Safety', () => {
  test('enqueueWrite with void return compiles', async () => {
    const operation = enqueueWrite(async () => {
      // Void operation
      return;
    }, 'testOp');

    // Should be Promise<void>
    await operation;
  });

  test('enqueueWrite with generic return compiles', async () => {
    const operation = enqueueWrite(async () => {
      return { success: true, data: 'test' };
    }, 'testOpWithReturn');

    // Should be Promise<{ success: boolean; data: string }>
    const result = await operation;
    expect(result.success).toBe(true);
    expect(result.data).toBe('test');
  });

  test('flushWriteQueue awaits all pending operations', async () => {
    const results: string[] = [];

    // Queue several operations
    enqueueWrite(async () => {
      results.push('op1');
    }, 'op1');

    enqueueWrite(async () => {
      results.push('op2');
    }, 'op2');

    enqueueWrite(async () => {
      results.push('op3');
    }, 'op3');

    // Flush the queue
    await flushWriteQueue();

    // All operations should have completed
    expect(results).toHaveLength(3);
    expect(results).toEqual(['op1', 'op2', 'op3']);
  });

  test('getWriteQueueDiagnostics returns valid metrics', async () => {
    const diags = getWriteQueueDiagnostics();
    
    expect(diags).toHaveProperty('currentDepth');
    expect(diags).toHaveProperty('maxDepthSeen');
    expect(diags).toHaveProperty('status');
    expect(diags).toHaveProperty('message');

    expect(typeof diags.currentDepth).toBe('number');
    expect(typeof diags.maxDepthSeen).toBe('number');
    expect(typeof diags.status).toBe('string');
  });
});
