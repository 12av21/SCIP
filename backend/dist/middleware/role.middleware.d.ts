import type { Request, Response, NextFunction } from "express";
export declare function requireRole(...roles: Array<"citizen" | "admin">): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
