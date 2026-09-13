export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errorType?: string;

  constructor(message: string, statusCode = 500, errorType?: string) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorType = errorType || this.getDefaultErrorType(statusCode);
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  private getDefaultErrorType(status: number): string {
    switch (status) {
      case 400: return 'Validation Error';
      case 401: return 'Unauthorized';
      case 403: return 'Forbidden';
      case 404: return 'Not Found';
      case 409: return 'Conflict';
      default: return 'Internal Server Error';
    }
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad Request', errorType = 'Validation Error') {
    super(message, 400, errorType);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'Unauthorized');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource Not Found') {
    super(message, 404, 'Not Found');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 409, 'Conflict');
  }
}
