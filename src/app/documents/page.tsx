"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentUploader } from "@/components/chat/DocumentUploader";
import { DocumentLibrary } from "@/components/chat/DocumentLibrary";

export default function DocumentsPage() {
  const [selectedTab, setSelectedTab] = useState("library");
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  const handleUploadComplete = (docId: string) => {
    // Switch to library after upload
    setSelectedTab("library");
  };

  const handleSelectDocument = (docId: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId)
        ? prev.filter((id) => id !== docId)
        : [...prev, docId]
    );
  };

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Document Library</h1>
        <p className="text-muted-foreground">
          Upload and manage documents for AI-powered chat
        </p>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="library">My Documents</TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="mt-0">
          <DocumentLibrary
            onSelectDocument={handleSelectDocument}
            selectedDocIds={selectedDocIds}
          />
        </TabsContent>

        <TabsContent value="upload" className="mt-0">
          <DocumentUploader onUploadComplete={handleUploadComplete} />
        </TabsContent>
      </Tabs>

      {/* Chat Button (if documents selected) */}
      {selectedDocIds.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          <a
            href={`/?docs=${selectedDocIds.join(",")}`}
            className="
              inline-flex items-center gap-2
              bg-primary text-primary-foreground
              px-6 py-3 rounded-full
              shadow-lg hover:shadow-xl
              transition-all duration-200
              font-medium
            "
          >
            Chat with {selectedDocIds.length} document
            {selectedDocIds.length > 1 ? "s" : ""}
          </a>
        </div>
      )}
    </div>
  );
}
