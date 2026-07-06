import type { Request, Response } from "express";
export declare function getAllUsers(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function updateUserRole(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function deleteUser(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
