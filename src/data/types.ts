export type Dynasty = '唐' | '宋';
export type Relation = string;

export interface Poet {
  id: string;
  name: string;
  zi?: string;
  hao?: string;
  birth?: number;
  death?: number;
  dynasty: Dynasty;
  bio?: string;
  type?: 'Season' | 'Club' | 'Player' | 'Hero' | 'Match';
  stats?: Record<string, unknown>;
}

export interface PoemEdge {
  source: string;
  target: string;
  relation: Relation;
  poem: {
    title: string;
    body: string;
  };
  weight?: number;
  sourceValue?: number;
  targetValue?: number;
}

export interface DynastyDataset {
  poets: Poet[];
  edges: PoemEdge[];
}
