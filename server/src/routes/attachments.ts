import { Router } from "express";
import type { Request, Response } from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import multer, { diskStorage } from "multer";
import prisma from "../db.js";
import { authenticate } from "../middleware/auth.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// 10 MB limit, images + docs only
const ALLOWED_MIME = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]);

const storage = diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type "${file.mimetype}" is not allowed`));
    }
  },
});

const router = Router({ mergeParams: true });
router.use(authenticate);

function userFilter(req: Request): { userId: string } | Record<string, never> {
  const u = req.user!;
  return u.role === "ADMIN" ? {} : { userId: u.id };
}

// GET /api/tasks/:taskId/attachments
router.get("/", async (req: Request, res: Response): Promise<void> => {
  const { taskId } = req.params as { taskId: string };
  try {
    const task = await prisma.task.findFirst({ where: { id: taskId, ...userFilter(req) } });
    if (!task) { res.status(404).json({ error: "Task not found" }); return; }
    const attachments = await db.attachment.findMany({
      where: { taskId },
      orderBy: { createdAt: "desc" },
    });
    res.json(attachments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/tasks/:taskId/attachments — upload a file
router.post(
  "/",
  (req: Request, res: Response, next) => {
    upload.single("file")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        res.status(400).json({ error: err.message });
        return;
      }
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next();
    });
  },
  async (req: Request, res: Response): Promise<void> => {
    const { taskId } = req.params as { taskId: string };
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    try {
      const task = await prisma.task.findFirst({ where: { id: taskId, ...userFilter(req) } });
      if (!task) {
        fs.unlinkSync(file.path);
        res.status(404).json({ error: "Task not found" });
        return;
      }

      const attachment = await db.attachment.create({
        data: {
          taskId,
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
        },
      });

      // Log activity
      await db.activityLog.create({
        data: { taskId, action: "attachment added", detail: file.originalname },
      });

      res.status(201).json(attachment);
    } catch (err) {
      // Clean up uploaded file on DB error
      try { fs.unlinkSync(file.path); } catch { /* ignore */ }
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// DELETE /api/tasks/:taskId/attachments/:attachmentId
router.delete("/:attachmentId", async (req: Request, res: Response): Promise<void> => {
  const { taskId, attachmentId } = req.params as { taskId: string; attachmentId: string };
  try {
    const task = await prisma.task.findFirst({ where: { id: taskId, ...userFilter(req) } });
    if (!task) { res.status(404).json({ error: "Task not found" }); return; }

    const attachment = await db.attachment.findFirst({ where: { id: attachmentId, taskId } });
    if (!attachment) { res.status(404).json({ error: "Attachment not found" }); return; }

    // Delete file from disk
    const filePath = path.join(UPLOADS_DIR, attachment.filename);
    try { fs.unlinkSync(filePath); } catch { /* file may already be gone */ }

    await db.attachment.delete({ where: { id: attachmentId } });
    await db.activityLog.create({
      data: { taskId, action: "attachment removed", detail: attachment.originalName },
    });

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/tasks/:taskId/attachments/:attachmentId/download
router.get("/:attachmentId/download", async (req: Request, res: Response): Promise<void> => {
  const { taskId, attachmentId } = req.params as { taskId: string; attachmentId: string };
  try {
    const task = await prisma.task.findFirst({ where: { id: taskId, ...userFilter(req) } });
    if (!task) { res.status(404).json({ error: "Task not found" }); return; }

    const attachment = await db.attachment.findFirst({ where: { id: attachmentId, taskId } });
    if (!attachment) { res.status(404).json({ error: "Attachment not found" }); return; }

    const filePath = path.join(UPLOADS_DIR, attachment.filename);
    if (!fs.existsSync(filePath)) { res.status(404).json({ error: "File not found on disk" }); return; }

    res.setHeader("Content-Disposition", `attachment; filename="${attachment.originalName}"`);
    res.setHeader("Content-Type", attachment.mimeType);

    // Log download activity (fire-and-forget, don't block the stream)
    db.activityLog.create({
      data: { taskId, action: "attachment downloaded", detail: attachment.originalName },
    }).catch((e: unknown) => console.error("Failed to log download:", e));

    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
