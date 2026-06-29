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
    const [[totalUsers, totalTasks], byStatus] = await Promise.all([
      prisma.$transaction([
        prisma.user.count(),
        prisma.task.count(),
      ]),
      prisma.task.groupBy({
        by: ["status"],
        orderBy: { status: "asc" },
        _count: { _all: true },
      }),
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

// POST /api/admin/tasks — create a task assigned to a specific user
router.post("/tasks", async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const b = req.body as Record<string, unknown>;

  if (typeof b["assignedUserId"] !== "string" || b["assignedUserId"].trim().length === 0) {
    res.status(400).json({ error: "assignedUserId is required" });
    return;
  }
  if (typeof b["title"] !== "string" || b["title"].trim().length === 0) {
    res.status(400).json({ error: "title is required" });
    return;
  }

  const VALID_STATUSES = ["TODO", "IN_PROGRESS", "DONE"] as const;
  const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;

  if (b["status"] !== undefined && !VALID_STATUSES.includes(b["status"] as (typeof VALID_STATUSES)[number])) {
    res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` });
    return;
  }
  if (b["priority"] !== undefined && !VALID_PRIORITIES.includes(b["priority"] as (typeof VALID_PRIORITIES)[number])) {
    res.status(400).json({ error: `priority must be one of: ${VALID_PRIORITIES.join(", ")}` });
    return;
  }
  if (b["dueDate"] !== undefined && isNaN(Date.parse(String(b["dueDate"])))) {
    res.status(400).json({ error: "dueDate must be a valid ISO date string" });
    return;
  }

  try {
    const targetUser = await prisma.user.findUnique({ where: { id: b["assignedUserId"] as string } });
    if (!targetUser) {
      res.status(404).json({ error: "Target user not found" });
      return;
    }

    const title = (b["title"] as string).trim();
    const task = await prisma.task.create({
      data: {
        title,
        ...(typeof b["description"] === "string" ? { description: b["description"] } : {}),
        ...(b["status"] !== undefined ? { status: b["status"] as (typeof VALID_STATUSES)[number] } : {}),
        ...(b["priority"] !== undefined ? { priority: b["priority"] as (typeof VALID_PRIORITIES)[number] } : {}),
        ...(b["dueDate"] !== undefined ? { dueDate: new Date(String(b["dueDate"])) } : {}),
        user: { connect: { id: b["assignedUserId"] as string } },
        activityLog: {
          create: {
            action: "created",
            detail: `Task "${title}" assigned by admin`,
          },
        },
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    res.status(201).json(task);
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