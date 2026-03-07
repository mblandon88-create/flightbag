import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Bed, Clock, Users, Layers } from 'lucide-react';
import { cn } from '../lib/utils';
import type { RestData } from '../store/useStore';

const formatTime = (mins: number) => {
    let m = Math.round(mins);
    while (m < 0) m += 1440;
    while (m >= 1440) m -= 1440;
    const hh = Math.floor(m / 60).toString().padStart(2, '0');
    const mm = (m % 60).toString().padStart(2, '0');
    return `${hh}:${mm}`;
};

const parseTime = (timeStr: string) => {
    if (!timeStr) return 0;
    const clean = timeStr.replace(':', '');
    if (clean.length !== 4) return 0;
    return parseInt(clean.substring(0, 2), 10) * 60 + parseInt(clean.substring(2, 4), 10);
};



export const InflightRest: React.FC = () => {
    const flightData = useStore(state => state.flightData);
    const inflightData = useStore(state => state.inflightData);
    const setInflightData = useStore(state => state.setInflightData);

    const restData = inflightData.restData || {
        crewSize: '4',
        pattern: 'Half and Half',
        startTime: '',
        endTime: '',
        buffer: 5
    };

    // Auto-populate times if empty
    useEffect(() => {
        if (!flightData || !inflightData.takeoffTime) return;

        let { startTime, endTime } = restData;
        let needsUpdate = false;

        if (!startTime) {
            const toStr = inflightData.takeoffTime;
            const toMins = parseTime(toStr.replace(':', ''));
            if (toMins > 0 || toStr === '00:00' || toStr === '0000') {
                startTime = formatTime(toMins + 20); // TO + 20 mins
                needsUpdate = true;
            }
        }

        if (!endTime && flightData.tripTime) {
            const toStr = inflightData.takeoffTime;
            const toMins = parseTime(toStr.replace(':', ''));
            if (toMins > 0 || toStr === '00:00' || toStr === '0000') {
                const etaMins = toMins + flightData.tripTime;
                endTime = formatTime(etaMins - 60); // ETA - 1 hour
                needsUpdate = true;
            }
        }

        if (needsUpdate) {
            setInflightData({ restData: { ...restData, startTime, endTime } });
        }
    }, [flightData, inflightData.takeoffTime, restData.startTime, restData.endTime]);

    const updateRestData = (updates: Partial<RestData>) => {
        setInflightData({
            restData: { ...restData, ...updates }
        });
    };

    const handleCrewSizeChange = (size: '3' | '4') => {
        let newPattern = restData.pattern;
        if (size === '3') newPattern = 'Thirds';
        if (size === '4' && newPattern === 'Thirds') newPattern = 'Half and Half';
        updateRestData({ crewSize: size, pattern: newPattern });
    };

    const calculateRestPeriods = () => {
        if (!restData.startTime || !restData.endTime || restData.startTime.length < 4 || restData.endTime.length < 4) return null;

        const startMins = parseTime(restData.startTime);
        let endMins = parseTime(restData.endTime);

        // Handle overnight
        if (endMins < startMins) {
            endMins += 1440;
        }

        const totalMins = endMins - startMins;
        if (totalMins <= 0) return null;

        const buffer = restData.buffer || 0;
        const periods = [];
        let pilotRestStr = '';

        if (restData.crewSize === '4') {
            if (restData.pattern === 'Half and Half') {
                const usable = totalMins - buffer;
                const split = usable / 2;
                pilotRestStr = formatTime(split);

                periods.push({ label: 'Break 1 (First Crew)', start: startMins, end: startMins + split, type: 'rest' });
                periods.push({ label: 'Changeover', start: startMins + split, end: startMins + split + buffer, type: 'buffer' });
                periods.push({ label: 'Break 2 (Second Crew)', start: startMins + split + buffer, end: endMins, type: 'rest' });
            }
            else if (restData.pattern === 'Four Breaks') {
                const usable = totalMins - (3 * buffer);
                const split = usable / 4;
                pilotRestStr = formatTime(split * 2);

                let cur = startMins;
                for (let i = 1; i <= 4; i++) {
                    const label = `Break ${i} (Crew ${i % 2 === 1 ? 'A' : 'B'})`;
                    periods.push({ label, start: cur, end: cur + split, type: 'rest' });
                    cur += split;
                    if (i < 4) {
                        periods.push({ label: 'Changeover', start: cur, end: cur + buffer, type: 'buffer' });
                        cur += buffer;
                    }
                }
            }
            else if (restData.pattern === 'Primary / Relief') {
                const usable = totalMins - (2 * buffer);
                const reliefSplit = usable / 4;
                const primarySplit = usable / 2;
                pilotRestStr = `PRI: ${formatTime(primarySplit)} | RLF: ${formatTime(reliefSplit * 2)}`;

                let cur = startMins;
                periods.push({ label: 'Break 1 (Relief Crew)', start: cur, end: cur + reliefSplit, type: 'rest' });
                cur += reliefSplit;
                periods.push({ label: 'Changeover', start: cur, end: cur + buffer, type: 'buffer' });
                cur += buffer;

                periods.push({ label: 'Break 2 (Primary Crew)', start: cur, end: cur + primarySplit, type: 'rest', highlight: true });
                cur += primarySplit;
                periods.push({ label: 'Changeover', start: cur, end: cur + buffer, type: 'buffer' });
                cur += buffer;

                periods.push({ label: 'Break 3 (Relief Crew)', start: cur, end: endMins, type: 'rest' });
            }
        } else if (restData.crewSize === '3') {
            const usable = totalMins - (2 * buffer);
            const split = usable / 3;
            pilotRestStr = formatTime(split);

            let cur = startMins;
            for (let i = 1; i <= 3; i++) {
                periods.push({ label: `Break ${i}`, start: cur, end: cur + split, type: 'rest' });
                cur += split;
                if (i < 3) {
                    periods.push({ label: 'Changeover', start: cur, end: cur + buffer, type: 'buffer' });
                    cur += buffer;
                }
            }
        }

        return { totalMins, periods, pilotRestStr };
    };

    const result = calculateRestPeriods();

    return (
        <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-y-auto custom-scrollbar p-2 md:p-3">
            {/* Header */}
            <div className="flex items-center gap-2 shrink-0 p-2 glass-panel border border-white/5 rounded-2xl bg-black/40 w-fit">
                <div className="w-7 h-7 rounded-full bg-aviation-accent/10 flex items-center justify-center shrink-0">
                    <Bed className="w-3.5 h-3.5 text-aviation-accent" />
                </div>
                <div>
                    <h2 className="text-sm md:text-base font-bold text-white tracking-tight leading-none mb-0.5">Inflight Rest</h2>
                    <p className="text-[8px] md:text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">Crew Rest Calculator</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Configuration Panel */}
                <div className="glass-panel border border-white/5 rounded-2xl p-3 md:p-4 space-y-4 bg-black/40">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Users className="w-4 h-4 text-slate-400" />
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Crew Configuration</h3>
                        </div>

                        <div className="flex gap-1.5 p-1 bg-white/5 rounded-xl border border-white/5 w-full md:w-3/4 max-w-[200px]">
                            {(['3', '4'] as const).map(size => (
                                <button
                                    key={size}
                                    onClick={() => handleCrewSizeChange(size)}
                                    className={cn(
                                        "flex-1 py-1.5 text-[10px] sm:text-xs font-bold rounded-lg transition-all",
                                        restData.crewSize === size ? "bg-aviation-accent text-black shadow-lg" : "text-slate-500 hover:text-slate-300"
                                    )}
                                >
                                    {size} Pilots
                                </button>
                            ))}
                        </div>

                        <div className="space-y-1.5 w-full md:w-3/4 max-w-[150px]">
                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest pl-1">Rest Pattern</label>
                            <div className="grid grid-cols-1 gap-1.5">
                                {restData.crewSize === '4' ? (
                                    (['Half and Half', 'Four Breaks', 'Primary / Relief'] as const).map(pattern => (
                                        <button
                                            key={pattern}
                                            onClick={() => updateRestData({ pattern })}
                                            className={cn(
                                                "py-1.5 px-2.5 text-[10px] sm:text-xs font-bold rounded-lg border transition-all text-left",
                                                restData.pattern === pattern
                                                    ? "bg-aviation-accent/10 border-aviation-accent/50 text-aviation-accent"
                                                    : "bg-black/30 border-white/5 text-slate-400 hover:bg-white/5"
                                            )}
                                        >
                                            {pattern}
                                        </button>
                                    ))
                                ) : (
                                    <button
                                        className="py-1.5 px-2.5 text-[10px] sm:text-xs font-bold rounded-lg border bg-aviation-accent/10 border-aviation-accent/50 text-aviation-accent text-left cursor-default col-span-1"
                                    >
                                        Thirds
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Time Inputs Panel */}
                <div className="glass-panel border border-white/5 rounded-2xl p-3 md:p-4 space-y-4 bg-black/40">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Time Parameters (Z)</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Rest Start</label>
                                <input
                                    type="time"
                                    value={restData.startTime.replace(':', '').length === 4 ? `${restData.startTime.replace(':', '').substring(0, 2)}:${restData.startTime.replace(':', '').substring(2, 4)}` : restData.startTime}
                                    onChange={(e) => updateRestData({ startTime: e.target.value.replace(':', '') })}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 font-mono text-sm focus:outline-none focus:border-aviation-accent text-white transition-all"
                                />
                                <p className="text-[9px] text-slate-600 font-bold uppercase mt-1 pl-1">
                                    {!restData.startTime ? "Auto: T/O + 20m" : ""}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Rest End</label>
                                <input
                                    type="time"
                                    value={restData.endTime.replace(':', '').length === 4 ? `${restData.endTime.replace(':', '').substring(0, 2)}:${restData.endTime.replace(':', '').substring(2, 4)}` : restData.endTime}
                                    onChange={(e) => updateRestData({ endTime: e.target.value.replace(':', '') })}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 font-mono text-sm focus:outline-none focus:border-aviation-accent text-white transition-all"
                                />
                                <p className="text-[9px] text-slate-600 font-bold uppercase mt-1 pl-1">
                                    {!restData.endTime ? "Auto: ETA - 1h" : ""}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-1 w-full md:max-w-[140px]">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Changeover Buffer (Min)</label>
                            <input
                                type="number"
                                min="0"
                                max="60"
                                value={restData.buffer === null || restData.buffer === undefined ? '' : restData.buffer}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '') {
                                        updateRestData({ buffer: '' as any }); // Temporarily allow empty string for typing
                                    } else {
                                        updateRestData({ buffer: parseInt(val, 10) });
                                    }
                                }}
                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 font-mono text-sm focus:outline-none focus:border-aviation-accent text-white transition-all"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Schedule View */}
            <div className="mt-2 flex-1 w-full lg:w-3/4">
                {result ? (
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-start gap-4 px-2">
                            <div className="flex items-center gap-2">
                                <Layers className="w-4 h-4 text-aviation-accent" />
                                <h3 className="text-xs font-bold text-white uppercase tracking-widest">Calculated Schedule</h3>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/10">
                                    Total Rest Time: <span className="text-white ml-1 font-mono">{formatTime(result.totalMins)}</span>
                                </div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/10">
                                    Rest By Pilot: <span className="text-aviation-accent ml-1 font-mono">{result.pilotRestStr}</span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-10 pb-4 px-2 w-full max-w-3xl">
                            <div className="relative w-full">
                                {/* Time Markers */}
                                <div className="absolute -top-6 left-0 right-0 w-full h-6 pointer-events-none">
                                    {/* Start marker */}
                                    <div className="absolute top-0 -translate-x-1/2 flex flex-col items-center" style={{ left: '0%' }}>
                                        <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-500">
                                            {formatTime(result.periods[0].start)}
                                        </span>
                                    </div>
                                    {/* End marker */}
                                    <div className="absolute top-0 -translate-x-1/2 flex flex-col items-center" style={{ left: '100%' }}>
                                        <span className="text-[10px] sm:text-xs font-mono font-bold text-aviation-warning">
                                            {formatTime(result.periods[result.periods.length - 1].end)}
                                        </span>
                                    </div>
                                </div>

                                {/* Timeline Bar */}
                                <div className="w-full h-16 md:h-20 flex rounded-xl overflow-hidden border border-white/10 shadow-lg bg-black/60 relative">
                                    {result.periods.map((period, idx) => {
                                        const isBuffer = period.type === 'buffer';
                                        const duration = period.end - period.start;
                                        const widthPerc = (duration / result.totalMins) * 100;

                                        const mainLabel = isBuffer ? "CHG" : period.label.split('(')[0].trim().replace('Break ', 'Rest ');
                                        const subLabel = period.label.includes('(') ? '(' + period.label.split('(')[1] : '';

                                        return (
                                            <div
                                                key={idx}
                                                className={cn(
                                                    "h-full flex flex-col items-center justify-center relative border-r border-black/80 last:border-r-0 transition-colors",
                                                    isBuffer
                                                        ? "bg-slate-800/50"
                                                        : period.highlight
                                                            ? "bg-aviation-accent/50 shadow-[0_0_15px_rgba(56,189,248,0.2)]"
                                                            : "bg-aviation-accent/20 hover:bg-aviation-accent/30"
                                                )}
                                                style={{ width: `${widthPerc}%` }}
                                            >
                                                {/* Hatching for buffer */}
                                                {isBuffer && (
                                                    <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, #fff 4px, #fff 8px)' }}></div>
                                                )}
                                                <div className="z-10 flex flex-col items-center px-1 text-center w-full overflow-hidden">
                                                    <span className={cn(
                                                        "text-[10px] sm:text-xs font-bold uppercase tracking-widest leading-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-full",
                                                        isBuffer ? "text-slate-400" : period.highlight ? "text-white" : "text-white/90"
                                                    )}>
                                                        {mainLabel}
                                                    </span>

                                                    {!isBuffer && (
                                                        <span className="text-xs sm:text-sm font-mono font-bold text-white mt-1">
                                                            {formatTime(period.start)} - {formatTime(period.end)}
                                                        </span>
                                                    )}

                                                    {!isBuffer && subLabel && (
                                                        <span className={cn(
                                                            "text-[8px] sm:text-[10px] tracking-widest uppercase hidden sm:block whitespace-nowrap overflow-hidden text-ellipsis max-w-full mt-0.5",
                                                            period.highlight ? "text-blue-100" : "text-slate-300"
                                                        )}>
                                                            {subLabel}
                                                        </span>
                                                    )}

                                                    {!isBuffer && (
                                                        <span className={cn(
                                                            "text-[9px] sm:text-xs font-mono mt-0.5 hidden md:block",
                                                            period.highlight ? "text-blue-200" : "text-slate-400"
                                                        )}>
                                                            {Math.floor(duration / 60)}h {Math.round(duration % 60).toString().padStart(2, '0')}m
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="mt-5 flex flex-wrap gap-4 px-2 justify-center sm:justify-start">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded bg-aviation-accent/20 border border-white/10"></div>
                                    <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Standard Rest</span>
                                </div>
                                {restData.pattern === 'Primary / Relief' && (
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-3 h-3 rounded bg-aviation-accent/50 border border-white/10 shadow-[0_0_8px_rgba(56,189,248,0.2)]"></div>
                                        <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Primary Rest</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded bg-slate-800/50 border border-white/10 relative overflow-hidden">
                                        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, #fff 2px, #fff 4px)' }}></div>
                                    </div>
                                    <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Changeover Gap</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 py-12 bg-white/5 rounded-2xl border border-white/5 border-dashed">
                        <Bed className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-sm font-medium">Enter valid start and end times to calculate the rest schedule.</p>
                        <p className="text-[10px] mt-2 uppercase tracking-widest opacity-50">Or ensure Flight Init data is loaded for auto-population</p>
                    </div>
                )}
            </div>
        </div >
    );
};
