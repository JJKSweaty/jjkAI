/**
 * Embedding Generation
 * Generates vector embeddings for semantic search using local models
 * Uses Xenova Transformers (all-MiniLM-L6-v2) - 384 dimensions
 */

import { env } from "@xenova/transformers";
import { pipeline, type FeatureExtractionPipeline } from "@xenova/transformers";

// Set cache directory before any pipeline operations
env.cacheDir = process.env.XENOVA_CACHE_DIR || "/tmp/xenova-cache";

// Singleton instance of the embedding pipeline
let embedder: FeatureExtractionPipeline | null = null;

async function getEmbedder(): Promise<FeatureExtractionPipeline> {
  if (!embedder) {
    console.log("Loading embedding model (first time only)...");
    embedder = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    );
    console.log("Embedding model loaded!");
  }
  return embedder;
}

export interface EmbeddingResult {
  embedding: number[];
  tokens: number;
}

/**
 * Generate embedding for a single text
 * Uses all-MiniLM-L6-v2 (384 dimensions, runs locally)
 */
export async function generateEmbedding(
  text: string
): Promise<EmbeddingResult> {
  // Truncate text to ~512 tokens (model limit)
  const maxChars = 2000; // ~500 tokens at 4 chars/token
  const truncated = text.slice(0, maxChars);

  const extractor = await getEmbedder();
  const output = await extractor(truncated, {
    pooling: "mean",
    normalize: true,
  });

  // Convert to regular array
  const embedding = Array.from(output.data as Float32Array);

  return {
    embedding,
    tokens: Math.ceil(truncated.length / 4), // Rough estimate
  };
}

/**
 * Generate embeddings for multiple texts in batch
 * More efficient than calling generateEmbedding multiple times
 */
export async function generateEmbeddingBatch(
  texts: string[]
): Promise<EmbeddingResult[]> {
  if (texts.length === 0) {
    return [];
  }

  // Process in batches to avoid memory issues
  const batchSize = 8;
  const results: EmbeddingResult[] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((text) => generateEmbedding(text))
    );
    results.push(...batchResults);
  }

  return results;
}

/**
 * Generate embedding for a search query
 * Same as generateEmbedding but optimized for queries
 */
export async function generateQueryEmbedding(
  query: string
): Promise<number[]> {
  const result = await generateEmbedding(query);
  return result.embedding;
}
