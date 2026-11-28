export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    /** Optional per-field messages, keyed by input path (e.g. `email`, `links.0.url`). */
    public readonly fieldErrors?: Record<string, string>
  ) {
    super(message);
  }
}
