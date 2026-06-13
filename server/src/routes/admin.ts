import { Router } from "express";
import type { Request, Response } from "express";
import prisma from "../db.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();
router.use(authenticate);

// Guard — admin only
function requireAdmin(req: Request, res: Response): boolean {
  if (req.user?.role !== "ADMIN") {
    res.status(403).json({ error: "Forbidden: admin access required" });
    return false;
  }
  return true;
}

// GET /api/admin/users — list all users with task counts
router.get("/users", async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/tasks — all tasks across all users with owner info
router.get("/tasks", async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const q = req.query as Record<string, string | undefined>;
  const page = Math.max(1, parseInt(q["page"] ?? "1", 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(q["limit"] ?? "20", 10) || 20));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (q["userId"]) where["userId"] = q["userId"];
  if (q["status"]) where["status"] = q["status"];
  if (q["search"]) where["title"] = { contains: q["search"], mode: "insensitive" };

  try {
    const [tasks, total] = await prisma.$transaction([
      prisma.task.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.task.count({ where }),
    ]);
    res.json({ tasks, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/stats — overview numbers
router.get("/stats", async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const [totalUsers, totalTasks, byStatus] = await prisma.$transaction([
      prisma.user.count(),
      prisma.task.count(),
      prisma.task.groupBy({ by: ["status"], _count: { _all: true } }),
    ]);
    const statusMap = Object.fromEntries(
      byStatus.map((s) => [s.status, s._count._all])
    );
    res.json({ totalUsers, totalTasks, byStatus: statusMap });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/admin/users/:id — delete a user and all their tasks
router.delete("/users/:id", async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params as { id: string };
  if (id === req.user!.id) {
    res.status(400).json({ error: "Cannot delete your own account" });
    return;
  }
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    await prisma.user.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;