import { Response } from 'express';

export function sendSuccess<T>(res: Response, data: T, statusCode = 200) {
  return res.status(statusCode).json(data);
}

export function sendCreated<T>(res: Response, data: T) {
  return res.status(201).json(data);
}

export function sendError(res: Response, statusCode: number, message: string, error = 'Error') {
  return res.status(statusCode).json({
    error,
    message,
  });
}
