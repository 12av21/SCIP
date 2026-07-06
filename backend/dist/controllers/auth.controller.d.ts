import type { Request, Response } from "express";
export declare function register(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function login(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function me(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function updateProfile(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function sendVerificationEmail(req: Request, res: Response): Promise<void>;
export declare function verifyEmail(req: Request, res: Response): Promise<void>;
export declare function forgotPassword(req: Request, res: Response): Promise<void>;
export declare function resetPassword(req: Request, res: Response): Promise<void>;
