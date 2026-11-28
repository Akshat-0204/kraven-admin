import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { toast } from 'sonner';
import { ApiError, errorMessage } from './api';

/**
 * Shows a failed submit to the user: maps the API's per-field messages onto the form
 * (so the offending inputs light up) and toasts the summary message.
 * Returns true when at least one field error was applied.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError?: UseFormSetError<T>,
  fallback = 'Could not save'
): boolean {
  let applied = false;
  if (setError && error instanceof ApiError) {
    for (const [path, message] of Object.entries(error.fieldErrors)) {
      if (path === '_form') continue;
      setError(path as Path<T>, { type: 'server', message }, { shouldFocus: !applied });
      applied = true;
    }
  }
  toast.error(errorMessage(error, fallback));
  return applied;
}

/** Toast helper for react-query `onError`. */
export function toastError(fallback = 'Something went wrong') {
  return (error: unknown) => {
    toast.error(errorMessage(error, fallback));
  };
}
