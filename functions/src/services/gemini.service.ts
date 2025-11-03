/**
 * Gemini Service
 * Handles calls to Google Gemini models for text generation
 */

import { VertexAI } from '@google-cloud/vertexai';
import { config } from '../config';
import type { DocumentSource } from '@umoyo/shared';

export interface GenerationOptions {
  temperature?: number;
  maxTokens?: number;
  topK?: number;
  topP?: number;
}

class GeminiService {
  private vertexAI: VertexAI;
  private projectId: string;
  private location: string;
  private modelName: string;

  constructor() {
    this.projectId = config.gcp.projectId;
    this.location = config.gcp.location;
    this.modelName = config.gemini.modelName;

    // Initialize Vertex AI
    this.vertexAI = new VertexAI({
      project: this.projectId,
      location: this.location,
    });
  }

  /**
   * Generate a response using Gemini with context from RAG
   */
  async generateResponse(
    query: string,
    context: DocumentSource[],
    options?: GenerationOptions
  ): Promise<string> {
    try {
      console.log('[Gemini Service] Generating response:', {
        queryLength: query.length,
        contextCount: context.length,
        options,
      });

      // Get the generative model
      const model = this.vertexAI.preview.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          temperature: options?.temperature ?? config.gemini.temperature,
          maxOutputTokens: options?.maxTokens ?? config.gemini.maxTokens,
          topK: options?.topK ?? config.gemini.topK,
          topP: options?.topP ?? config.gemini.topP,
        },
      });

      // Build the prompt with context
      const prompt = this.buildPrompt(query, context);

      // Generate content
      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
      });

      const response = result.response;
      const text = response.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error('No text generated from Gemini');
      }

      console.log('[Gemini Service] Response generated successfully');
      return text;
    } catch (error: any) {
      console.error('[Gemini Service] Error generating response:', error);
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }

  /**
   * Build a prompt with medical context and safety instructions
   */
  private buildPrompt(query: string, context: DocumentSource[]): string {
    const contextText = context
      .map((doc, index) => {
        return `[Source ${index + 1}: ${doc.documentTitle}]
${doc.excerpt}`;
      })
      .join('\n\n---\n\n');

    const sourcesList = context
      .map((doc, index) => `${index + 1}. ${doc.documentTitle}`)
      .join('\n');

    return `You are a medical AI assistant for the Umoyo Health Hub, providing healthcare information to professionals and patients in Zambia.

IMPORTANT SAFETY GUIDELINES:
- Always emphasize that you are an AI assistant providing information, not a replacement for professional medical care
- For any symptoms or medical concerns, recommend consulting a qualified healthcare professional
- Do not provide definitive diagnoses - only suggest possible conditions based on symptoms
- When discussing medications, always mention the importance of professional prescription and monitoring
- Be culturally sensitive to the Zambian healthcare context

CONTEXT FROM MEDICAL DOCUMENTS:
${contextText}

USER QUESTION:
${query}

Please provide a helpful, accurate response based on the context above. If the context doesn't contain enough information to fully answer the question, state that clearly and suggest consulting a healthcare professional for personalized advice.

SOURCES USED:
${sourcesList}

Remember to:
1. Cite sources when making specific claims
2. Use clear, accessible language
3. Highlight when immediate medical attention is needed
4. Respect privacy and confidentiality`;
  }

  /**
   * Generate a summary of multiple documents
   */
  async generateSummary(
    documents: DocumentSource[],
    maxLength: number = 500
  ): Promise<string> {
    try {
      const model = this.vertexAI.preview.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          temperature: 0.3, // Lower temperature for summaries
          maxOutputTokens: maxLength,
        },
      });

      const content = documents
        .map((doc) => `Title: ${doc.documentTitle}\nContent: ${doc.excerpt}`)
        .join('\n\n---\n\n');

      const prompt = `Summarize the following medical documents concisely, highlighting key points and recommendations:\n\n${content}`;

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
      return text || 'Unable to generate summary';
    } catch (error: any) {
      console.error('[Gemini Service] Error generating summary:', error);
      throw new Error(`Failed to generate summary: ${error.message}`);
    }
  }

  /**
   * Check if a query is potentially dangerous or inappropriate
   */
  async checkSafety(query: string): Promise<{
    isSafe: boolean;
    reason?: string;
    category?: string;
  }> {
    try {
      // Use Gemini's safety settings or a separate moderation model
      const model = this.vertexAI.preview.getGenerativeModel({
        model: this.modelName,
      });

      // Simple safety check prompt
      const safetyPrompt = `Analyze this medical query for safety concerns. Respond with JSON: {"isSafe": boolean, "reason": string, "category": string}

Query: "${query}"`;

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: safetyPrompt }] }],
      });

      const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
      
      try {
        const parsed = JSON.parse(text || '{}');
        return {
          isSafe: parsed.isSafe !== false,
          reason: parsed.reason,
          category: parsed.category,
        };
      } catch {
        // If parsing fails, default to safe
        return { isSafe: true };
      }
    } catch (error: any) {
      console.error('[Gemini Service] Error checking safety:', error);
      // Default to safe if check fails
      return { isSafe: true };
    }
  }
}

export const geminiService = new GeminiService();
