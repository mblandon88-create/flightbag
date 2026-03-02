import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import localforage from 'localforage';
import type { ParsedFlightData } from '../utils/pdfParser';

export interface DGItem {
    id: string;
    unNumber: string;
    psn: string; // Proper Shipping Name
    classOrDiv: string;
    quantity: string;
    location: string;
}

interface EFBState {
    flightData: ParsedFlightData | null;
    setFlightData: (data: ParsedFlightData) => void;
    updateFlightData: (data: Partial<ParsedFlightData>) => void;
    clearFlightData: () => void;

    // Example for TechLog
    meteredUplift: number;
    setMeteredUplift: (kg: number) => void;

    // Dangerous Goods
    dgItems: DGItem[];
    addDGItem: (item: DGItem) => void;
    removeDGItem: (id: string) => void;
}

export const useStore = create<EFBState>()(
    persist(
        (set) => ({
            flightData: null,
            setFlightData: (data) => set({ flightData: data }),
            updateFlightData: (newData) => set((state) => ({
                flightData: state.flightData ? { ...state.flightData, ...newData } : null
            })),
            clearFlightData: () => set({ flightData: null, meteredUplift: 0 }),

            meteredUplift: 0,
            setMeteredUplift: (meteredUplift) => set({ meteredUplift }),

            dgItems: [],
            addDGItem: (item) => set((state) => ({ dgItems: [...state.dgItems, item] })),
            removeDGItem: (id) => set((state) => ({ dgItems: state.dgItems.filter(i => i.id !== id) })),
        }),
        {
            name: 'eflightbag-storage', // unique name for local storage key
            storage: {
                getItem: async (name) => {
                    const value = await localforage.getItem(name);
                    return value ? JSON.parse(value as string) : null;
                },
                setItem: async (name, value) => {
                    await localforage.setItem(name, JSON.stringify(value));
                },
                removeItem: async (name) => {
                    await localforage.removeItem(name);
                },
            },
        }
    )
);
