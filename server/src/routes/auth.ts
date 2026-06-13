import { Router } from "express";
import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../db.js";

const router = Router();

function signToken(payload: { id: string; email: string; role: string }): string {
  const secret = process.env["JWT_SECRET"];
  if (!secret) throw new Error("Missing JWT_SECRET");
  return jwt.sign(payload, secret, { expiresIn: "7d" }) as string;
}

// POST /api/auth/signup
router.post("/signup", async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body as {
    name?: unknown;
    email?: unknown;
    password?: unknown;
  };

  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string"
  ) {
    res.status(400).json({ error: "name, email, and password are required" });
    return;
  }

  if (name.trim().length === 0) {
    res.status(400).json({ error: "name must not be empty" });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ error: "Invalid email format" });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: "Email already in use" });
      return;
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name: name.trim(), email, password: hashed },
    });

    const token = signToken({ id: user.id, email: user.email, role: user.role });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as {
    email?: unknown;
    password?: unknown;
  };

  if (typeof email !== "string" || typeof password !== "string") {
    res.status(400).json({ error: "email and password are required" });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = signToken({ id: user.id, email: user.email, role: user.role });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;