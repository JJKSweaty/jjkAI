"use client";

import { useState, useCallback } from "react";
import { Upload, File, X, Check, AlertCircle, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface UploadedDocument {
  id: string;
  title: string;
  filename: string;
  mime: string;
  status: "uploading" | "processing" | "success" | "error";
  progress: number;
  error?: string;
}

interface DocumentUploaderProps {
  onUploadComplete?: (docId: string) => void;
}

export function DocumentUploader({ onUploadComplete }: DocumentUploaderProps) {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const uploadFile = useCallback(async (file: File) => {
    const tempId = Math.random().toString(36).substring(7);
    const newDoc: UploadedDocument = {
      id: tempId,
      title: file.name,
      filename: file.name,
      mime: file.type,
      status: "uploading",
      progress: 0,
    };

    setDocuments((prev) => [...prev, newDoc]);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/documents/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const result = await response.json();

      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === tempId
            ? {
                ...doc,
                id: result.document.id,
                title: result.document.title,
                status: "success",
                progress: 100,
              }
            : doc
        )
      );

      onUploadComplete?.(result.document.id);
    } catch (error) {
      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === tempId
            ? {
                ...doc,
                status: "error",
                error: error instanceof Error ? error.message : "Upload failed",
              }
            : doc
        )
      );
    }
  }, [onUploadComplete]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    files.forEach((file) => {
      if (
        file.type === "application/pdf" ||
        file.type ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        file.type === "text/plain" ||
        file.type === "text/markdown"
      ) {
        uploadFile(file);
      }
    });
  }, [uploadFile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => uploadFile(file));
  };

  const removeDocument = (id: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8
          transition-colors duration-200
          ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }
        `}
      >
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <div className="rounded-full bg-primary/10 p-4">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Upload Documents</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Drag and drop files here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Supports PDF, DOCX, TXT, Markdown
            </p>
          </div>
          <label>
            <input
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.md"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button variant="outline" asChild>
              <span>Browse Files</span>
            </Button>
          </label>
        </div>
      </div>

      {/* Upload List */}
      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((doc) => (
            <Card key={doc.id} className="p-4">
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="mt-1">
                  {doc.status === "uploading" || doc.status === "processing" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : doc.status === "success" ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{doc.title}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDocument(doc.id)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {doc.status === "uploading" && (
                    <Progress value={doc.progress} className="mt-2 h-1" />
                  )}

                  {doc.status === "error" && (
                    <p className="text-xs text-destructive mt-1">{doc.error}</p>
                  )}

                  {doc.status === "success" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Ready for chat
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
