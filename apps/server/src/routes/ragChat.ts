/**
 * RAG Chat with Documents
 * Chat endpoint that searches documents and provides cited answers
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import Anthropic from "@anthropic-ai/sdk";
import { searchChunks, generateCitations, buildContext, formatCitation } from "../lib/retrieval";
import type { CitationSource } from "../types/documents";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ChatWithDocsRequest {
  query: string;
  docIds?: string[]; // Optional: filter by specific documents
  model?: string;
  maxResults?: number; // Max chunks to retrieve
  searchMode?: "keyword" | "vector" | "hybrid"; // Search mode (default: hybrid if embeddings available)
}

/**
 * Register RAG chat routes
 */
export async function ragChatRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/chat/with-docs
   * Chat with document context and citations
   */
  fastify.post(
    "/with-docs",
    async (
      request: FastifyRequest<{ Body: ChatWithDocsRequest }>,
      reply: FastifyReply
    ) => {
      try {
        const {
          query,
          docIds,
          model = "claude-3-7-sonnet-20250219",
          maxResults = 8,
          searchMode = "hybrid", // Default to hybrid (local embeddings)
        } = request.body;

        if (!query) {
          return reply.code(400).send({ error: "Query is required" });
        }

        // Step 1: Search documents with chosen mode
        const searchResults = await searchChunks({
          query,
          docIds,
          limit: maxResults,
          mode: searchMode,
        });

        if (searchResults.length === 0) {
          return reply.send({
            answer: "I couldn't find any relevant information in the uploaded documents.",
            citations: [],
            chunks: [],
          });
        }

        // Step 2: Generate citations
        const citations = generateCitations(searchResults);

        // Step 3: Build context for LLM
        const context = buildContext(searchResults, citations);

        // Step 4: Create system prompt with instructions
        const systemPrompt = `You are a helpful AI assistant that answers questions using only the provided document excerpts.

CRITICAL RULES:
1. Only use information from the provided sources
2. Cite sources using [number] immediately after claims (e.g., "Revenue was $5M [1]")
3. If the documents don't contain enough information, say so explicitly
4. Never make up or infer information not in the sources
5. For numerical data, cite the exact source

When answering:
- Be concise and direct
- Use citations frequently (after every fact or claim)
- If multiple sources support a point, cite all: [1][2]
- If information is missing, say: "The documents don't contain information about..."`;

        const userPrompt = `QUESTION: ${query}

SOURCES:
${context}

Answer the question using only the sources above. Remember to cite with [number].`;

        // Step 5: Get AI response
        const response = await anthropic.messages.create({
          model,
          max_tokens: 2048,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: userPrompt,
            },
          ],
        });

        const answer =
          response.content[0].type === "text"
            ? response.content[0].text
            : "No response generated";

        // Step 6: Format citations for display
        const formattedCitations = citations.map((c) => ({
          ...c,
          formatted: formatCitation(c),
        }));

        return reply.send({
          answer,
          citations: formattedCitations,
          chunks: searchResults.map((r) => ({
            text: r.chunk.text,
            score: r.score,
            source: r.chunk.meta.title,
            pages: r.chunk.meta.pageStart
              ? `${r.chunk.meta.pageStart}${
                  r.chunk.meta.pageEnd &&
                  r.chunk.meta.pageEnd !== r.chunk.meta.pageStart
                    ? `-${r.chunk.meta.pageEnd}`
                    : ""
                }`
              : undefined,
          })),
          usage: {
            input_tokens: response.usage.input_tokens,
            output_tokens: response.usage.output_tokens,
          },
        });
      } catch (error) {
        console.error("RAG chat error:", error);
        return reply.code(500).send({
          error: "Failed to process chat request",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );

  /**
   * POST /api/chat/with-docs/stream
   * Streaming version of RAG chat
   */
  fastify.post(
    "/with-docs/stream",
    async (
      request: FastifyRequest<{ Body: ChatWithDocsRequest }>,
      reply: FastifyReply
    ) => {
      try {
        const {
          query,
          docIds,
          model = "claude-3-7-sonnet-20250219",
          maxResults = 8,
        } = request.body;

        if (!query) {
          return reply.code(400).send({ error: "Query is required" });
        }

        // Search and build context (same as non-streaming)
        const searchResults = await searchChunks({
          query,
          docIds,
          limit: maxResults,
        });

        if (searchResults.length === 0) {
          return reply.send({
            answer: "I couldn't find any relevant information in the uploaded documents.",
            citations: [],
          });
        }

        const citations = generateCitations(searchResults);
        const context = buildContext(searchResults, citations);

        const systemPrompt = `You are a helpful AI assistant that answers questions using only the provided document excerpts.

CRITICAL RULES:
1. Only use information from the provided sources
2. Cite sources using [number] immediately after claims
3. If the documents don't contain enough information, say so explicitly
4. Never make up information not in the sources`;

        const userPrompt = `QUESTION: ${query}

SOURCES:
${context}

Answer using only the sources above. Cite with [number].`;

        // Set up SSE
        reply.raw.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        });

        // Send citations first
        reply.raw.write(
          `data: ${JSON.stringify({
            type: "citations",
            citations: citations.map((c) => ({
              ...c,
              formatted: formatCitation(c),
            })),
          })}\n\n`
        );

        // Stream AI response
        const stream = await anthropic.messages.stream({
          model,
          max_tokens: 2048,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        });

        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            reply.raw.write(
              `data: ${JSON.stringify({
                type: "text",
                text: chunk.delta.text,
              })}\n\n`
            );
          }
        }

        // Send done event
        reply.raw.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
        reply.raw.end();
      } catch (error) {
        console.error("RAG stream error:", error);
        reply.raw.write(
          `data: ${JSON.stringify({
            type: "error",
            error: error instanceof Error ? error.message : String(error),
          })}\n\n`
        );
        reply.raw.end();
      }
    }
  );
}
