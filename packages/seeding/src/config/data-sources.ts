import { MedicalDocument } from '../types';

export const WHO_GUIDELINES: Partial<MedicalDocument>[] = [
  {
    title: 'WHO Guidelines for Malaria Treatment (2023)',
    source: 'WHO',
    category: 'clinical-guideline',
    url: 'https://www.who.int/publications/i/item/guidelines-for-malaria',
    metadata: {
      audience: 'healthcare-professional',
      language: 'en',
      region: 'global',
      topics: ['malaria', 'treatment', 'parasitic-diseases', 'tropical-medicine'],
      publicationDate: '2023-07-15',
      lastUpdated: new Date().toISOString()
    }
  },
  {
    title: 'WHO Consolidated Guidelines on HIV Prevention, Testing, Treatment',
    source: 'WHO',
    category: 'clinical-guideline',
    url: 'https://www.who.int/publications/i/item/9789240031593',
    metadata: {
      audience: 'healthcare-professional',
      language: 'en',
      region: 'global',
      topics: ['HIV', 'AIDS', 'antiretroviral', 'prevention', 'testing'],
      publicationDate: '2021-07-16',
      lastUpdated: new Date().toISOString()
    }
  },
  {
    title: 'WHO Consolidated Guidelines on Tuberculosis',
    source: 'WHO',
    category: 'clinical-guideline',
    url: 'https://www.who.int/publications/i/item/9789240037524',
    metadata: {
      audience: 'healthcare-professional',
      language: 'en',
      region: 'global',
      topics: ['tuberculosis', 'TB', 'infectious-disease', 'treatment'],
      publicationDate: '2022-03-24',
      lastUpdated: new Date().toISOString()
    }
  },
  {
    title: 'WHO Recommendations for Routine Immunization',
    source: 'WHO',
    category: 'clinical-guideline',
    url: 'https://www.who.int/teams/health-product-policy-and-standards/standards-and-specifications/vaccines-quality/immunization',
    metadata: {
      audience: 'both',
      language: 'en',
      region: 'global',
      topics: ['immunization', 'vaccines', 'child-health', 'prevention'],
      lastUpdated: new Date().toISOString()
    }
  },
  {
    title: 'WHO Essential Medicines List',
    source: 'WHO',
    category: 'drug-info',
    url: 'https://www.who.int/groups/expert-committee-on-selection-and-use-of-essential-medicines/essential-medicines-lists',
    metadata: {
      audience: 'healthcare-professional',
      language: 'en',
      region: 'global',
      topics: ['medications', 'pharmacy', 'essential-medicines'],
      lastUpdated: new Date().toISOString()
    }
  }
];

export const PUBMED_SEARCH_QUERIES = [
  'malaria treatment zambia',
  'HIV AIDS management sub-saharan africa',
  'tuberculosis drug resistance africa',
  'maternal mortality prevention developing countries',
  'child malnutrition treatment protocols',
  'tropical diseases treatment guidelines',
  'infectious disease management africa'
];
