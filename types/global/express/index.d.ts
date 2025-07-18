import "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: string;
        email?: string;
        role?: string;
        [key: string]: any;
      };
    }
  }
}

export {};
