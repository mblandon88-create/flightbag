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

export interface InflightData {
    activeSubTab: 'departure' | 'enroute' | 'arrival' | 'notes';
    waypointInputs: Record<number, { ata: string; fuel: string; }>;
    takeoffTime: string;
    departureATIS: string;
    arrivalATIS: string;
    notes: string;
}

const initialInflightData: InflightData = {
    activeSubTab: 'departure',
    waypointInputs: {},
    takeoffTime: '',
    departureATIS: '',
    arrivalATIS: '',
    notes: ''
};

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

    // Inflight Data
    inflightData: InflightData;
    setInflightData: (data: Partial<InflightData>) => void;
}

export const useStore = create<EFBState>()(
    persist(
        (set) => ({
            flightData: null,
            setFlightData: (data) => set({ flightData: data }),
            updateFlightData: (newData) => set((state) => ({
                flightData: state.flightData ? { ...state.flightData, ...newData } : null
            })),
            clearFlightData: () => set({ flightData: null, meteredUplift: 0, inflightData: initialInflightData }),

            meteredUplift: 0,
            setMeteredUplift: (meteredUplift) => set({ meteredUplift }),

            dgItems: [],
            addDGItem: (item) => set((state) => ({ dgItems: [...state.dgItems, item] })),
            removeDGItem: (id) => set((state) => ({ dgItems: state.dgItems.filter(i => i.id !== id) })),

            inflightData: initialInflightData,
            setInflightData: (data) => set((state) => ({
                inflightData: { ...(state.inflightData || initialInflightData), ...data }
            })),
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
