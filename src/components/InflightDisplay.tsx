import React, { useState, useRef, useEffect } from 'react';
import {
    MapPin,
    AlertCircle,
    CheckCircle2,
    Navigation,
    Plane,
    ZoomIn,
    ZoomOut,
    RotateCcw,
    RotateCw
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';

type SubTab = 'departure' | 'enroute' | 'arrival' | 'notes';

interface InflightDisplayProps {
    initialSubTab?: SubTab;
}

interface WaypointInput {
    ata: string;
    fuel: string;
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
    const [takeoffTime, setTakeoffTime] = useState<string>(
        inflightData?.takeoffTime || ''
    );

    // Update inflightData in store when local state changes
    useEffect(() => {
        setInflightData({ activeSubTab, waypointInputs, takeoffTime });
    }, [activeSubTab, waypointInputs, takeoffTime, setInflightData]);


    const data = inflightData || {
        activeSubTab: 'departure', // This will be overwritten by local state
        waypointInputs: {}, // This will be overwritten by local state
        takeoffTime: '', // This will be overwritten by local state
        departureATIS: '',
        arrivalATIS: '',
        notes: ''
    };

    const [currentTime, setCurrentTime] = useState<string>(new Date().getUTCHours().toString().padStart(2, '0') + new Date().getUTCMinutes().toString().padStart(2, '0'));
    const [activeIndex, setActiveIndex] = useState<number>(-1);

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

    // Derived state for the active index, calculated on the fly instead of effect-driven state if possible,
    // but the scroll behavior requires layout. Let's keep setActiveIndex but suppress or refactor.
    // Instead of an effect setting state, we can just calculate activeIndex during render.
    let calculatedIndex = -1;
    if (flightData?.waypointEntries) {
        const nowNum = parseInt(currentTime, 10);
        for (let i = 0; i < flightData.waypointEntries.length; i++) {
            const wp = flightData.waypointEntries[i];
            if (wp.isFir) continue;
            const eta = calculateEta(takeoffTime, wp.stm);
            if (eta) {
                const etaNum = parseInt(eta.replace(':', ''), 10);
                if (etaNum >= nowNum) {
                    calculatedIndex = i;
                    break;
                }
            }
        }
    }

    if (calculatedIndex !== activeIndex) {
        setActiveIndex(calculatedIndex);
    }

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
                ...(prev[index] || { ata: '', fuel: '' }),
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
        <div className="flex-1 flex flex-col gap-4 min-h-0">
            <div className="flex items-center justify-between shrink-0">
                <div className="flex p-1 bg-white/5 rounded-xl border border-white/5">
                    {['departure', 'enroute', 'arrival', 'notes'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveSubTab(tab as SubTab)}
                            className={cn(
                                "px-4 md:px-6 py-1.5 md:py-2 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all",
                                activeSubTab === tab
                                    ? "bg-aviation-accent text-black shadow-lg shadow-aviation-accent/20"
                                    : "text-slate-500 hover:text-slate-300"
                            )}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="hidden md:flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/5">
                    {[ZoomOut, ZoomIn, RotateCcw, RotateCw].map((Icon, idx) => (
                        <button key={idx} className="p-2 text-slate-500 hover:text-white transition-colors">
                            <Icon className="w-4 h-4" />
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 glass-panel overflow-hidden flex flex-col min-h-0">
                {activeSubTab === 'departure' && (
                    <div className="flex-1 p-4 md:p-8 space-y-4 md:space-y-8 overflow-y-auto custom-scrollbar">
                        <div className="flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-aviation-success/10 flex items-center justify-center">
                                    <Plane className="w-4 h-4 md:w-5 md:h-5 text-aviation-success rotate-45" />
                                </div>
                                <div>
                                    <h4 className="text-sm md:text-lg font-bold text-white">Departure: {flightData.departure}</h4>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">Origin Airport</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest">STD</span>
                                <p className="text-lg md:text-xl font-mono font-bold text-aviation-warning">
                                    {flightData.std.includes('/') ? `${flightData.std.split('/')[1].substring(0, 2)}:${flightData.std.split('/')[1].substring(2, 4)}` : flightData.std}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 md:gap-8">
                            <div className="space-y-1 md:space-y-2">
                                <label className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest">Block Off Time Z</label>
                                <input
                                    type="time"
                                    value={formatTimeForInput(waypointInputs[-1]?.ata)}
                                    onChange={(e) => setWaypointInputs(prev => ({ ...prev, [-1]: { ...prev[-1], ata: e.target.value.replace(':', '') } }))}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg md:rounded-xl p-3 md:p-4 font-mono text-sm md:text-lg focus:outline-none focus:border-aviation-accent text-white"
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
                                <label className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest">Take Off Time Z</label>
                                <input
                                    type="time"
                                    value={takeoffTime}
                                    onChange={(e) => setTakeoffTime(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg md:rounded-xl p-3 md:p-4 font-mono text-sm md:text-lg focus:outline-none focus:border-aviation-accent text-white"
                                />
                                {takeoffTime && (
                                    <p className="text-[10px] font-bold uppercase text-aviation-accent">
                                        EST ETA: {calculateEta(takeoffTime, flightData.tripTime)} Z
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 space-y-1 md:space-y-2 min-h-0">
                            <label className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest">Departure ATIS / CLEARANCE</label>
                            <textarea
                                value={data.departureATIS || ''}
                                onChange={(e) => setInflightData({ departureATIS: e.target.value })}
                                placeholder="ATIS Info D, QNH 1013..."
                                className="w-full flex-1 bg-black/40 border border-white/10 rounded-lg md:rounded-xl p-3 md:p-4 font-mono text-xs md:text-sm min-h-[100px] focus:outline-none focus:border-aviation-accent resize-none text-white"
                            />
                        </div>
                    </div>
                )}

                {activeSubTab === 'enroute' && (
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                        <div className="flex-1 overflow-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse min-w-[600px]">
                                <thead className="sticky top-0 z-10 bg-[#0a0a0a]">
                                    <tr className="bg-white/5 border-b border-white/5">
                                        <th className="px-4 py-3 text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-500">Waypoint</th>
                                        <th className="px-4 py-3 text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-500">TRK/DIS</th>
                                        <th className="px-4 py-3 text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-500">PLN ETA</th>
                                        <th className="px-4 py-3 text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-500">ATA (Z)</th>
                                        <th className="px-4 py-3 text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-500">PLN Fuel</th>
                                        <th className="px-4 py-3 text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-500">ACT Fuel</th>
                                        <th className="px-4 py-3 text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-500">Diff</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {waypointEntries.map((wp, idx) => {
                                        const input = waypointInputs[idx] || { ata: '', fuel: '' };
                                        const isHighlight = idx === activeIndex;
                                        const plnFuel = wp.rfob;
                                        const actFuel = parseFloat(input.fuel);
                                        const diff = !isNaN(actFuel) ? (actFuel - plnFuel).toFixed(1) : null;

                                        return (
                                            <tr
                                                key={idx}
                                                ref={el => { rowRefs.current[idx] = el; }}
                                                className={cn(
                                                    "transition-colors group",
                                                    isHighlight ? "bg-aviation-accent/10" : "hover:bg-white/5",
                                                    wp.isFir ? "bg-aviation-accent/5" : ""
                                                )}
                                            >
                                                <td className="px-4 py-2 md:py-3">
                                                    <div className="flex items-center gap-2">
                                                        {wp.isFir ? (
                                                            <div className="flex items-center gap-2 text-aviation-accent">
                                                                <MapPin className="w-3 h-3" />
                                                                <span className="text-[10px] md:text-xs font-bold uppercase">{wp.name}</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2">
                                                                {wp.isToc ? <CheckCircle2 className="w-3 h-3 text-aviation-warning" /> :
                                                                    wp.isTod ? <AlertCircle className="w-3 h-3 text-aviation-warning" /> :
                                                                        <Navigation className="w-3 h-3 text-slate-500" />}
                                                                <span className="text-xs md:text-sm font-bold text-white font-mono">{wp.name}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2 md:py-3">
                                                    <div className="flex flex-col items-start justify-center font-mono text-[10px] md:text-xs">
                                                        <span className="text-aviation-accent">{wp.isFir ? '-' : (wp.itt || '-')}</span>
                                                        {!wp.isFir && wp.dis && (
                                                            <span className="text-slate-500 text-[8px] md:text-[9px] mt-0.5">{wp.dis} NM</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2 md:py-3 font-mono text-[10px] md:text-xs text-aviation-warning font-bold">
                                                    {wp.isFir ? '-' : (calculateEta(takeoffTime, wp.stm) || '-')}
                                                </td>
                                                <td className="px-4 py-2 md:py-3 relative group/ata">
                                                    {!wp.isFir && (
                                                        <div className="flex items-center gap-1">
                                                            <input
                                                                type="text"
                                                                placeholder="0000"
                                                                value={input.ata}
                                                                onChange={(e) => handleInputChange(idx, 'ata', e.target.value)}
                                                                className="bg-black/40 border border-white/10 rounded px-2 py-0.5 text-[10px] md:text-xs font-mono text-aviation-accent w-16 focus:outline-none focus:border-aviation-accent/50 text-center"
                                                            />
                                                            {(() => {
                                                                if (!input.ata || input.ata.replace(':', '').length !== 4) return null;
                                                                const plnEta = calculateEta(takeoffTime, wp.stm);
                                                                if (!plnEta) return null;
                                                                const diff = diffMinutes(input.ata, plnEta);
                                                                if (diff === 0) return null;
                                                                return (
                                                                    <span className={cn(
                                                                        "text-[9px] font-mono font-bold whitespace-nowrap",
                                                                        diff > 0 ? "text-red-500" : "text-aviation-success"
                                                                    )}>
                                                                        {diff > 0 ? `+${diff}` : `-${Math.abs(diff)}`}
                                                                    </span>
                                                                );
                                                            })()}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2 md:py-3 font-mono text-[10px] md:text-xs text-slate-400">
                                                    {wp.isFir ? '-' : plnFuel.toFixed(1)}
                                                </td>
                                                <td className="px-4 py-2 md:py-3">
                                                    {!wp.isFir && (
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            placeholder="0.0"
                                                            value={input.fuel}
                                                            onChange={(e) => handleInputChange(idx, 'fuel', e.target.value)}
                                                            className="bg-black/40 border border-white/10 rounded px-2 py-0.5 text-[10px] md:text-xs font-mono text-white w-16 focus:outline-none focus:border-aviation-accent/50 text-right"
                                                        />
                                                    )}
                                                </td>
                                                <td className={cn(
                                                    "px-4 py-2 md:py-3 font-mono text-[10px] md:text-xs font-bold",
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

                        <div className="grid grid-cols-3 gap-4 md:gap-6 p-4 bg-white/5 border-t border-white/5 shrink-0">
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
                                        success={globalEstAta ? delay <= 0 : false}
                                        info={globalEstAta ? (delay === 0 ? "ON TIME" : delay > 0 ? `+${delay} MIN` : `-${Math.abs(delay)} MIN`) : undefined}
                                    />
                                );
                            })()}
                        </div>
                    </div>
                )}

                {activeSubTab === 'arrival' && (
                    <div className="flex-1 p-4 md:p-8 space-y-4 md:space-y-8 overflow-y-auto custom-scrollbar text-white">
                        <div className="flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-aviation-accent/10 flex items-center justify-center">
                                    <Plane className="w-4 h-4 md:w-5 md:h-5 text-aviation-accent -rotate-45" />
                                </div>
                                <div>
                                    <h4 className="text-sm md:text-lg font-bold">Arrival: {flightData.arrival}</h4>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">Destination Airport</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest">STA</span>
                                <p className="text-lg md:text-xl font-mono font-bold text-aviation-warning">
                                    {flightData.sta.includes('/') ? `${flightData.sta.split('/')[1].substring(0, 2)}:${flightData.sta.split('/')[1].substring(2, 4)}` : flightData.sta}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 md:gap-8">
                            <div className="space-y-1 md:space-y-2">
                                <label className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest">Touchdown Time Z</label>
                                <input
                                    type="time"
                                    value={formatTimeForInput(waypointInputs[998]?.ata || globalEstAta)}
                                    onChange={(e) => handleInputChange(998, 'ata', e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg md:rounded-xl p-3 md:p-4 font-mono text-sm md:text-lg focus:outline-none focus:border-aviation-accent text-white"
                                />
                            </div>
                            <div className="space-y-1 md:space-y-2">
                                <label className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest">Block On Time Z</label>
                                <input
                                    type="time"
                                    value={formatTimeForInput(waypointInputs[999]?.ata)}
                                    onChange={(e) => handleInputChange(999, 'ata', e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg md:rounded-xl p-3 md:p-4 font-mono text-sm md:text-lg focus:outline-none focus:border-aviation-accent text-white"
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
                            <label className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest">Arrival ATIS</label>
                            <textarea
                                value={data.arrivalATIS || ''}
                                onChange={(e) => setInflightData({ arrivalATIS: e.target.value })}
                                placeholder="ATIS Info X, QNH 1010..."
                                className="w-full flex-1 bg-black/40 border border-white/10 rounded-lg md:rounded-xl p-3 md:p-4 font-mono text-xs md:text-sm min-h-[100px] focus:outline-none focus:border-aviation-accent resize-none text-white"
                            />
                        </div>
                    </div>
                )}

                {activeSubTab === 'notes' && (
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
    );
};

function InflightStat({ label, value, localTime, warning, success, error, info }: { label: string, value: string, localTime?: string, warning?: boolean, success?: boolean, error?: boolean, info?: string }) {
    return (
        <div className="flex flex-col items-center justify-center p-2 relative">
            <span className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</span>
            <div className="flex flex-col items-center">
                <span className={cn(
                    "text-sm md:text-xl font-mono font-bold leading-none",
                    error ? "text-red-500" : success ? "text-aviation-success" : warning ? "text-aviation-warning" : "text-aviation-accent"
                )}>
                    {value}
                </span>
                {localTime && localTime !== '-' && (
                    <span className="text-xs md:text-sm font-mono font-medium text-slate-400 mt-0.5 leading-none">
                        L: {localTime}
                    </span>
                )}
            </div>
            {info && (
                <span className={cn(
                    "text-[8px] md:text-[9px] font-bold mt-1",
                    error ? "text-red-500" : success ? "text-aviation-success" : warning ? "text-aviation-warning" : "text-aviation-accent"
                )}>
                    {info}
                </span>
            )}
        </div>
    );
}
