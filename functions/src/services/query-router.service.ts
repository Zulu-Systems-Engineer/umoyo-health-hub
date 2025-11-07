/**
 * Intelligent Query Router
 * Determines which RAG system to use based on query characteristics
 */

export type RAGStrategy = 'vertex' | 'custom' | 'hybrid';

interface QueryAnalysis {
  strategy: RAGStrategy;
  confidence: number;
  reasoning: string;
}

export class QueryRouterService {
  // Keywords that indicate general medical queries (good for Vertex RAG)
  private readonly GENERAL_MEDICAL_KEYWORDS = [
    'what is',
    'define',
    'explain',
    'symptoms of',
    'treatment for',
    'causes of',
    'diagnosis',
    'prevention',
    'side effects',
    'drug',
    'medication',
    'disease',
    'condition',
    'WHO guideline',
    'clinical guideline',
  ];

  // Keywords that indicate Zambia-specific queries (better for custom RAG)
  private readonly ZAMBIA_SPECIFIC_KEYWORDS = [
    'zambia',
    'zambian',
    'lusaka',
    'copperbelt',
    'southern province',
    'local',
    'regional',
    'africa',
    'sub-saharan',
    'endemic',
    'prevalence in zambia',
  ];

  // Keywords that suggest image/visual content is needed (custom RAG)
  private readonly VISUAL_KEYWORDS = [
    'image',
    'picture',
    'diagram',
    'chart',
    'graph',
    'figure',
    'illustration',
    'x-ray',
    'scan',
    'visual',
    'show me',
  ];

  // Complex queries that benefit from both systems
  private readonly COMPLEX_QUERY_INDICATORS = [
    'compare',
    'difference between',
    'versus',
    'vs',
    'and',
    'relationship',
    'how does',
    'why does',
    'when should',
  ];

  /**
   * Analyze query and determine the best RAG strategy
   */
  analyzeQuery(query: string): QueryAnalysis {
    const normalizedQuery = query.toLowerCase().trim();

    // Check for visual/image queries - always use custom RAG
    if (this.containsAny(normalizedQuery, this.VISUAL_KEYWORDS)) {
      return {
        strategy: 'custom',
        confidence: 0.9,
        reasoning: 'Query requires visual/image content',
      };
    }

    // Check for Zambia-specific queries - prioritize custom RAG
    const zambiaScore = this.countMatches(normalizedQuery, this.ZAMBIA_SPECIFIC_KEYWORDS);
    if (zambiaScore > 0) {
      return {
        strategy: 'custom',
        confidence: Math.min(0.7 + (zambiaScore * 0.1), 0.95),
        reasoning: 'Query is Zambia-specific',
      };
    }

    // Check for complex queries - use hybrid approach
    if (this.containsAny(normalizedQuery, this.COMPLEX_QUERY_INDICATORS)) {
      return {
        strategy: 'hybrid',
        confidence: 0.8,
        reasoning: 'Complex query benefits from multiple sources',
      };
    }

    // Check for general medical queries - use Vertex RAG
    const generalScore = this.countMatches(normalizedQuery, this.GENERAL_MEDICAL_KEYWORDS);
    if (generalScore > 0) {
      return {
        strategy: 'vertex',
        confidence: Math.min(0.75 + (generalScore * 0.1), 0.9),
        reasoning: 'General medical query suitable for Vertex RAG',
      };
    }

    // Short queries (< 5 words) - use Vertex RAG for broader coverage
    if (normalizedQuery.split(' ').length < 5) {
      return {
        strategy: 'vertex',
        confidence: 0.6,
        reasoning: 'Short query benefits from broader knowledge base',
      };
    }

    // Default: use hybrid for safety
    return {
      strategy: 'hybrid',
      confidence: 0.5,
      reasoning: 'Query type unclear, using hybrid approach',
    };
  }

  /**
   * Check if query contains any of the given keywords
   */
  private containsAny(query: string, keywords: string[]): boolean {
    return keywords.some(keyword => query.includes(keyword));
  }

  /**
   * Count how many keywords match in the query
   */
  private countMatches(query: string, keywords: string[]): number {
    return keywords.filter(keyword => query.includes(keyword)).length;
  }

  /**
   * Determine if user role should influence routing
   */
  shouldUseRoleBasedRouting(userRole: 'patient' | 'healthcare-professional'): boolean {
    // Healthcare professionals might prefer more detailed technical information
    // which could influence the routing strategy
    return userRole === 'healthcare-professional';
  }

  /**
   * Adjust strategy based on user role
   */
  adjustStrategyForRole(
    analysis: QueryAnalysis,
    userRole: 'patient' | 'healthcare-professional'
  ): QueryAnalysis {
    if (userRole === 'healthcare-professional') {
      // Professionals might benefit more from hybrid approach for comprehensive answers
      if (analysis.strategy === 'vertex' && analysis.confidence < 0.8) {
        return {
          strategy: 'hybrid',
          confidence: analysis.confidence + 0.1,
          reasoning: `${analysis.reasoning} (adjusted for healthcare professional)`,
        };
      }
    }

    return analysis;
  }
}

