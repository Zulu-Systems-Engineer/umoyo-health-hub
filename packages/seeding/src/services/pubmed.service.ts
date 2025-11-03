import axios from 'axios';
import { MedicalDocument } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface PubMedArticle {
  pmid: string;
  title: string;
  abstract: string;
  authors: string[];
  journal: string;
  publicationDate: string;
  pmcId?: string;
  doi?: string;
}

export class PubMedService {
  private baseSearchUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
  private baseSummaryUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi';
  private baseFetchUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';

  async searchArticles(query: string, maxResults: number = 50): Promise<string[]> {
    try {
      const response = await axios.get(this.baseSearchUrl, {
        params: {
          db: 'pubmed',
          term: `${query} AND (free full text[sb])`, // Only free full-text articles
          retmax: maxResults,
          retmode: 'json',
          sort: 'relevance'
        }
      });

      return response.data.esearchresult?.idlist || [];
    } catch (error: any) {
      console.error(`Error searching PubMed for "${query}":`, error.message);
      return [];
    }
  }

  async fetchArticleDetails(pmids: string[]): Promise<PubMedArticle[]> {
    if (pmids.length === 0) return [];

    try {
      const response = await axios.get(this.baseSummaryUrl, {
        params: {
          db: 'pubmed',
          id: pmids.join(','),
          retmode: 'json'
        }
      });

      const articles: PubMedArticle[] = [];
      const results = response.data.result;

      for (const pmid of pmids) {
        if (results[pmid] && results[pmid].error === undefined) {
          const article = results[pmid];
          articles.push({
            pmid,
            title: article.title || '',
            abstract: '', // Fetch separately if needed
            authors: article.authors?.map((a: any) => a.name) || [],
            journal: article.fulljournalname || article.source || '',
            publicationDate: article.pubdate || '',
            pmcId: article.articleids?.find((id: any) => id.idtype === 'pmc')?.value,
            doi: article.articleids?.find((id: any) => id.idtype === 'doi')?.value
          });
        }
      }

      return articles;
    } catch (error: any) {
      console.error('Error fetching article details:', error.message);
      return [];
    }
  }

  async fetchAbstracts(pmids: string[]): Promise<Map<string, string>> {
    if (pmids.length === 0) return new Map();

    const abstracts = new Map<string, string>();

    try {
      const response = await axios.get(this.baseFetchUrl, {
        params: {
          db: 'pubmed',
          id: pmids.join(','),
          retmode: 'xml',
          rettype: 'abstract'
        }
      });

      // Simple XML parsing (you might want to use a proper XML parser)
      const abstractMatches = response.data.match(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g) || [];
      pmids.forEach((pmid, index) => {
        if (abstractMatches[index]) {
          const abstract = abstractMatches[index]
            .replace(/<[^>]*>/g, '')
            .trim();
          abstracts.set(pmid, abstract);
        }
      });
    } catch (error: any) {
      console.error('Error fetching abstracts:', error.message);
    }

    return abstracts;
  }

  convertToMedicalDocuments(articles: PubMedArticle[], abstracts: Map<string, string>): MedicalDocument[] {
    return articles.map(article => ({
      id: uuidv4(),
      title: article.title,
      source: 'PubMed' as const,
      category: 'disease-reference' as const,
      url: `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`,
      downloadUrl: article.pmcId 
        ? `https://www.ncbi.nlm.nih.gov/pmc/articles/${article.pmcId}/pdf/`
        : undefined,
      metadata: {
        audience: 'healthcare-professional' as const,
        language: 'en' as const,
        region: 'global' as const,
        topics: this.extractTopicsFromTitle(article.title),
        publicationDate: article.publicationDate,
        lastUpdated: new Date().toISOString()
      }
    }));
  }

  private extractTopicsFromTitle(title: string): string[] {
    const keywords = [
      'malaria', 'HIV', 'AIDS', 'tuberculosis', 'TB', 'maternal',
      'child health', 'nutrition', 'vaccine', 'treatment', 'diagnosis',
      'prevention', 'infectious disease', 'tropical disease'
    ];

    return keywords.filter(keyword => 
      title.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  async fetchAllArticles(queries: string[]): Promise<MedicalDocument[]> {
    const allArticles: MedicalDocument[] = [];

    for (const query of queries) {
      console.log(`\n🔍 Searching PubMed: "${query}"`);
      
      const pmids = await this.searchArticles(query, 20);
      console.log(`   Found ${pmids.length} articles`);

      if (pmids.length > 0) {
        const articles = await this.fetchArticleDetails(pmids);
        const abstracts = await this.fetchAbstracts(pmids);
        const documents = this.convertToMedicalDocuments(articles, abstracts);
        
        allArticles.push(...documents);
        console.log(`   ✅ Processed ${articles.length} articles`);
      }

      // Rate limiting (PubMed requests max 3 per second)
      await new Promise(resolve => setTimeout(resolve, 400));
    }

    return allArticles;
  }
}
