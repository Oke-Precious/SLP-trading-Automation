export interface StandardResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export function sendSuccess<T>(data: T, meta?: any): StandardResponse<T> {
  return {
    success: true,
    data,
    meta
  };
}

export function sendError(code: string, message: string, details?: any): StandardResponse<never> {
  return {
    success: false,
    error: {
      code,
      message,
      details
    }
  };
}
