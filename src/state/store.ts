import { create } from 'zustand';
import type { Dynasty } from '../data/types';
import type { LineStyle } from '../scene/lineCurves';

export type ViewMode = 'default' | 'global';

interface AppState {
  dynasty: Dynasty;
  selectedPoetId: string | null;
  panelOpen: boolean;
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
  panelOpen: false,
  modalPoem: null,
  viewMode: 'default',
  treeAxis: 'vertical',
  yFlipped: false,
  autoRotate: true,
  searchQuery: '',
  lineStyle: 'original',
  setLineStyle: (s) => set({ lineStyle: s }),
  setDynasty: (d) => set({ dynasty: d, selectedPoetId: null, panelOpen: false, modalPoem: null }),
  setSelectedPoet: (id) => set({ selectedPoetId: id }),
  openPanel: (id) => set({ selectedPoetId: id, panelOpen: true }),
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
  resetGlobalView: () => set({ selectedPoetId: null, panelOpen: false, modalPoem: null }),
  setSearchQuery: (q) => set({ searchQuery: q }),
}));
