import { supabase } from '@/integrations/supabase/client';

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
  sector: string;
  industry: string;
}

export interface QuoteData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  currency: string;
  exchange: string;
  type: string;
  prevClose: number;
  open: number;
  dayHigh: number;
  dayLow: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  fiftyDayAvg: number;
  twoHundredDayAvg: number;
}

export interface ChartPoint {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface NewsItem {
  title: string;
  publisher: string;
  link: string;
  publishedAt: string;
  thumbnail: string;
  relatedTickers: string[];
}

export const marketApi = {
  async search(query: string): Promise<SearchResult[]> {
    try {
      const { data, error } = await supabase.functions.invoke('market-search', {
        body: { query },
      });
      if (error) throw error;
      return data?.results || [];
    } catch (e) {
      console.error('Search API error:', e);
      return [];
    }
  },

  async getQuotes(symbols: string[]): Promise<Record<string, QuoteData>> {
    try {
      const { data, error } = await supabase.functions.invoke('market-quotes', {
        body: { symbols },
      });
      if (error) throw error;
      return data?.quotes || {};
    } catch (e) {
      console.error('Quotes API error:', e);
      return {};
    }
  },

  async getChart(symbol: string, range = '1mo', interval = '1d'): Promise<{ points: ChartPoint[]; currency: string; exchange: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('market-chart', {
        body: { symbol, range, interval },
      });
      if (error) throw error;
      return { points: data?.points || [], currency: data?.currency || 'USD', exchange: data?.exchange || '' };
    } catch (e) {
      console.error('Chart API error:', e);
      return { points: [], currency: 'USD', exchange: '' };
    }
  },

  async getNews(category = 'general'): Promise<{ trending: string[]; news: NewsItem[] }> {
    try {
      const { data, error } = await supabase.functions.invoke('market-news', {
        body: { category },
      });
      if (error) throw error;
      return { trending: data?.trending || [], news: data?.news || [] };
    } catch (e) {
      console.error('News API error:', e);
      return { trending: [], news: [] };
    }
  },
};
