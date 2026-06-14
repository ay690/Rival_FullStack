import { Router } from "express";
import type { Request, Response } from "express";
import prisma from "../db.js";
import { authenticate } from "../middleware/auth.js";

type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
type Priority = "LOW" | "MEDIUM" | "HIGH";

const VALID_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];
const VALID_PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH"];

const router = Router();
router.use(authenticate);

function userFilter(req: Request): { userId: string } | Record<string, never> {
  const u = req.user!;
  return u.role === "ADMIN" ? {} : { userId: u.id };
}

// POST /api/tasks — create
router.post("/", async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const b = req.body as Record<string, unknown>;

  if (typeof b["title"] !== "string" || b["title"].trim().length === 0) {
    res.status(400).json({ error: "title is required" });
    return;
  }
  if (b["status"] !== undefined && !VALID_STATUSES.includes(b["status"] as TaskStatus)) {
    res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` });
    return;
  }
  if (b["priority"] !== undefined && !VALID_PRIORITIES.includes(b["priority"] as Priority)) {
    res.status(400).json({ error: `priority must be one of: ${VALID_PRIORITIES.join(", ")}` });
    return;
  }
  if (b["dueDate"] !== undefined && isNaN(Date.parse(String(b["dueDate"])))) {
    res.status(400).json({ error: "dueDate must be a valid ISO date string" });
    return;
  }

  try {
    const title = (b["title"] as string).trim();
    const task = await prisma.task.create({
      data: {
        title,
        ...(typeof b["description"] === "string" ? { description: b["description"] } : {}),
        ...(b["status"] !== undefined ? { status: b["status"] as TaskStatus } : {}),
        ...(b["priority"] !== undefined ? { priority: b["priority"] as Priority } : {}),
        ...(b["dueDate"] !== undefined ? { dueDate: new Date(String(b["dueDate"])) } : {}),
        user: { connect: { id: user.id } },
        activityLog: { create: { action: "created", detail: `Task "${title}" created` } },
      },
    });
    res.status(201).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/tasks — list with filter, search, sort, pagination
router.get("/", async (req: Request, res: Response): Promise<void> => {
  const q = req.query as Record<string, string | undefined>;

  const page = Math.max(1, parseInt(q["page"] ?? "1", 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(q["limit"] ?? "10", 10) || 10));
  const skip = (page - 1) * limit;

  const validSortFields = ["dueDate", "priority", "createdAt"] as const;
  type SortField = (typeof validSortFields)[number];
  const sortByRaw = q["sortBy"] ?? "createdAt";
  const sortBy: SortField = (validSortFields as readonly string[]).includes(sortByRaw)
    ? (sortByRaw as SortField)
    : "createdAt";
  const order: "asc" | "desc" = q["order"] === "asc" ? "asc" : "desc";

  const filter = userFilter(req);
  const statusFilter =
    q["status"] && VALID_STATUSES.includes(q["status"] as TaskStatus)
      ? { status: q["status"] as TaskStatus }
      : {};
  const searchFilter =
    q["search"] && q["search"].trim().length > 0
      ? { title: { contains: q["search"].trim(), mode: "insensitive" as const } }
      : {};

  const where = { ...filter, ...statusFilter, ...searchFilter };
  const orderBy =
    sortBy === "priority"
      ? { priority: order }
      : sortBy === "dueDate"
        ? { dueDate: order }
        : { createdAt: order };

  try {
    const [tasks, total] = await prisma.$transaction([
      prisma.task.findMany({ where, orderBy, skip, take: limit }),
      prisma.task.count({ where }),
    ]);
    res.json({ tasks, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/tasks/:id
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  try {
    const task = await prisma.task.findFirst({
      where: { id, ...userFilter(req) },
      include: { activityLog: { orderBy: { createdAt: "desc" } } },
    });
    if (!task) { res.status(404).json({ error: "Task not found" }); return; }
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/tasks/:id — partial update
router.patch("/:id", async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const b = req.body as Record<string, unknown>;

  if (b["status"] !== undefined && !VALID_STATUSES.includes(b["status"] as TaskStatus)) {
    res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` });
    return;
  }
  if (b["priority"] !== undefined && !VALID_PRIORITIES.includes(b["priority"] as Priority)) {
    res.status(400).json({ error: `priority must be one of: ${VALID_PRIORITIES.join(", ")}` });
    return;
  }
  if (b["dueDate"] !== undefined && b["dueDate"] !== null && isNaN(Date.parse(String(b["dueDate"])))) {
    res.status(400).json({ error: "dueDate must be a valid ISO date string or null" });
    return;
  }

  try {
    const existing = await prisma.task.findFirst({ where: { id, ...userFilter(req) } });
    if (!existing) { res.status(404).json({ error: "Task not found" }); return; }

    const data: Record<string, unknown> = {};
    const logs: Array<{ taskId: string; action: string; detail: string }> = [];

    if (typeof b["title"] === "string" && b["title"].trim().length > 0 && b["title"].trim() !== existing.title) {
      data["title"] = b["title"].trim();
      logs.push({ taskId: id, action: "updated", detail: `title changed to "${b["title"].trim()}"` });
    }
    if (typeof b["description"] === "string" && b["description"] !== existing.description) {
      data["description"] = b["description"];
      logs.push({ taskId: id, action: "updated", detail: "description updated" });
    }
    if (b["status"] !== undefined && b["status"] !== existing.status) {
      data["status"] = b["status"] as TaskStatus;
      logs.push({ taskId: id, action: "updated", detail: `status changed to "${String(b["status"])}"` });
    }
    if (b["priority"] !== undefined && b["priority"] !== existing.priority) {
      data["priority"] = b["priority"] as Priority;
      logs.push({ taskId: id, action: "updated", detail: `priority changed to "${String(b["priority"])}"` });
    }
    if (b["dueDate"] !== undefined) {
      const newDate = b["dueDate"] === null ? null : new Date(String(b["dueDate"]));
      if ((newDate?.toISOString() ?? null) !== (existing.dueDate?.toISOString() ?? null)) {
        data["dueDate"] = newDate;
        logs.push({ taskId: id, action: "updated", detail: `dueDate changed to "${newDate?.toISOString() ?? "none"}"` });
      }
    }

    if (Object.keys(data).length === 0) { res.json(existing); return; }

    const [task] = await prisma.$transaction([
      prisma.task.update({ where: { id }, data }),
      ...(logs.length > 0 ? [prisma.activityLog.createMany({ data: logs })] : []),
    ]);
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/tasks/:id
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  try {
    const existing = await prisma.task.findFirst({ where: { id, ...userFilter(req) } });
    if (!existing) { res.status(404).json({ error: "Task not found" }); return; }
    await prisma.task.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;