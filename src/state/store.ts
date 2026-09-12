import { create } from 'zustand';
import type { Dynasty } from '../data/types';
import type { LineStyle } from '../scene/lineCurves';

export type ViewMode = 'default' | 'global';
export type NodeType = 'Season' | 'Club' | 'Player' | 'Hero' | 'Match';

interface AppState {
  dynasty: Dynasty;
  selectedPoetId: string | null;
  selectedEdgeId: string | null;
  panelOpen: boolean;
  filtersOpen: boolean;
  visibleNodeTypes: Record<NodeType, boolean>;
  visibleEdgeTypes: Record<string, boolean>;
  modalPoem: { title: string; body: string; author: string } | null;
  viewMode: ViewMode;
  treeAxis: 'vertical' | 'horizontal';
  yFlipped: boolean;
  autoRotate: boolean;
  searchQuery: string;
  lineStyle: LineStyle;
  setLineStyle: (s: LineStyle) => void;
  setDynasty: (d: Dynasty) => void;
  setSelectedPoet: (id: string | null) => void;
  openPanel: (id: string) => void;
  openEdgePanel: (id: string) => void;
  toggleFilters: () => void;
  toggleNodeType: (type: NodeType) => void;
  toggleEdgeType: (type: string) => void;
  closePanel: () => void;
  openModal: (poem: { title: string; body: string; author: string }) => void;
  closeModal: () => void;
  setViewMode: (m: ViewMode) => void;
  toggleTreeAxis: () => void;
  toggleYFlip: () => void;
  toggleAutoRotate: () => void;
  resetGlobalView: () => void;
  setSearchQuery: (q: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  dynasty: '宋',
  selectedPoetId: null,
  selectedEdgeId: null,
  panelOpen: false,
  filtersOpen: false,
  visibleNodeTypes: { Season: true, Club: true, Player: true, Hero: true, Match: false },
  visibleEdgeTypes: { FACED: true, ROSTERED_PLAYER: true, USED_HERO: true, FEATURED_HERO: true, TEAMMATE_OF: false, TEAMED_WITH: false, PARTICIPATED_BY: false, NEXT_SEASON: false },
  modalPoem: null,
  viewMode: 'default',
  treeAxis: 'vertical',
  yFlipped: false,
  autoRotate: true,
  searchQuery: '',
  lineStyle: 'original',
  setLineStyle: (s) => set({ lineStyle: s }),
  setDynasty: (d) => set({ dynasty: d, selectedPoetId: null, selectedEdgeId: null, panelOpen: false, modalPoem: null }),
  setSelectedPoet: (id) => set({ selectedPoetId: id, selectedEdgeId: null }),
  openPanel: (id) => set({ selectedPoetId: id, selectedEdgeId: null, panelOpen: true }),
  openEdgePanel: (id) => set({ selectedEdgeId: id, selectedPoetId: null, panelOpen: true }),
  toggleFilters: () => set((s) => ({ filtersOpen: !s.filtersOpen })),
  toggleNodeType: (type) => set((s) => ({ visibleNodeTypes: { ...s.visibleNodeTypes, [type]: !s.visibleNodeTypes[type] } })),
  toggleEdgeType: (type) => set((s) => ({ visibleEdgeTypes: { ...s.visibleEdgeTypes, [type]: !s.visibleEdgeTypes[type] } })),
  closePanel: () => set({ panelOpen: false, modalPoem: null }),
  openModal: (poem) => set({ modalPoem: poem }),
  closeModal: () => set({ modalPoem: null }),
  setViewMode: (m) =>
    set({
      viewMode: m,
      ...(m === 'default' ? { autoRotate: false } : { autoRotate: true }),
    }),
  toggleTreeAxis: () => set((s) => ({ treeAxis: s.treeAxis === 'vertical' ? 'horizontal' : 'vertical' })),
  toggleYFlip: () => set((s) => ({ yFlipped: !s.yFlipped })),
  toggleAutoRotate: () => set((s) => ({ autoRotate: !s.autoRotate })),
  resetGlobalView: () => set({ selectedPoetId: null, selectedEdgeId: null, panelOpen: false, modalPoem: null }),
  setSearchQuery: (q) => set({ searchQuery: q }),
}));
