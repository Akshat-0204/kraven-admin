import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { errorMessage } from '../lib/api';

/** Router `errorElement`: shows render crashes and failed loaders instead of a white screen. */
export function RouteError() {
  const error = useRouteError();
  const detail = error === undefined
    ? 'This page does not exist.'
    : isRouteErrorResponse(error)
      ? error.status === 404
        ? 'This page does not exist.'
        : `${error.status} ${error.statusText}`
      : errorMessage(error, 'An unexpected error occurred.');

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-6 font-body text-ink-700">
      <div role="alert" className="clay-card max-w-md space-y-3 p-6 text-center">
        <h1 className="font-display text-xl font-bold text-ink-900">Something went wrong</h1>
        <p className="text-sm text-danger-fg">{detail}</p>
        <div className="flex justify-center gap-3 text-sm">
          <button type="button" className="underline" onClick={() => window.location.reload()}>
            Reload
          </button>
          <a className="underline" href="/">
            Go to dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
