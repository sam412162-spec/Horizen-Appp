import type { ContentfulStatusCode } from 'hono/utils/http-status';

/** An error whose message is safe to show to members in the app. */
export class ApiError extends Error {
  constructor(
    public status: ContentfulStatusCode,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = (what = 'Not found') => new ApiError(404, 'not_found', what);
export const badRequest = (message: string) => new ApiError(400, 'bad_request', message);
