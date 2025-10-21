import { atom } from 'jotai';

export const sidebarOpenAtom = atom(false);
export const currentThreadIdAtom = atom<string | null>(null);
