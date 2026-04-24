import { ERROR_CODES, type ApiError, type ErrorCode } from '@repo/types';

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  [ERROR_CODES.NOT_FOUND]: 404,
  [ERROR_CODES.UNAUTHORIZED]: 401,
  [ERROR_CODES.FORBIDDEN]: 403,
  [ERROR_CODES.VALIDATION_FAILED]: 422,
  [ERROR_CODES.CONFLICT]: 409,
  [ERROR_CODES.RATE_LIMITED]: 429,
  [ERROR_CODES.INTERNAL]: 500,
};

export class HttpError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: ApiError['details'];

  constructor(code: ErrorCode, message: string, details?: ApiError['details']) {
    super(message);
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = details;
  }
}

export const unauthorized = (message = 'Authentication required') =>
  new HttpError(ERROR_CODES.UNAUTHORIZED, message);
export const forbidden = (message = 'Forbidden') =>
  new HttpError(ERROR_CODES.FORBIDDEN, message);
export const conflict = (message: string) => new HttpError(ERROR_CODES.CONFLICT, message);
export const validationFailed = (message: string, details?: ApiError['details']) =>
  new HttpError(ERROR_CODES.VALIDATION_FAILED, message, details);
