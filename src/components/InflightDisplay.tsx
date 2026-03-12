import React, { useState, useRef, useEffect } from 'react';
import {
    MapPin,
    AlertCircle,
    CheckCircle2,
    Navigation,
    Plane,
    Clock,
    Radio,
    X,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn, formatNumber } from '../lib/utils';

type SubTab = 'departure' | 'enroute' | 'arrival' | 'notes';

interface InflightDisplayProps {
    initialSubTab?: SubTab;
}

interface WaypointInput {
    ata: string;
    fuel: string;
    freq: string;
}

export const InflightDisplay: React.FC<InflightDisplayProps> = ({ initialSubTab = 'departure' }) => {
    const flightData = useStore((state) => state.flightData);
    const inflightData = useStore((state) => state.inflightData);
    const setInflightData = useStore((state) => state.setInflightData);

    // Initialize local state from inflightData if available during render, not effect.
    // To handle hydration and updates without effect cascades.
    const [activeSubTab, setActiveSubTab] = useState<SubTab>(
        inflightData?.activeSubTab || ((initialSubTab as unknown as string) === 'waypoints' ? 'enroute' : initialSubTab)
    );
    const [waypointInputs, setWaypointInputs] = useState<Record<number, WaypointInput>>(
        inflightData?.waypointInputs || {}
    );
    const [directSegments, setDirectSegments] = useState<Array<{ from: number; to: number }>>(
        inflightData?.directSegments || []
    );
    const [editingWpIdx, setEditingWpIdx] = useState<number | null>(null);
    const [showDirectToPicker, setShowDirectToPicker] = useState(false);
    const [takeoffTime, setTakeoffTime] = useState<string>(
        inflightData?.takeoffTime || ''
    );
    const tacticalRampFuel = (inflightData?.revisedRampFuel || flightData?.rawRampFuel || flightData?.rampFuel || '0');
    const taxiFuel = flightData?.taxiFuel || '0';

    // Helper to round up to nearest 100 kg (Aviation standard for these displays)
    const roundUp100 = (num: number) => Math.ceil(num / 100) * 100;
    
    // Taxi is used precisely for Takeoff Fuel calculation
    const preciseTaxiFuel = parseInt(taxiFuel);

    // Tactical atf (Actual Takeoff Fuel) = (Revised Ramp OR Raw Ramp) - precise Taxi
    const tacticalAtfVal = parseInt(tacticalRampFuel) - preciseTaxiFuel;
    const tacticalAtf = tacticalAtfVal.toString();

    const actualEzfw = (inflightData?.revisedEzfw || flightData?.rawEzfw || '0');

    // Tactical atow (Actual Takeoff Weight) = (Revised EZFW OR Raw EZFW) + Tactical ATF
    const tacticalAtowVal = parseInt(actualEzfw) + tacticalAtfVal;
    const tacticalAtow = roundUp100(tacticalAtowVal).toString();

    // Bind seamlessly to global store directly to prevent local overwrite bugs
    const effectiveAtow = inflightData?.atow || tacticalAtow;
    const effectiveAtf = inflightData?.atf || tacticalAtf;

    // Update inflightData in store when local state changes (excluding atow/atf which bind directly)
    useEffect(() => {
        if (!flightData) return;
        setInflightData({ activeSubTab, waypointInputs, takeoffTime, directSegments });
    }, [activeSubTab, waypointInputs, takeoffTime, directSegments, setInflightData, flightData]);


    const data = inflightData || {
        activeSubTab: 'departure', // This will be overwritten by local state
        waypointInputs: {}, // This will be overwritten by local state
        takeoffTime: '', // This will be overwritten by local state
        departureATIS: '',
        arrivalATIS: '',
        notes: ''
    };

    const [currentTime, setCurrentTime] = useState<string>(new Date().getUTCHours().toString().padStart(2, '0') + new Date().getUTCMinutes().toString().padStart(2, '0'));
    const rowRefs = useRef<Record<number, HTMLTableRowElement | null>>({});

    const calculateEta = (takeoff: string, ctmMinutes: number) => {
        if (!takeoff || takeoff.length < 4) return null;
        const cleanTime = takeoff.replace(':', '');
        if (cleanTime.length !== 4) return null;
        let hh = parseInt(cleanTime.substring(0, 2), 10);
        let mm = parseInt(cleanTime.substring(2, 4), 10);
        if (isNaN(hh) || isNaN(mm)) return null;
        mm += ctmMinutes;
        hh += Math.floor(mm / 60);
        mm %= 60;
        hh %= 24;
        return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
    };

    // Sync activeIndex with current time and logged progress automatically
    const activeIndex = React.useMemo(() => {
        if (!flightData?.waypointEntries || flightData.waypointEntries.length === 0) return -1;
        
        const nowH = parseInt(currentTime.substring(0, 2), 10);
        const nowM = parseInt(currentTime.substring(2, 4), 10);
        let nowTotalMins = nowH * 60 + nowM;

        // Find the first waypoint whose ETA is >= current time AND hasn't been logged or skipped.
        for (let i = 0; i < flightData.waypointEntries.length; i++) {
            const wp = flightData.waypointEntries[i];
            if (wp.isFir) continue;

            const input = waypointInputs[i];
            const hasAta = input?.ata && input.ata.replace(':', '').length === 4;
            if (hasAta) continue; // Skip waypoints we've already logged ATAs for

            const isSkipped = directSegments.some(seg => i > seg.from && i < seg.to);
            if (isSkipped) continue; // Skip waypoints currently bypassed by a Direct-To
            
            const eta = calculateEta(takeoffTime, wp.stm);
            if (eta) {
                const etaH = parseInt(eta.substring(0, 2), 10);
                const etaM = parseInt(eta.substring(3, 5), 10);
                let etaTotalMins = etaH * 60 + etaM;

                // Adjust for midnight crossing mathematically
                if (etaTotalMins < nowTotalMins - 720) {
                    etaTotalMins += 1440; // Add 24 hours
                }
                
                if (etaTotalMins >= nowTotalMins) {
                    return i;
                }
            }
        }
        
        // If we've passed all waypoints (or near the end), highlight the last valid one
        for (let i = flightData.waypointEntries.length - 1; i >= 0; i--) {
            if (!flightData.waypointEntries[i].isFir) return i;
        }
        
        return -1;
    }, [flightData?.waypointEntries, takeoffTime, currentTime, waypointInputs, directSegments]);

    useEffect(() => {
        if (activeSubTab === 'enroute' && activeIndex !== -1 && rowRefs.current[activeIndex]) {
            rowRefs.current[activeIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [activeSubTab, activeIndex]);

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const timeStr = now.getUTCHours().toString().padStart(2, '0') + now.getUTCMinutes().toString().padStart(2, '0');
            setCurrentTime(timeStr);
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    const [prevInitialSubTab, setPrevInitialSubTab] = useState(initialSubTab);
    if (initialSubTab !== prevInitialSubTab) {
        setPrevInitialSubTab(initialSubTab);
        if (initialSubTab) {
            setActiveSubTab((initialSubTab as unknown as string) === 'waypoints' ? 'enroute' : initialSubTab);
        }
    }

    if (!flightData) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 glass-panel p-8">
                <Navigation className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-sm font-medium">Please load a flight plan in the Flight Init tab first.</p>
            </div>
        );
    }

    const waypointEntries = flightData.waypointEntries || [];

    const handleInputChange = (index: number, field: keyof WaypointInput, value: string) => {
        let finalValue = value;
        if (field === 'ata') {
            const clean = value.replace(/\D/g, '');
            if (clean.length >= 3) {
                finalValue = `${clean.substring(0, 2)}:${clean.substring(2, 4)}`;
            } else {
                finalValue = clean;
            }
        }
        setWaypointInputs(prev => ({
            ...prev,
            [index]: {
                ...(prev[index] || { ata: '', fuel: '', freq: '' }),
                [field]: finalValue
            }
        }));
    };
    const formatTimeForInput = (timeStr?: string) => {
        if (!timeStr) return '';
        const clean = timeStr.replace(':', '');
        if (clean.length !== 4) return timeStr;
        return `${clean.substring(0, 2)}:${clean.substring(2, 4)}`;
    };

    const diffMinutes = (time1: string, time2: string) => {
        const t1 = time1.replace(':', '');
        const t2 = time2.replace(':', '');
        if (t1.length !== 4 || t2.length !== 4) return 0;
        const h1 = parseInt(t1.substring(0, 2), 10);
        const m1 = parseInt(t1.substring(2, 4), 10);
        const h2 = parseInt(t2.substring(0, 2), 10);
        const m2 = parseInt(t2.substring(2, 4), 10);
        let diff = (h1 * 60 + m1) - (h2 * 60 + m2);
        if (diff < -1200) diff += 1440;
        if (diff > 1200) diff -= 1440;
        return diff;
    };

    const getLocalTime = (zuluTime: string | null | undefined, offsetStr: string): string => {
        if (!zuluTime || zuluTime === '-') return '-';
        const cleanT = zuluTime.replace(':', '');
        if (cleanT.length !== 4) return zuluTime;

        if (!offsetStr || offsetStr.length !== 5) return zuluTime;
        const sign = offsetStr.charAt(0);
        const hrs = parseInt(offsetStr.substring(1, 3), 10);
        const mins = parseInt(offsetStr.substring(3, 5), 10);
        if (isNaN(hrs) || isNaN(mins)) return zuluTime;

        let diffMins = hrs * 60 + mins;
        if (sign === 'M') diffMins = -diffMins;
        else if (sign !== 'P' && sign !== 'Z') return zuluTime;

        const h = parseInt(cleanT.substring(0, 2), 10);
        const m = parseInt(cleanT.substring(2, 4), 10);

        let totalMins = h * 60 + m + diffMins;
        // Handle day wrapping
        while (totalMins < 0) totalMins += 1440;
        while (totalMins >= 1440) totalMins -= 1440;

        const resH = Math.floor(totalMins / 60);
        const resM = totalMins % 60;
        return `${resH.toString().padStart(2, '0')}:${resM.toString().padStart(2, '0')}`;
    };

    let globalEstAta = '';
    let lastAtaIdx = -1;
    for (let j = waypointEntries.length - 1; j >= 0; j--) {
        const ataClean = waypointInputs[j]?.ata?.replace(':', '');
        if (ataClean && ataClean.length === 4) {
            lastAtaIdx = j;
            break;
        }
    }
    if (lastAtaIdx !== -1) {
        const lastWp = waypointEntries[lastAtaIdx];
        const remainingMinutes = flightData.tripTime - lastWp.stm;
        globalEstAta = calculateEta(waypointInputs[lastAtaIdx].ata, remainingMinutes) || '';
    }

    return (
        <div className="h-full flex flex-col pt-0 overflow-hidden">
            {/* Waypoint Edit Modal â€” at root level to escape backdrop-filter containment */}
            {activeSubTab === 'enroute' && editingWpIdx !== null && !waypointEntries[editingWpIdx]?.isFir && (() => {
                const wp = waypointEntries[editingWpIdx];
                const modalInput = waypointInputs[editingWpIdx] || { ata: '', fuel: '', freq: '' };
                const plnEta = calculateEta(takeoffTime, wp.stm);
                const closeModal = () => { setEditingWpIdx(null); setShowDirectToPicker(false); };
                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={closeModal}>
                        <div className="bg-[#0f1117] border border-white/10 rounded-2xl p-5 w-80 shadow-2xl" onClick={e => e.stopPropagation()}>

                            {/* Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <Navigation className="w-4 h-4 text-aviation-accent" />
                                        <span className="text-sm font-bold text-white font-mono">{wp.name}</span>
                                    </div>
                                    {plnEta && <span className="text-[10px] text-aviation-warning font-mono font-bold mt-0.5 ml-6">PLN ETA: {plnEta} Z</span>}
                                </div>
                                <button onClick={closeModal} className="text-slate-500 hover:text-white transition-colors p-1">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {showDirectToPicker ? (
                                /* â”€â”€ Picker mode: choose the Direct-To target â”€â”€ */
                                <>
                                    <div className="flex items-center gap-2 mb-3">
                                        <button onClick={() => setShowDirectToPicker(false)} className="text-slate-500 hover:text-white transition-colors p-0.5">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                        <span className="text-[9px] font-bold text-sky-400 uppercase tracking-widest">Select Direct-To Waypoint</span>
                                    </div>
                                    <div className="overflow-y-auto max-h-60 space-y-1 custom-scrollbar pr-1">
                                        {waypointEntries
                                            .map((wpe, absIdx) => ({ wpe, absIdx }))
                                            .filter(({ wpe, absIdx }) => !wpe.isFir && absIdx > editingWpIdx)
                                            .map(({ wpe, absIdx }) => {
                                                const eta = calculateEta(takeoffTime, wpe.stm);
                                                return (
                                                    <button
                                                        key={absIdx}
                                                        onClick={() => {
                                                            setDirectSegments(prev => [...prev, { from: editingWpIdx, to: absIdx }]);
                                                            closeModal();
                                                        }}
                                                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 hover:bg-sky-500/10 border border-transparent hover:border-sky-500/30 transition-colors text-left"
                                                    >
                                                        <span className="font-mono text-sm font-bold text-white">{wpe.name}</span>
                                                        {eta && <span className="text-[10px] font-mono text-aviation-warning">{eta} Z</span>}
                                                    </button>
                                                );
                                            })}
                                    </div>
                                </>
                            ) : (
                                /* â”€â”€ Normal mode: ATA / Fuel / Freq / Direct-To button â”€â”€ */
                                <>
                                    <div className="mb-3">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">ATA (Z)</label>
                                        <HybridTimeInput
                                            value={modalInput.ata}
                                            onChange={(val) => handleInputChange(editingWpIdx, 'ata', val)}
                                            className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2.5 font-mono text-sm focus:outline-none focus:border-aviation-accent text-white w-full"
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">ACT Fuel (t)</label>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={modalInput.fuel}
                                            onChange={(e) => handleInputChange(editingWpIdx, 'fuel', e.target.value)}
                                            placeholder="0.0"
                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 font-mono text-sm focus:outline-none focus:border-aviation-accent text-white"
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Frequency (VHF / HF)</label>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={modalInput.freq || ''}
                                            onChange={(e) => handleInputChange(editingWpIdx, 'freq', e.target.value)}
                                            placeholder="e.g. 123.450 or 8918"
                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 font-mono text-sm focus:outline-none focus:border-aviation-accent text-white"
                                        />
                                    </div>
                                    <div className="border-t border-white/10 pt-3 space-y-2">
                                        {(() => {
                                            const segFromHere = directSegments.find(s => s.from === editingWpIdx);
                                            return segFromHere ? (
                                                <>
                                                    <button
                                                        onClick={() => setDirectSegments(prev => prev.filter(s => s !== segFromHere))}
                                                        className="w-full py-2 rounded-lg bg-sky-500/20 border border-sky-500/50 text-sky-400 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors hover:bg-sky-500/30"
                                                    >
                                                        <X className="w-3.5 h-3.5" /> Cancel Direct â†’ {waypointEntries[segFromHere.to]?.name}
                                                    </button>
                                                    <button
                                                        onClick={() => setShowDirectToPicker(true)}
                                                        className="w-full py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 hover:border-sky-500/30 text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
                                                    >
                                                        <Navigation className="w-3 h-3" /> New Direct To...
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => setShowDirectToPicker(true)}
                                                    className="w-full py-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 hover:border-sky-500/30 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
                                                >
                                                    <Navigation className="w-3.5 h-3.5" /> Direct To...
                                                </button>
                                            );
                                        })()}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                );
            })()}
            {/* Combined header + tab bar */}
            <div className="px-2 mb-1 shrink-0 flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5 shrink-0">
                    <Navigation className="w-4 h-4 text-aviation-accent" />
                    <span className="hidden md:inline">Inflight</span>
                </h3>
                <div className="flex p-0.5 bg-white/5 rounded-lg border border-white/5">
                    {['departure', 'enroute', 'arrival', 'notes'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveSubTab(tab as SubTab)}
                            className={cn(
                                "px-3 md:px-4 py-1 md:py-1.5 rounded-md text-[9px] md:text-[10px] font-bold uppercase tracking-widest transition-all",
                                activeSubTab === tab
                                    ? "bg-aviation-accent text-black shadow-lg shadow-aviation-accent/20"
                                    : "text-slate-500 hover:text-slate-300"
                            )}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
                <div className="hidden md:flex items-center gap-4 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5 shrink-0">
                    <div className="flex flex-col text-left">
                        <span className="text-[9px] text-slate-500 font-bold tracking-widest uppercase">Dest Local</span>
                        <span className="text-base font-mono font-bold text-aviation-accent leading-none mt-0.5">{getLocalTime(currentTime, flightData.destTimezoneOffset || '')}</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0">

                <div className="flex-1 glass-panel !p-0 overflow-hidden flex flex-col min-h-0">
                    {activeSubTab === 'departure' && (
                        <div className="flex-1 p-3 md:p-5 pt-0 md:pt-0 space-y-3 md:space-y-5 overflow-y-auto custom-scrollbar">
                            <div className="flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-7 h-7 md:w-9 md:h-9 rounded-full bg-aviation-success/10 flex items-center justify-center">
                                        <Plane className="w-3.5 h-3.5 md:w-4 md:h-4 text-aviation-success rotate-45" />
                                    </div>
                                    <div>
                                        <h4 className="text-xs md:text-base font-bold text-white">Departure: {flightData.departure}</h4>
                                        <p className="text-[9px] text-slate-500 uppercase tracking-widest">Origin Airport</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-[8px] md:text-[9px] font-bold text-slate-500 uppercase tracking-widest">STD</span>
                                    <p className="text-md md:text-lg font-mono font-bold text-aviation-warning">
                                        {flightData.std.includes('/') ? `${flightData.std.split('/')[1].substring(0, 2)}:${flightData.std.split('/')[1].substring(2, 4)}` : flightData.std}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 md:gap-4">
                                <div className="space-y-1 md:space-y-2">
                                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-widest">Block Off Time Z</label>
                                    <HybridTimeInput
                                        value={formatTimeForInput(waypointInputs[-1]?.ata)}
                                        onChange={(val) => handleInputChange(-1, 'ata', val)}
                                        className="w-40 bg-black/40 border border-white/10 rounded-lg md:rounded-xl p-2 md:p-3 font-mono text-sm md:text-base focus:outline-none focus:border-aviation-accent text-white"
                                    />
                                    {(() => {
                                        const blockOff = waypointInputs[-1]?.ata;
                                        const blockOffClean = blockOff?.replace(':', '') || '';
                                        if (blockOffClean.length !== 4) return null;
                                        const stdClean = flightData.std.includes('/') ? flightData.std.split('/')[1] : flightData.std;
                                        const delay = diffMinutes(blockOffClean, stdClean);
                                        return (
                                            <p className={cn("text-[10px] font-bold uppercase", delay > 0 ? "text-aviation-warning" : "text-aviation-success")}>
                                                {delay > 0 ? `Delay: +${delay} min` : `Early: ${Math.abs(delay)} min`}
                                            </p>
                                        );
                                    })()}
                                </div>
                                <div className="space-y-1 md:space-y-2">
                                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-widest">T.O Time Z</label>
                                    <HybridTimeInput
                                        value={takeoffTime}
                                        onChange={setTakeoffTime}
                                        className="w-40 bg-black/40 border border-white/10 rounded-lg md:rounded-xl p-2 md:p-3 font-mono text-sm md:text-base focus:outline-none focus:border-aviation-accent text-white"
                                    />
                                    {takeoffTime && (
                                        <p className="text-[10px] font-bold uppercase text-aviation-accent">
                                            EST ETA: {calculateEta(takeoffTime, flightData.tripTime)} Z
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 md:gap-4">
                                <div className="space-y-1 md:space-y-2">
                                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-widest">
                                        <div className="flex flex-col">
                                            <span>Actual T.O Weight</span>
                                            <span className="text-[8px] text-slate-600 font-normal normal-case whitespace-nowrap -mt-0.5">ETOW: {formatNumber(flightData.etow)}</span>
                                        </div>
                                    </label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={formatNumber(effectiveAtow)}
                                        onChange={(e) => {
                                            const rawValue = e.target.value.replace(/[^\d]/g, '');
                                            setInflightData({ atow: rawValue });
                                        }}
                                        placeholder={`e.g. ${flightData.etow}`}
                                        className={cn(
                                            "w-48 bg-black/40 border rounded-lg md:rounded-xl p-2 md:p-3 font-mono text-sm md:text-base focus:outline-none focus:border-aviation-accent text-white",
                                            effectiveAtow && Number(effectiveAtow) > Number(flightData.mtow) ? "border-red-500/50 bg-red-500/10" : "border-white/10"
                                        )}
                                    />
                                    {effectiveAtow && Number(effectiveAtow) > Number(flightData.mtow) && (
                                        <p className="text-[10px] font-bold text-red-500 uppercase mt-1 animate-pulse">
                                            EXCEEDS MTOW! ({formatNumber(flightData.mtow)})
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-1 md:space-y-2">
                                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-widest">
                                        <div className="flex flex-col">
                                            <span>Actual T.O Fuel</span>
                                            <span className="text-[8px] text-slate-600 font-normal normal-case whitespace-nowrap -mt-0.5">Ramp: {formatNumber(flightData.rampFuel)}</span>
                                        </div>
                                    </label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={formatNumber(effectiveAtf)}
                                        onChange={(e) => {
                                            const rawValue = e.target.value.replace(/[^\d]/g, '');
                                            setInflightData({ atf: rawValue });
                                        }}
                                        placeholder={`e.g. ${tacticalAtf}`}
                                        className="w-48 bg-black/40 border border-white/10 rounded-lg md:rounded-xl p-2 md:p-3 font-mono text-sm md:text-base focus:outline-none focus:border-aviation-accent text-white"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 space-y-1 md:space-y-2 min-h-0">
                                <label className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest">Departure ATIS / CLEARANCE</label>
                                <textarea
                                    value={data.departureATIS || ''}
                                    onChange={(e) => setInflightData({ departureATIS: e.target.value })}
                                    placeholder="ATIS Info D, QNH 1013..."
                                    className="w-full flex-1 bg-black/40 border border-white/10 rounded-lg md:rounded-xl p-2 md:p-3 font-mono text-xs md:text-sm min-h-[80px] focus:outline-none focus:border-aviation-accent resize-none text-white"
                                />
                            </div>
                        </div>
                    )}

                    {activeSubTab === 'enroute' && (
                        <>
                            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">


                                {(() => {
                                    if (!flightData) return null;
                                    const isOverMTOW = effectiveAtow && Number(effectiveAtow) > Number(flightData.mtow);
                                    const actualTOW = isOverMTOW ? Number(flightData.etow) : (parseFloat(effectiveAtow) || Number(flightData.mtow));
                                    const mlw = Number(flightData.mlw) || 0;

                                    // To calculate fuel burn correctly, we need the planned fuel at the start of the nav log
                                    // as a reference. This handles Lido plans where RFOB column might exclude extra fuel.
                                    const firstWpWithFuel = waypointEntries.find(wp => !wp.isFir && wp.rfob > 0);
                                    const startRfob = firstWpWithFuel ? firstWpWithFuel.rfob : 0;

                                    let mlwWaypointIdx = -1;
                                    let hideBanner = false;
                                    if (mlw > 0) {
                                        if (actualTOW <= mlw) {
                                            hideBanner = true;
                                        } else {
                                            for (let i = 0; i < waypointEntries.length; i++) {
                                                if (waypointEntries[i].isFir || waypointEntries[i].rfob === 0) continue;

                                                const plannedBurn = (startRfob - waypointEntries[i].rfob) * 1000;
                                                const estWeight = actualTOW - plannedBurn;

                                                if (estWeight <= mlw) {
                                                    mlwWaypointIdx = i;
                                                    const mlwWpEta = calculateEta(takeoffTime, waypointEntries[i].stm);
                                                    if (mlwWpEta && currentTime && mlwWpEta !== '-' && currentTime !== '-') {
                                                        if (diffMinutes(mlwWpEta, currentTime) <= 0) {
                                                            hideBanner = true;
                                                        }
                                                    }
                                                    break;
                                                }
                                            }
                                        }
                                    }

                                    return (
                                        <>
                                            {mlwWaypointIdx !== -1 && !hideBanner && (
                                                <div className="bg-aviation-warning/10 border-b border-aviation-warning/30 px-4 py-1 flex items-center justify-between shrink-0 z-20">
                                                    <div className="flex items-center gap-2">
                                                        <Plane className="w-3.5 h-3.5 text-aviation-warning -rotate-45" />
                                                        <span className="text-[10px] md:text-xs font-bold text-aviation-warning uppercase tracking-widest">
                                                            Below MLW At: <span className="text-white font-mono">{waypointEntries[mlwWaypointIdx].name}</span>
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-tight">Time</span>
                                                            <span className="text-xs md:text-sm font-mono font-bold text-aviation-warning leading-tight">
                                                                {(() => {
                                                                    const mlwWpEta = calculateEta(takeoffTime, waypointEntries[mlwWaypointIdx].stm);
                                                                    if (!mlwWpEta || !currentTime || mlwWpEta === '-' || currentTime === '-') return '--';
                                                                    const minsLeft = diffMinutes(mlwWpEta, currentTime);
                                                                    if (minsLeft <= 0) return '0h 00m'; // Handled by hideBanner, but safe fallback
                                                                    return `${Math.floor(minsLeft / 60)}h ${(minsLeft % 60).toString().padStart(2, '0')}m`;
                                                                })()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex-1 overflow-auto custom-scrollbar">
                                                <table className="w-full text-left border-collapse min-w-[700px]">
                                                    <thead className="sticky top-0 z-10 bg-[#0a0a0a]">
                                                        <tr className="bg-white/5 border-b border-white/5">
                                                            <th className="px-2 py-1 text-[8px] md:text-[9px] font-bold uppercase tracking-widest text-slate-500">Waypoint</th>
                                                            <th className="px-2 py-1 text-[8px] md:text-[9px] font-bold uppercase tracking-widest text-slate-500 text-center">TRK/DIS</th>
                                                            <th className="px-2 py-1 text-[8px] md:text-[9px] font-bold uppercase tracking-widest text-slate-500 text-center">PLN ETA</th>
                                                            <th className="px-2 py-1 text-[8px] md:text-[9px] font-bold uppercase tracking-widest text-slate-500 text-center">ATA (Z)</th>
                                                            <th className="px-2 py-1 text-[8px] md:text-[9px] font-bold uppercase tracking-widest text-slate-500 text-center">PLN Fuel</th>
                                                            <th className="px-2 py-1 text-[8px] md:text-[9px] font-bold uppercase tracking-widest text-slate-500 text-center">ACT Fuel</th>
                                                            <th className="px-2 py-1 text-[8px] md:text-[9px] font-bold uppercase tracking-widest text-slate-500 text-center">
                                                                <div className="flex flex-col leading-tight">
                                                                    <span>PLAN REM: {flightData.planRem || '-'}</span>
                                                                    <span>PLAN REQ: {flightData.planReq || '-'}</span>
                                                                </div>
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/5">
                                                        {waypointEntries.map((wp, idx) => {
                                                            const input = waypointInputs[idx] || { ata: '', fuel: '', freq: '' };
                                                            const isHighlight = idx === activeIndex;
                                                            const isMlwWaypoint = idx === mlwWaypointIdx;
                                                            const isEtops = wp.name.includes('ENTRY') || wp.name.includes('EXIT') || wp.name.includes('ETP');
                                                            const isSkipped = directSegments.some(seg => idx > seg.from && idx < seg.to);
                                                            const isDirectTarget = directSegments.some(seg => seg.to === idx);
                                                            const isDirectFrom = directSegments.some(seg => seg.from === idx);
                                                            const directFromSeg = directSegments.find(s => s.from === idx);


                                                            const firstWpWithFuel = waypointEntries.find(w => !w.isFir && w.rfob > 0);
                                                            const startRfob = firstWpWithFuel ? firstWpWithFuel.rfob : 0;
                                                            const actualTakeoffFuel = parseFloat(effectiveAtf) || Number(flightData.rampFuel) || 0;
                                                            const planTofKg = startRfob * 1000;
                                                            
                                                            const expectedFuel = wp.rfob > 0 ? wp.rfob + (actualTakeoffFuel - planTofKg) / 1000 : 0;
                                                            const actFuel = parseFloat(input.fuel);
                                                            const diff = !isNaN(actFuel) ? (actFuel - expectedFuel).toFixed(1) : null;

                                                            const plnEta = wp.isFir ? null : calculateEta(takeoffTime, wp.stm);
                                                            const ataDiff = (input.ata && input.ata.replace(':', '').length === 4 && plnEta)
                                                                ? diffMinutes(input.ata, plnEta) : null;

                                                            return (
                                                                <tr
                                                                    key={idx}
                                                                    ref={el => { rowRefs.current[idx] = el; }}
                                                                    onClick={() => { if (!wp.isFir) setEditingWpIdx(idx); }}
                                                                    className={cn(
                                                                        "transition-colors border-l-4",
                                                                        !wp.isFir && "cursor-pointer",
                                                                        isHighlight
                                                                            ? "bg-white/10 border-aviation-accent shadow-md z-10 relative"
                                                                            : isDirectTarget || isDirectFrom
                                                                                ? "border-sky-400 bg-sky-500/5 hover:bg-sky-500/10"
                                                                                : isSkipped
                                                                                    ? "border-sky-400/40 hover:bg-white/5"
                                                                                    : "border-transparent hover:bg-white/5",
                                                                        isMlwWaypoint && !isHighlight && !isDirectTarget && !isDirectFrom ? "bg-aviation-warning/10" : "",
                                                                        wp.isFir && !isHighlight ? "bg-aviation-accent/5" : "",
                                                                        isSkipped ? "opacity-40" : ""
                                                                    )}
                                                                >
                                                                    <td className="px-2 py-1 md:py-1.5">
                                                                        <div className="flex items-center gap-2">
                                                                            {wp.isFir ? (
                                                                                <div className="flex items-center gap-2 text-aviation-accent">
                                                                                    <MapPin className="w-3 h-3" />
                                                                                    <span className="text-[10px] md:text-xs font-bold uppercase">{wp.name}</span>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="flex items-center gap-2">
                                                                                    {isDirectTarget ? <Navigation className="w-3 h-3 text-sky-400" /> :
                                                                                        isMlwWaypoint ? <Plane className="w-3 h-3 text-aviation-warning -rotate-45" /> :
                                                                                            wp.isToc ? <CheckCircle2 className="w-3 h-3 text-aviation-success" /> :
                                                                                                wp.isTod ? <AlertCircle className="w-3 h-3 text-aviation-warning" /> :
                                                                                                    <Navigation className="w-3 h-3 text-slate-500" />}
                                                                                    <div className="flex flex-col">
                                                                                        {wp.procedure && (
                                                                                            <span className="text-[9px] font-bold text-aviation-accent uppercase tracking-tighter leading-none mb-0.5">{wp.procedure}</span>
                                                                                        )}
                                                                                        <div className="flex items-center gap-1 flex-wrap">
                                                                                            <span className={cn("text-xs md:text-sm font-bold font-mono", isEtops ? "text-amber-400" : "text-white")}>{wp.name}</span>
                                                                                            {directFromSeg && (
                                                                                                <span className="text-[8px] font-bold text-sky-400 bg-sky-500/20 border border-sky-400/50 rounded px-1 py-px font-mono whitespace-nowrap">
                                                                                                    {`DCT\u2192${waypointEntries[directFromSeg.to]?.name ?? "?"}`}
                                                                                                </span>
                                                                                            )}
                                                                                            {isDirectTarget && (
                                                                                                <span className="text-[8px] font-bold text-sky-400 bg-sky-500/20 border border-sky-400/50 rounded px-1 py-px font-mono whitespace-nowrap">
                                                                                                    {"\u25c4DCT"}
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                        {isMlwWaypoint && <span className="text-[8px] font-bold text-aviation-warning uppercase tracking-widest">&lt; MLW</span>}
                                                                                        {isEtops && <span className="text-[8px] font-bold text-amber-500 uppercase tracking-widest">ETOPS POINT</span>}
                                                                                        {input.freq && (
                                                                                            <span className="text-[11px] font-mono text-sky-400 mt-0.5 flex items-center gap-0.5">
                                                                                                <Radio className="w-2.5 h-2.5" />{input.freq}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-2 py-1 md:py-1.5 text-center">
                                                                        <div className="flex flex-col items-center justify-center font-mono text-[10px] md:text-xs">
                                                                            <span className="text-aviation-accent">{wp.isFir ? '-' : (wp.itt || '-')}</span>
                                                                            {!wp.isFir && wp.dis && (
                                                                                <span className="text-slate-500 text-[8px] md:text-[9px] mt-0.5">{wp.dis} NM</span>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-2 py-1 md:py-1.5 font-mono text-[10px] md:text-xs text-aviation-warning font-bold text-center">
                                                                        {wp.isFir ? '-' : (calculateEta(takeoffTime, wp.stm) || '-')}
                                                                    </td>
                                                                    <td className="px-2 py-1 md:py-1.5 text-center">
                                                                        {!wp.isFir && (
                                                                            <div className="flex items-center justify-center gap-1">
                                                                                <span className={cn("font-mono text-[10px] md:text-xs font-bold", input.ata ? "text-aviation-success" : "text-slate-600")}>
                                                                                    {input.ata || '--:--'}
                                                                                </span>
                                                                                {ataDiff !== null && ataDiff !== 0 && (
                                                                                    <span className={cn("text-[9px] font-mono font-bold whitespace-nowrap", ataDiff > 0 ? "text-red-500" : "text-aviation-success")}>
                                                                                        {ataDiff > 0 ? `+${ataDiff}` : `-${Math.abs(ataDiff)}`}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-2 py-1 md:py-1.5 font-mono text-[10px] md:text-xs text-slate-400 text-center">
                                                                        {wp.isFir ? '-' : wp.rfob.toFixed(1)}
                                                                    </td>
                                                                    <td className="px-2 py-1 md:py-1.5 text-center">
                                                                        {!wp.isFir && (
                                                                            <span className={cn("font-mono text-[10px] md:text-xs font-bold", input.fuel ? "text-white" : "text-slate-600")}>
                                                                                {input.fuel || '-'}
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className={cn(
                                                                        "px-2 py-1 md:py-1.5 font-mono text-[10px] md:text-xs font-bold text-center",
                                                                        diff === null ? "text-slate-500" : (parseFloat(diff) >= 0 ? "text-aviation-success" : "text-aviation-warning")
                                                                    )}>
                                                                        {!wp.isFir ? (diff ? (parseFloat(diff) > 0 ? `+${diff}` : diff) : '-') : ''}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>

                            <div className="grid grid-cols-4 gap-1 py-0 px-1 bg-white/5 border-t border-white/5 shrink-0 w-full">
                                {/* GW — live gross weight at current waypoint */}
                                {(() => {
                                    const azfw = parseInt(effectiveAtow || '0') - parseInt(effectiveAtf || '0');
                                    const wpes = flightData.waypointEntries || [];

                                    // Use the robust activeIndex already calculated globally
                                    const currentWpIdx = activeIndex !== -1 ? activeIndex : null;

                                    // Fuel at current waypoint: actual if logged, else plan rfob + takeoff delta
                                    let fuelKg = parseInt(effectiveAtf || '0'); // default = takeoff fuel
                                    if (currentWpIdx !== null && wpes[currentWpIdx]) {
                                        const inp = waypointInputs[currentWpIdx];
                                        if (inp?.fuel) {
                                            fuelKg = Math.round(parseFloat(inp.fuel) * 1000);
                                        } else {
                                            // Expected Fuel Logic (matches table rows)
                                            const firstWpWithFuel = wpes.find(w => !w.isFir && w.rfob > 0);
                                            const startRfob = firstWpWithFuel ? firstWpWithFuel.rfob : 0;
                                            const actualTakeoffFuel = parseFloat(effectiveAtf) || Number(flightData.rampFuel) || 0;
                                            const planTofKg = startRfob * 1000;
                                            
                                            const fuelDelta = (actualTakeoffFuel - planTofKg);
                                            fuelKg = Math.round(wpes[currentWpIdx].rfob * 1000) + fuelDelta;
                                        }
                                    }

                                    const gw = azfw + fuelKg;
                                    const mlw = Number(flightData.mlw) || 0;
                                    const mtow = Number(flightData.mtow) || 0;
                                    const isBelowMlw = mlw > 0 && gw <= mlw;
                                    const isOverMtow = mtow > 0 && gw > mtow;
                                    const wpLabel = (currentWpIdx !== null && wpes[currentWpIdx])
                                        ? wpes[currentWpIdx].name : 'T/O';
                                    return (
                                        <InflightStat
                                            label={`GW @ ${wpLabel}`}
                                            value={formatNumber(gw)}
                                            success={isBelowMlw && !isOverMtow}
                                            error={isOverMtow}
                                            info={isOverMtow ? 'MTOW!' : (mlw ? `MLW: ${formatNumber(mlw)}` : undefined)}
                                        />
                                    );
                                })()}
                                {(() => {
                                    const staClean = flightData.sta.includes('/') ? flightData.sta.split('/')[1] : flightData.sta;
                                    const staFmt = flightData.sta.includes('/') ? `${staClean.substring(0, 2)}:${staClean.substring(2, 4)}` : flightData.sta;
                                    const localSta = getLocalTime(staFmt, flightData.destTimezoneOffset || '');
                                    return (
                                        <InflightStat
                                            label="DEST STA"
                                            value={staFmt}
                                            localTime={localSta}
                                            warning
                                        />
                                    );
                                })()}
                                {(() => {
                                    const eta = calculateEta(takeoffTime, flightData.tripTime);
                                    const staClean = flightData.sta.includes('/') ? flightData.sta.split('/')[1] : flightData.sta;
                                    const delay = diffMinutes(eta || '', staClean);
                                    const localEta = getLocalTime(eta, flightData.destTimezoneOffset || '');
                                    return (
                                        <InflightStat
                                            label="DEST ETA"
                                            value={eta || '-'}
                                            localTime={localEta}
                                            error={eta ? delay > 0 : false}
                                            success={eta ? delay <= 0 : false}
                                            info={eta ? (delay === 0 ? "ON TIME" : delay > 0 ? `+${delay} MIN` : `-${Math.abs(delay)} MIN`) : undefined}
                                        />
                                    );
                                })()}
                                {(() => {
                                    const staClean = flightData.sta.includes('/') ? flightData.sta.split('/')[1] : flightData.sta;
                                    const delay = diffMinutes(globalEstAta || '', staClean);
                                    const localAta = getLocalTime(globalEstAta, flightData.destTimezoneOffset || '');
                                    return (
                                        <InflightStat
                                            label="DEST ATA (EST)"
                                            value={globalEstAta || '-'}
                                            localTime={localAta}
                                            error={globalEstAta ? delay > 0 : false}
                                            info={globalEstAta ? (delay === 0 ? "ON TIME" : delay > 0 ? `+${delay} MIN` : `-${Math.abs(delay)} MIN`) : undefined}
                                        />
                                    );
                                })()}
                            </div>
                        </>
                    )}

                    {activeSubTab === 'arrival' && (
                        <div className="flex-1 p-3 md:p-5 pt-0 md:pt-0 space-y-3 md:space-y-5 overflow-y-auto custom-scrollbar text-white">
                            <div className="flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-7 h-7 md:w-9 md:h-9 rounded-full bg-aviation-accent/10 flex items-center justify-center">
                                        <Plane className="w-3.5 h-3.5 md:w-4 md:h-4 text-aviation-accent -rotate-45" />
                                    </div>
                                    <div>
                                        <h4 className="text-xs md:text-base font-bold">Arrival: {flightData.arrival}</h4>
                                        <p className="text-[9px] text-slate-500 uppercase tracking-widest">Destination Airport</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-[8px] md:text-[9px] font-bold text-slate-500 uppercase tracking-widest">STA</span>
                                    <p className="text-md md:text-lg font-mono font-bold text-aviation-warning">
                                        {flightData.sta.includes('/') ? `${flightData.sta.split('/')[1].substring(0, 2)}:${flightData.sta.split('/')[1].substring(2, 4)}` : flightData.sta}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 md:gap-4">
                                <div className="space-y-1 md:space-y-2">
                                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-widest">Touchdown Time Z</label>
                                    <HybridTimeInput
                                        value={formatTimeForInput(waypointInputs[998]?.ata || globalEstAta)}
                                        onChange={(val) => handleInputChange(998, 'ata', val)}
                                        className="w-40 bg-black/40 border border-white/10 rounded-lg md:rounded-xl p-2 md:p-3 font-mono text-sm md:text-base focus:outline-none focus:border-aviation-accent text-white"
                                    />
                                </div>
                                <div className="space-y-1 md:space-y-2">
                                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-widest">Block On Time Z</label>
                                    <HybridTimeInput
                                        value={formatTimeForInput(waypointInputs[999]?.ata)}
                                        onChange={(val) => handleInputChange(999, 'ata', val)}
                                        className="w-40 bg-black/40 border border-white/10 rounded-lg md:rounded-xl p-2 md:p-3 font-mono text-sm md:text-base focus:outline-none focus:border-aviation-accent text-white"
                                    />
                                    {(() => {
                                        const blockOn = waypointInputs[999]?.ata;
                                        const blockOnClean = blockOn?.replace(':', '') || '';
                                        if (blockOnClean.length !== 4) return null;
                                        const staClean = flightData.sta.includes('/') ? flightData.sta.split('/')[1] : flightData.sta;
                                        const delay = diffMinutes(blockOnClean, staClean);
                                        return (
                                            <p className={cn("text-[10px] font-bold uppercase", delay > 0 ? "text-aviation-warning text-red-500" : "text-aviation-success")}>
                                                {delay > 0 ? `Delay: ${delay} min` : (delay === 0 ? "Early" : `Early: ${Math.abs(delay)} min`)}
                                            </p>
                                        );
                                    })()}
                                </div>
                            </div>

                            <div className="flex-1 space-y-1 md:space-y-2 min-h-0">
                                <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-widest">Arrival ATIS</label>
                                <textarea
                                    value={data.arrivalATIS || ''}
                                    onChange={(e) => setInflightData({ arrivalATIS: e.target.value })}
                                    placeholder="ATIS Info X, QNH 1010..."
                                    className="w-full flex-1 bg-black/40 border border-white/10 rounded-lg md:rounded-xl p-2 md:p-3 font-mono text-xs md:text-sm min-h-[80px] focus:outline-none focus:border-aviation-accent resize-none text-white"
                                />
                            </div>
                        </div>
                    )
                    }

                    {
                        activeSubTab === 'notes' && (
                            <div className="flex-1 flex flex-col p-4 md:p-6 min-h-0">
                                <textarea
                                    value={data.notes || ''}
                                    onChange={(e) => setInflightData({ notes: e.target.value })}
                                    placeholder="Jot down ATC clearances, frequencies, or temporary numbers here..."
                                    className="w-full flex-1 bg-transparent text-aviation-warning font-mono text-sm md:text-xl p-4 md:p-6 outline-none resize-none custom-scrollbar"
                                    style={{ lineHeight: '1.6' }}
                                />
                            </div>
                        )}
                </div>
            </div>
        </div>
    );
}

// â”€â”€â”€ Hybrid Time Input â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Allows direct keyboard entry (HHMM auto-formatted to HH:MM) OR native scroll
// picker via the clock icon button. Works on both desktop and iPad.
interface HybridTimeInputProps {
    value: string;           // HH:MM or empty string
    onChange: (val: string) => void; // emits HH:MM
    className?: string;
    placeholder?: string;
}

function HybridTimeInput({ value, onChange, className, placeholder = 'HH:MM' }: HybridTimeInputProps) {
    const pickerRef = useRef<HTMLInputElement>(null);
    const [localText, setLocalText] = React.useState(value);

    // Keep local text in sync when the parent updates (e.g. auto-fill from globalEstAta)
    const prevValueRef = useRef(value);
    if (prevValueRef.current !== value) {
        prevValueRef.current = value;
        setLocalText(value);
    }

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/\D/g, '').substring(0, 4);
        let display = raw;
        if (raw.length >= 3) {
            display = `${raw.substring(0, 2)}:${raw.substring(2, 4)}`;
        }
        setLocalText(display);
        if (raw.length === 4) {
            onChange(display); // emit HH:MM only when complete
        } else if (raw.length === 0) {
            onChange('');
        }
    };

    const handleTextBlur = () => {
        // Snap back to last valid value if the user left it incomplete
        if (value) {
            setLocalText(value);
        } else if (localText && localText.replace(':', '').length !== 4) {
            setLocalText('');
        }
    };

    const handlePickerClick = () => {
        try {
            pickerRef.current?.showPicker?.();
        } catch {
            pickerRef.current?.focus();
            pickerRef.current?.click();
        }
    };

    const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalText(e.target.value);
        onChange(e.target.value); // native <input type="time"> emits HH:MM
    };

    return (
        <div className="flex items-center gap-1.5">
            <input
                type="text"
                inputMode="numeric"
                value={localText}
                onChange={handleTextChange}
                onBlur={handleTextBlur}
                placeholder={placeholder}
                maxLength={5}
                className={className}
            />
            <button
                type="button"
                onClick={handlePickerClick}
                className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
                title="Open time picker"
            >
                <Clock className="w-3.5 h-3.5" />
            </button>
            {/* Hidden native time picker â€” triggered by the clock button */}
            <input
                ref={pickerRef}
                type="time"
                value={value}
                onChange={handlePickerChange}
                className="sr-only absolute pointer-events-none"
                tabIndex={-1}
                aria-hidden="true"
            />
        </div>
    );
}

function InflightStat({ label, value, localTime, warning, success, error, info }: { label: string, value: string, localTime?: string, warning?: boolean, success?: boolean, error?: boolean, info?: string }) {
    return (
        <div className="flex flex-col items-center justify-center p-0.5 relative">
            <span className="text-[8px] md:text-[9px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
            <div className="flex flex-col items-center">
                <span className={cn(
                    "text-xs md:text-base font-mono font-bold leading-none",
                    error ? "text-red-500" : success ? "text-aviation-success" : warning ? "text-aviation-warning" : "text-aviation-accent"
                )}>
                    {value}
                </span>
                {localTime && localTime !== '-' && (
                    <span className="text-[9px] md:text-[10px] font-mono font-medium text-slate-400 leading-none">
                        L: {localTime}
                    </span>
                )}
            </div>
            {info && (
                <span className={cn(
                    "text-[8px] md:text-[9px] font-bold leading-none",
                    error ? "text-red-500" : success ? "text-aviation-success" : warning ? "text-aviation-warning" : "text-aviation-accent"
                )}>
                    {info}
                </span>
            )}
        </div>
    );
}



