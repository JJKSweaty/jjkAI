/**
 * Document Upload and Processing Routes
 * Handles file uploads, extraction, chunking, and storage
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { extractDocument } from "../lib/extraction";
import { supabase } from "../lib/supabase";
import type { ExtractionResult } from "../types/documents";

/**
 * Register document routes
 */
export async function documentRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/documents/upload
   * Upload and process a document
   */
  fastify.post("/upload", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Get uploaded file from multipart form data
      const data = await request.file();

      if (!data) {
        return reply.code(400).send({ error: "No file provided" });
      }

      // Check if supabase is configured
      if (!supabase) {
        return reply.code(500).send({ error: "Database not configured" });
      }

      // Read file buffer
      const buffer = await data.toBuffer();
      const filename = data.filename;

      // Extract document
      const result: ExtractionResult = await extractDocument(buffer, filename);

      if (result.status === "failed") {
        return reply.code(400).send({
          error: "Document extraction failed",
          details: result.errors,
        });
      }

      // Store document in database
      const { data: docData, error: docError } = await supabase
        .from("documents")
        .insert({
          doc_id: result.doc.docId,
          title: result.doc.title,
          filename: result.doc.sourceFilename,
          mime_type: result.doc.mime,
          hash: result.doc.hash,
          pages: result.doc.pages,
          block_count: result.doc.blocks.length,
          chunk_count: result.chunks.length,
          status: result.status,
          metadata: result.doc.metadata,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (docError) {
        console.error("Error storing document:", docError);
        return reply.code(500).send({ error: "Failed to store document" });
      }

      // Store chunks for retrieval
      if (result.chunks.length > 0) {
        const chunkInserts = result.chunks.map((chunk) => ({
          chunk_id: chunk.id,
          doc_id: result.doc.docId,
          text: chunk.text,
          page_start: chunk.meta.pageStart,
          page_end: chunk.meta.pageEnd,
          section_path: chunk.meta.sectionPath,
          block_ids: chunk.meta.blockIds,
          // embedding: chunk.embedding, // TODO: Generate embeddings
        }));

        const { error: chunksError } = await supabase
          .from("document_chunks")
          .insert(chunkInserts);

        if (chunksError) {
          console.error("Error storing chunks:", chunksError);
          // Don't fail the request, document is already stored
        }
      }

      return reply.send({
        success: true,
        document: {
          id: result.doc.docId,
          title: result.doc.title,
          filename: result.doc.sourceFilename,
          mime: result.doc.mime,
          pages: result.doc.pages,
          blocks: result.doc.blocks.length,
          chunks: result.chunks.length,
          status: result.status,
        },
        warnings: result.warnings,
      });
    } catch (error) {
      console.error("Document upload error:", error);
      return reply.code(500).send({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  /**
   * GET /api/documents
   * List all documents
   */
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!supabase) {
        return reply.code(500).send({ error: "Database not configured" });
      }

      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching documents:", error);
        return reply.code(500).send({ error: "Failed to fetch documents" });
      }

      return reply.send({ documents: data });
    } catch (error) {
      console.error("Error listing documents:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  /**
   * GET /api/documents/:docId
   * Get document details
   */
  fastify.get("/:docId", async (request: FastifyRequest<{ Params: { docId: string } }>, reply: FastifyReply) => {
    try {
      if (!supabase) {
        return reply.code(500).send({ error: "Database not configured" });
      }

      const { docId } = request.params;

      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("doc_id", docId)
        .single();

      if (error || !data) {
        return reply.code(404).send({ error: "Document not found" });
      }

      return reply.send({ document: data });
    } catch (error) {
      console.error("Error fetching document:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  /**
   * DELETE /api/documents/:docId
   * Delete a document and its chunks
   */
  fastify.delete("/:docId", async (request: FastifyRequest<{ Params: { docId: string } }>, reply: FastifyReply) => {
    try {
      if (!supabase) {
        return reply.code(500).send({ error: "Database not configured" });
      }

      const { docId } = request.params;

      // Delete chunks first (foreign key constraint)
      await supabase.from("document_chunks").delete().eq("doc_id", docId);

      // Delete document
      const { error } = await supabase
        .from("documents")
        .delete()
        .eq("doc_id", docId);

      if (error) {
        console.error("Error deleting document:", error);
        return reply.code(500).send({ error: "Failed to delete document" });
      }

      return reply.send({ success: true });
    } catch (error) {
      console.error("Error deleting document:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });
}
