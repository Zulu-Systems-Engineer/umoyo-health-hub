
export interface VectorChunk {
    chunkId: string;
    documentId: string;
    source: string;
    category: 'clinical-guideline' | 'drug-info' | 'disease-reference' | 'patient-education';
    pageNumber?: number;
    chunkIndex: number;
    startChar: number;
    endChar: number;
    content: string;
    embedding: number[];
    embeddingDim: number;
    metadata: {
      documentTitle: string;
      language: string;
      audience: 'healthcare-professional' | 'patient' | 'both';
    };
    createdAt: number;
  }
  
  export interface VectorDBMetadata {
    version: number;
    embeddingModel: string;
    dimensions: number;
    totalDocuments: number;
    totalChunks: number;
    updatedAt: number;
  }
  
  export interface RAGQueryResult {
    answer: string;
    citations: Array<{
      chunkId: string;
      source: string;
      content: string;
      pageNumber?: number;
      similarity: number;
    }>;
    confidence: number;
    processingTime: number;
  }
  