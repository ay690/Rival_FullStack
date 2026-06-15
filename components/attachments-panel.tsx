"use client";

import { useState, useEffect, useRef } from "react";
import {
  Paperclip, Upload, Trash2, Download, FileText,
  Image, File, AlertCircle, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogClose,
} from "@/components/ui/dialog";
import { attachmentsApi } from "@/lib/api";
import type { Attachment } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const ACCEPTED = [
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
].join(",");

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <Image className="size-4 shrink-0 text-blue-500" />;
  if (mimeType === "application/pdf") return <FileText className="size-4 shrink-0 text-red-500" />;
  return <File className="size-4 shrink-0 text-muted-foreground" />;
}

interface AttachmentsPanelProps {
  taskId: string;
  onActivityChange?: () => void;
}

export function AttachmentsPanel({ taskId, onActivityChange }: AttachmentsPanelProps) {
  const { token } = useAuth();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Attachment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    attachmentsApi.list(token, taskId)
      .then(setAttachments)
      .catch(() => {/* silently fail on load */})
      .finally(() => setLoading(false));
  }, [token, taskId]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || !token) return;
    const file = files[0]!;

    if (file.size > MAX_SIZE) {
      setUploadError("File is too large. Maximum size is 10 MB.");
      return;
    }

    setUploadError(null);
    setUploading(true);
    try {
      const attachment = await attachmentsApi.upload(token, taskId, file);
      setAttachments((prev) => [attachment, ...prev]);
      onActivityChange?.();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete() {
    if (!deleteTarget || !token) return;
    setDeleting(true);
    try {
      await attachmentsApi.delete(token, taskId, deleteTarget.id);
      setAttachments((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      setDeleteTarget(null);
      onActivityChange?.();
    } catch {
      // stay open
    } finally {
      setDeleting(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Paperclip className="size-3.5" />
            Attachments
            {attachments.length > 0 && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                {attachments.length}
              </span>
            )}
          </h2>
          <Button
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Upload className="size-3.5" />
            )}
            {uploading ? "Uploading…" : "Upload"}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors",
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/30"
          )}
        >
          <Upload className="size-6 text-muted-foreground/60" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Drop a file here or click to browse
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Images, PDF, Word, Excel, text — up to 10 MB
            </p>
          </div>
        </div>

        {/* Error */}
        {uploadError && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <AlertCircle className="size-3.5 shrink-0" />
            {uploadError}
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex flex-col gap-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : attachments.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-2">
            No attachments yet
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {attachments.map((a) => (
              <li
                key={a.id}
                className="group flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2 hover:bg-muted/40 transition-colors"
              >
                {fileIcon(a.mimeType)}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{a.originalName}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(a.size)}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={attachmentsApi.downloadUrl(taskId, a.id)}
                    download={a.originalName}
                    onClick={(e) => {
                      e.preventDefault();
                      if (!token) return;
                      fetch(attachmentsApi.downloadUrl(taskId, a.id), {
                        headers: { Authorization: `Bearer ${token}` },
                      })
                        .then((res) => res.blob())
                        .then((blob) => {
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement("a");
                          link.href = url;
                          link.download = a.originalName;
                          link.click();
                          URL.revokeObjectURL(url);
                          onActivityChange?.();
                        });
                    }}
                  >
                    <Button variant="ghost" size="icon-sm" aria-label="Download" type="button"
                      onClick={() => {}}>
                      <Download className="size-3.5" />
                    </Button>
                  </a>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete attachment"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteTarget(a)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove attachment?</DialogTitle>
            <DialogDescription>
              <strong>{deleteTarget?.originalName}</strong> will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <DialogClose asChild>
              <Button variant="outline" size="sm">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" size="sm" disabled={deleting} onClick={handleDelete}>
              {deleting ? "Removing…" : "Remove"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
