"use client";

import { useState, useEffect } from "react";
import { FileText, Trash2, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Document {
  id: string;
  title: string;
  filename: string;
  mime: string;
  pages?: number;
  chunks: number;
  createdAt: string;
}

interface DocumentLibraryProps {
  onSelectDocument?: (docId: string) => void;
  selectedDocIds?: string[];
}

export function DocumentLibrary({
  onSelectDocument,
  selectedDocIds = [],
}: DocumentLibraryProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/documents`
      );
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error("Failed to load documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteDocument = async (docId: string) => {
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/documents/${docId}`,
        {
          method: "DELETE",
        }
      );
      setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
    } catch (error) {
      console.error("Failed to delete document:", error);
    }
  };

  const filteredDocuments = documents.filter(
    (doc) =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getFileIcon = (mime: string) => {
    return <FileText className="h-5 w-5 text-muted-foreground" />;
  };

  const getFileType = (mime: string) => {
    if (mime.includes("pdf")) return "PDF";
    if (mime.includes("word")) return "DOCX";
    if (mime.includes("text")) return "TXT";
    if (mime.includes("markdown")) return "MD";
    return "DOC";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-sm text-muted-foreground">Loading documents...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Document Grid */}
      {filteredDocuments.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            {searchQuery ? "No documents found" : "No documents uploaded yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => {
            const isSelected = selectedDocIds.includes(doc.id);

            return (
              <Card
                key={doc.id}
                className={`
                  p-4 cursor-pointer transition-all hover:shadow-md
                  ${isSelected ? "ring-2 ring-primary" : ""}
                `}
                onClick={() => onSelectDocument?.(doc.id)}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="mt-1">{getFileIcon(doc.mime)}</div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium truncate">{doc.title}</h3>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {doc.filename}
                    </p>

                    {/* Metadata */}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {getFileType(doc.mime)}
                      </Badge>
                      {doc.pages && (
                        <Badge variant="outline" className="text-xs">
                          {doc.pages} pages
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {doc.chunks} chunks
                      </Badge>
                    </div>

                    {/* Date */}
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Delete Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteDocument(doc.id);
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
