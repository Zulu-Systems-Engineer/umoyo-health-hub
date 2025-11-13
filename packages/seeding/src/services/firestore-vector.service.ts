import { VectorChunk, VectorDBMetadata } from '@umoyo/shared';
import { getFirestoreConfig } from '../config/auth';
import Long from 'long';
import * as protobufjs from 'protobufjs';

export class FirestoreVectorService {
  private firestore: any;

  constructor() {
    // Configure protobufjs to use Long implementation required by Firestore
    (protobufjs as any).util.Long = Long;
    (protobufjs as any).configure();

    const config = getFirestoreConfig();
    const { Firestore } = require('@google-cloud/firestore');
    this.firestore = new Firestore(config);
  }

  /**
   * Upsert a vector chunk to Firestore
   */
  async upsertChunk(chunk: VectorChunk): Promise<void> {
    await this.firestore
      .collection('vectorChunks')
      .doc(chunk.chunkId)
      .set(chunk);
  }

  /**
   * Batch upsert multiple chunks
   */
  async upsertChunksBatch(chunks: VectorChunk[]): Promise<void> {
    const batchSize = 500; // Firestore batch write limit
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = this.firestore.batch();
      const batchChunks = chunks.slice(i, i + batchSize);

      batchChunks.forEach(chunk => {
        const docRef = this.firestore.collection('vectorChunks').doc(chunk.chunkId);
        batch.set(docRef, chunk);
      });

      await batch.commit();
      console.log(`✅ Upserted batch ${i / batchSize + 1}: ${batchChunks.length} chunks`);
    }
  }

  /**
   * Update vector database metadata
   */
  async updateMetadata(metadata: VectorDBMetadata): Promise<void> {
    const payload: any = {
      ...metadata,
      updatedAt: new Date()
    };

    await this.firestore
      .collection('vectorDB')
      .doc('metadata')
      .set(payload);
  }

  /**
   * Get vector database metadata
   */
  async getMetadata(): Promise<VectorDBMetadata | null> {
    const doc = await this.firestore
      .collection('vectorDB')
      .doc('metadata')
      .get();

    if (!doc.exists) return null;

    const data: any = doc.data();
    const updatedAt = data.updatedAt;
    if (updatedAt && typeof updatedAt.toMillis === 'function') {
      data.updatedAt = updatedAt.toMillis();
    }

    return data as VectorDBMetadata;
  }

  /**
   * Get all chunks for a specific document
   */
  async getChunksByDocument(documentId: string): Promise<VectorChunk[]> {
    const snapshot = await this.firestore
      .collection('vectorChunks')
      .where('documentId', '==', documentId)
      .orderBy('chunkIndex')
      .get();

    return snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => doc.data() as VectorChunk);
  }

  /**
   * Search for similar vectors (cosine similarity)
   * Note: This loads all chunks into memory - for production,
   * consider using Vertex AI Vector Search or implement partitioning
   */
  async searchSimilar(
    queryEmbedding: number[], 
    topK: number = 5,
    category?: string
  ): Promise<Array<VectorChunk & { similarity: number }>> {
    let query = this.firestore.collection('vectorChunks');

    // Filter by category if provided
    if (category) {
      query = query.where('category', '==', category) as any;
    }

    const snapshot = await query.get();
    
    // Calculate cosine similarity for each chunk
    const results = snapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const chunk = doc.data() as VectorChunk;
      const similarity = this.cosineSimilarity(queryEmbedding, chunk.embedding);
      
      return { ...chunk, similarity };
    });

    // Sort by similarity and return top-k
    return results
      .sort((a: VectorChunk & { similarity: number }, b: VectorChunk & { similarity: number }) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return (normA && normB) ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
  }

  /**
   * Delete all chunks for a document
   */
  async deleteChunksByDocument(documentId: string): Promise<void> {
    const snapshot = await this.firestore
      .collection('vectorChunks')
      .where('documentId', '==', documentId)
      .get();

    const batch = this.firestore.batch();
    snapshot.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`✅ Deleted ${snapshot.size} chunks for document ${documentId}`);
  }
}