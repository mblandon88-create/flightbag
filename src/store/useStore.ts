import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import localforage from 'localforage';
import type { ParsedFlightData } from '../utils/pdfParser';

export interface DGItem {
    id: string;
    drillNo: string;
    drillLetter: string;
}

export interface TechLogData {
    reqFuel: string;
    qtyBeforeRefuel: string;
    meteredUpliftLts: string;
    specificGravity: string;
    arrFuel: string;
    depFuel: string;
    reqUplift: number | null;
    meteredUpliftKg: number | null;
    fuelUsedOnGround: number | null;
    discrepancy: number | null;
    error: string | null;
}

const initialTechLogData: TechLogData = {
    reqFuel: '',
    qtyBeforeRefuel: '',
    meteredUpliftLts: '',
    specificGravity: '',
    arrFuel: '',
    depFuel: '',
    reqUplift: null,
    meteredUpliftKg: null,
    fuelUsedOnGround: null,
    discrepancy: null,
    error: null,
};

export interface RestData {
    crewSize: '3' | '4';
    pattern: 'Half and Half' | 'Thirds' | 'Four Breaks' | 'Primary / Relief';
    startTime: string;
    endTime: string;
    buffer: number;
}

export interface InflightData {
    activeSubTab: 'departure' | 'enroute' | 'arrival' | 'notes';
    waypointInputs: Record<number, { ata: string; fuel: string; }>;
    takeoffTime: string;
    departureATIS: string;
    arrivalATIS: string;
    notes: string;
    atow: string;
    atf: string;
    revisedEzfw: string;
    revisedRampFuel: string;
    restData: RestData;
}

const initialInflightData: InflightData = {
    activeSubTab: 'departure',
    waypointInputs: {},
    takeoffTime: '',
    departureATIS: '',
    arrivalATIS: '',
    notes: '',
    atow: '',
    atf: '',
    revisedEzfw: '',
    revisedRampFuel: '',
    restData: {
        crewSize: '4',
        pattern: 'Half and Half',
        startTime: '',
        endTime: '',
        buffer: 5
    }
};

interface EFBState {
    flightData: ParsedFlightData | null;
    setFlightData: (data: ParsedFlightData) => void;
    updateFlightData: (data: Partial<ParsedFlightData>) => void;
    clearFlightData: () => void;

    // Example for TechLog
    meteredUplift: number;
    setMeteredUplift: (kg: number) => void;

    techLogData: TechLogData;
    setTechLogData: (data: Partial<TechLogData>) => void;
    clearTechLogData: () => void;

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
            clearFlightData: () => set({ flightData: null, meteredUplift: 0, inflightData: initialInflightData, techLogData: initialTechLogData, dgItems: [] }),

            meteredUplift: 0,
            setMeteredUplift: (meteredUplift) => set({ meteredUplift }),

            techLogData: initialTechLogData,
            setTechLogData: (data) => set((state) => ({
                techLogData: { ...(state.techLogData || initialTechLogData), ...data }
            })),
            clearTechLogData: () => set({ techLogData: initialTechLogData }),

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
