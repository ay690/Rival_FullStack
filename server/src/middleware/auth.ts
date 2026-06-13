import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JwtPayload {
    id: string;
    email: string;
    role: string;
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Authorization header missing or Unauthorized' });
        return;
    }

    const token = authHeader.slice(7);
    const secret = process.env["JWT_SECRET"];
    if (!secret) {
        res.status(500).json({ error: 'Server misconfiguration: missing JWT secret' });
        return;
    }

    try {
        const decoded = jwt.verify(token, secret) as JwtPayload;
        req.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role
        };
        next();
    } catch {
        res.status(401).json({ error: 'Expired or invalid token' });
    }
}