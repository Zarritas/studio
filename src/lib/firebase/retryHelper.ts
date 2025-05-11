
import { retry, type RetryOptions } from '@lifeomic/attempt';
import type { FirebaseError } from 'firebase/app';

// Type guard to check for AbortError by its name property
function isAbortError(error: unknown): error is Error & { name: 'AbortError', cause?: unknown } {
  return typeof error === 'object' && error !== null && (error as Error).name === 'AbortError';
}

// Default retry options for Firestore operations
const defaultRetryOptions: Partial<RetryOptions<any>> = {
  delay: 1000, // Initial delay of 1 second
  factor: 2,   // Exponential factor (doubles the delay each attempt)
  maxAttempts: 3, // Max 3 attempts
  handleError: (err: any, context) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const firebaseError = err as FirebaseError;
    console.warn(`Firestore operation attempt ${context.attemptNum} failed. Retrying in ${context.delay}ms. Error: ${firebaseError.message} (Code: ${firebaseError.code})`);
    // Example: Don't retry on permission denied, as it's unlikely to resolve with retries
    if (firebaseError.code === 'permission-denied' || firebaseError.code === 'unauthenticated') {
      console.error('Aborting retries due to permission-denied or unauthenticated error.');
      context.abort(); // This will cause retry to throw an error that isAbortError should catch
    }
    // Add other non-retryable error codes as needed
  },
  timeout: 10000, // Maximum time (in ms) for all attempts including delays
  maxDelay: 5000, // Maximum delay (in ms) between attempts
};

/**
 * Retries a Firestore write operation (like setDoc, updateDoc, deleteDoc).
 * Throws an error if all retries fail.
 * @param writeOperation The Firestore write operation to retry (a function returning a Promise).
 * @param options Custom retry options.
 */
export async function withFirestoreWriteRetry(
  writeOperation: () => Promise<void>,
  options?: Partial<RetryOptions<void>>
): Promise<void> {
  try {
    await retry(writeOperation, { ...defaultRetryOptions, ...options });
  } catch (error) {
    if (isAbortError(error)) {
        console.error("Firestore write operation aborted (e.g. due to non-retryable error):", (error.cause as Error)?.message || error.message);
    } else {
        console.error("Firestore write operation failed after multiple retries:", (error as Error).message);
    }
    throw error; // Re-throw the error for the caller to handle
  }
}

/**
 * Retries a Firestore read operation (like getDoc, getDocs).
 * Returns the result of the operation, or throws an error if all retries fail.
 * @param readOperation The Firestore read operation to retry (a function returning a Promise).
 * @param options Custom retry options.
 * @returns The result of the read operation.
 */
export async function withFirestoreReadRetry<T>(
  readOperation: () => Promise<T>, // T could be DocumentSnapshot, QuerySnapshot, etc. or null/undefined
  options?: Partial<RetryOptions<T>>
): Promise<T> {
  try {
    return await retry(readOperation, { ...defaultRetryOptions, ...options });
  } catch (error) {
     if (isAbortError(error)) {
        console.error("Firestore read operation aborted (e.g. due to non-retryable error):", (error.cause as Error)?.message || error.message);
    } else {
        console.error("Firestore read operation failed after multiple retries:", (error as Error).message);
    }
    throw error; // Re-throw the error for the caller to handle
  }
}

