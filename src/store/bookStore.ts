import { create } from 'zustand';

interface BookState {
  selectedBookId: string | null;
  setSelectedBookId: (id: string | null) => void;
}

export const useBookStore = create<BookState>((set) => ({
  selectedBookId: null,
  setSelectedBookId: (id) => set({ selectedBookId: id }),
}));
