import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ThermometerSnowflake, Plus, Trash2, Info, AlertTriangle, AlertCircle, CheckCircle2, Ruler, MapPin, Plane, Activity } from 'lucide-react';
import { cn } from '../lib/utils';

type ApproachCategory = 'ILS' | 'NON_PRECISION' | 'RNAV_GPS' | 'RNP_AR';

interface FixEntry {
    id: string;
    name: string;
    altitude: string;
    isFAF: boolean;
    minimaType: 'NONE' | 'DA' | 'MDA';
}

interface StepDownEntry {
    id: string;
    distance: string;
    altitude: string;
}

export function ColdWeather() {
    const [elevation, setElevation] = useState<string>('');
    const [temperature, setTemperature] = useState<string>('');
    const [msa, setMsa] = useState<string>('');
    const [activeTableTab, setActiveTableTab] = useState<'procedure' | 'stepdown'>('procedure');

    const [approachCategory, setApproachCategory] = useState<ApproachCategory>('ILS');

    // ILS Specific
    const [ilsCategory, setIlsCategory] = useState<'CAT_I' | 'CAT_II_III'>('CAT_I');

    // RNAV / RNP Specific
    const [chartedTemp, setChartedTemp] = useState<'YES' | 'NO'>('YES');

    const [fixes, setFixes] = useState<FixEntry[]>([
        { id: '1', name: 'IAF', altitude: '', isFAF: false, minimaType: 'NONE' },
        { id: '2', name: 'IF', altitude: '', isFAF: false, minimaType: 'NONE' },
        { id: '3', name: 'FAF', altitude: '', isFAF: true, minimaType: 'NONE' },
        { id: '4', name: 'Minima', altitude: '', isFAF: false, minimaType: 'DA' },
        { id: '5', name: 'Missed Appr', altitude: '', isFAF: false, minimaType: 'NONE' },
    ]);

    const [stepDowns, setStepDowns] = useState<StepDownEntry[]>([
        { id: 'sd-1', distance: '', altitude: '' }
    ]);

    const addFix = () => {
        setFixes([...fixes, { id: Date.now().toString(), name: '', altitude: '', isFAF: false, minimaType: 'NONE' }]);
    };

    const removeFix = (id: string) => {
        setFixes(fixes.filter(f => f.id !== id));
    };

    const updateFix = (id: string, field: keyof FixEntry, value: string | boolean) => {
        setFixes(fixes.map(f => {
            if (f.id === id) {
                if (field === 'isFAF' && value === true) return { ...f, isFAF: true, minimaType: 'NONE' };
                if (field === 'minimaType' && value !== 'NONE') return { ...f, minimaType: value as FixEntry['minimaType'], isFAF: false };
                return { ...f, [field]: value };
            }
            if (field === 'isFAF' && value === true) return { ...f, isFAF: false };
            return f;
        }) as FixEntry[]);
    };

    const addStepDown = () => {
        setStepDowns([...stepDowns, { id: Date.now().toString(), distance: '', altitude: '' }]);
    };

    const removeStepDown = (id: string) => {
        setStepDowns(stepDowns.filter(s => s.id !== id));
    };

    const updateStepDown = (id: string, field: keyof StepDownEntry, value: string) => {
        setStepDowns(stepDowns.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const calculateCorrection = (publishedAlt: number, elev: number, temp: number): number => {
        if (temp >= 0) return 0;
        const height = publishedAlt - elev;
        if (height <= 0) return 0;

        let corr = 0;
        if (temp > -15) {
            corr = height * 0.10;
        } else {
            const H = height;
            const H0 = elev;
            const L0 = 0.00198;
            const t0 = temp + (L0 * H0);
            corr = H * ((15 - t0) / (273 + t0 - 0.5 * L0 * (H + H0)));
        }
        return corr;
    };

    const getCorrectedAltitude = (publishedStr: string, minimaType: 'NONE' | 'DA' | 'MDA' | false = false): { string: string, value: number, disabled: boolean } => {
        let published = parseInt(publishedStr);
        const elev = parseInt(elevation);
        const temp = parseInt(temperature);

        if (isNaN(published) || String(published) === '') return { string: '-', value: 0, disabled: false };

        if (minimaType === 'MDA') {
            published += 50; // Add generic +50ft pad to derive DDA from MDA
        }

        if (approachCategory === 'RNP_AR') {
            if (chartedTemp === 'YES') {
                return { string: String(published), value: published, disabled: true }; // No corrections required
            } else {
                return { string: 'N/A', value: 0, disabled: true }; // Not authorized
            }
        }

        if (isNaN(elev) || isNaN(temp)) return { string: '-', value: 0, disabled: false };

        // Logic check for DH/DA exclusions
        if (minimaType === 'DA' || minimaType === 'MDA') {
            if (approachCategory === 'ILS' && ilsCategory === 'CAT_II_III') {
                return { string: String(published), value: published, disabled: true }; // No correction to DH
            }
            if (approachCategory === 'RNAV_GPS' && chartedTemp === 'YES') {
                return { string: String(published), value: published, disabled: true }; // No correction to DA(H) LNAV/VNAV
            }
        }

        // Calculate corrected MSA
        const msaVal = parseInt(msa);
        let correctedMsa = NaN;
        if (!isNaN(msaVal)) {
            const msaCorr = calculateCorrection(msaVal, elev, temp);
            correctedMsa = Math.ceil((msaVal + msaCorr) / 10) * 10;
        }

        // If published altitude is at or above corrected MSA, no correction needed
        if (!isNaN(correctedMsa) && published >= correctedMsa && minimaType !== 'DA' && minimaType !== 'MDA') {
            return { string: String(published), value: published, disabled: true };
        }

        const corr = calculateCorrection(published, elev, temp);
        const finalAlt = published + corr;

        // Procedure altitudes are rounded up to the nearest 10 ft. Minimums are just rounded up to the nearest 1 ft.
        const roundedAlt = (minimaType === 'DA' || minimaType === 'MDA')
            ? Math.ceil(finalAlt)
            : Math.ceil(finalAlt / 10) * 10;

        return { string: String(roundedAlt), value: roundedAlt, disabled: false };
    };

    const isWarningNote1Applicable = () => {
        if (isNaN(parseInt(temperature)) || parseInt(temperature) >= 0) return false;

        const fafFixes = fixes.filter(f => f.isFAF && !isNaN(parseInt(f.altitude)));
        if (fafFixes.length === 0) return false;

        // Check if ANY FAF fix actually received a mathematical correction
        const isActuallyCorrected = fafFixes.some(f => {
            const corrected = getCorrectedAltitude(f.altitude, f.minimaType);
            const published = parseInt(f.altitude);
            return !corrected.disabled && corrected.value > published;
        });

        if (!isActuallyCorrected) return false;

        if (approachCategory === 'ILS' && ilsCategory === 'CAT_II_III') return false;

        return true;
    };

    const getNote1WarningText = () => {
        if (approachCategory === 'RNP_AR') {
            return "FINAL APP or APP DES mode shall NOT be used for the approach if cold temperature correction is applied to the FAF.";
        }
        if (approachCategory === 'RNAV_GPS' || approachCategory === 'NON_PRECISION') {
            return "FPA Guidance (or FLS if equipped) must be used. FINAL APP/APP DES not authorized. Ensure minimums are appropriately corrected.";
        }
        return "Refer to company SOPs for flying corrected FAF altitudes.";
    };

    const getStatusMessage = () => {
        if (approachCategory === 'RNP_AR') {
            if (chartedTemp === 'NO') {
                return { type: 'error', text: 'APPROACH NOT AUTHORIZED.' };
            } else {
                return { type: 'success', text: 'No corrections required.' };
            }
        }
        if (approachCategory === 'RNAV_GPS') {
            if (chartedTemp === 'YES') {
                return { type: 'info', text: 'Use LNAV/VNAV minima: No correction to DA(H).\nFLS and FINAL APP modes can be used.' };
            } else {
                return { type: 'info', text: 'Use LNAV minima.\nApply corrections to all altitudes including MDA.' };
            }
        }
        if (approachCategory === 'ILS' && ilsCategory === 'CAT_II_III') {
            return { type: 'info', text: 'No correction to DH applied.\nCorrections applied to all other altitudes.' };
        }
        return null;
    };

    const statMsg = getStatusMessage();

    return (
        <div className="h-full flex flex-col pt-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto custom-scrollbar px-0.5 pb-8 space-y-1.5">

                {/* Inline Header */}
                <div className="flex items-center gap-2 shrink-0 mb-3">
                    <ThermometerSnowflake className="w-4 h-4 text-aviation-accent" />
                    <h3 className="text-sm md:text-base font-bold text-white">Cold Weather Corrections</h3>
                </div>

                {/* Top Controls Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-1.5 relative z-20">
                    {/* Aerodrome Inputs */}
                    <div className="col-span-1 md:col-span-5 glass-panel !p-0 overflow-hidden flex flex-col h-fit">
                        <div className="px-1.5 py-1 bg-aviation-accent/5 border-b border-white/5 flex items-center gap-1.5 shrink-0">
                            <MapPin className="w-3 h-3 text-aviation-accent" />
                            <h4 className="font-bold text-aviation-accent uppercase tracking-widest text-[10px] md:text-[11px] leading-4">Aerodrome Conditions</h4>
                        </div>
                        <div className="p-1">
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-0.5">Elev (ft)</label>
                                    <input
                                        type="number"
                                        value={elevation}
                                        onChange={(e) => setElevation(e.target.value)}
                                        placeholder="1000"
                                        className="w-full bg-black/40 border border-white/10 rounded-md px-2 py-1 text-sm text-white font-mono focus:outline-none focus:border-aviation-accent transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-0.5">Temp (°C)</label>
                                    <input
                                        type="number"
                                        value={temperature}
                                        onChange={(e) => setTemperature(e.target.value)}
                                        placeholder="-10"
                                        className="w-full bg-black/40 border border-white/10 rounded-md px-2 py-1 text-sm text-white font-mono focus:outline-none focus:border-aviation-accent transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-0.5">MSA</label>
                                    <input
                                        type="number"
                                        value={msa}
                                        onChange={(e) => setMsa(e.target.value)}
                                        placeholder="4000"
                                        className="w-full bg-black/40 border border-white/10 rounded-md px-2 py-1 text-sm text-white font-mono focus:outline-none focus:border-aviation-accent transition-colors"
                                        title="If published altitude is at or above corrected MSA, no correction will be applied to it (excluding DA/MDA)."
                                    />
                                </div>
                            </div>
                            {msa && !isNaN(parseInt(msa)) && !isNaN(parseInt(elevation)) && !isNaN(parseInt(temperature)) && (
                                <div className="mt-2 bg-black/20 rounded-md border border-white/5 px-2 py-1 flex items-center justify-between">
                                    <span className="text-[9px] font-semibold text-slate-400">Corrected MSA:</span>
                                    <span className="text-xs font-mono font-bold text-aviation-accent">
                                        {Math.ceil((parseInt(msa) + calculateCorrection(parseInt(msa), parseInt(elevation), parseInt(temperature))) / 10) * 10}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Approach Type */}
                    <div className="col-span-1 md:col-span-7 glass-panel !p-0 overflow-hidden flex flex-col">
                        <div className="px-1.5 py-1 bg-aviation-accent/5 border-b border-white/5 flex items-center gap-1.5 shrink-0">
                            <Plane className="w-3 h-3 text-aviation-accent" />
                            <h4 className="font-bold text-aviation-accent uppercase tracking-widest text-xs md:text-xs">Approach Type</h4>
                        </div>
                        <div className="p-1">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 mb-2">
                                <button
                                    onClick={() => setApproachCategory('ILS')}
                                    className={cn("px-1.5 py-1.5 rounded-md border font-semibold text-xs leading-snug text-center transition-all", approachCategory === 'ILS' ? "bg-aviation-accent/20 border-aviation-accent text-white" : "bg-black/40 border-white/10 text-slate-400 hover:bg-white/5")}
                                >
                                    ILS/GLS/LPV
                                </button>
                                <button
                                    onClick={() => setApproachCategory('NON_PRECISION')}
                                    className={cn("px-1.5 py-1.5 rounded-md border font-semibold text-xs leading-snug text-center transition-all", approachCategory === 'NON_PRECISION' ? "bg-aviation-accent/20 border-aviation-accent text-white" : "bg-black/40 border-white/10 text-slate-400 hover:bg-white/5")}
                                >
                                    LOC/VOR/NDB
                                </button>
                                <button
                                    onClick={() => setApproachCategory('RNAV_GPS')}
                                    className={cn("px-1.5 py-1.5 rounded-md border font-semibold text-xs leading-snug text-center transition-all", approachCategory === 'RNAV_GPS' ? "bg-aviation-accent/20 border-aviation-accent text-white" : "bg-black/40 border-white/10 text-slate-400 hover:bg-white/5")}
                                >
                                    RNAV/RNP
                                </button>
                                <button
                                    onClick={() => setApproachCategory('RNP_AR')}
                                    className={cn("px-1.5 py-1.5 rounded-md border font-semibold text-xs leading-snug text-center transition-all", approachCategory === 'RNP_AR' ? "bg-aviation-accent/20 border-aviation-accent text-white" : "bg-black/40 border-white/10 text-slate-400 hover:bg-white/5")}
                                >
                                    RNP (AR)
                                </button>
                            </div>

                            {/* Sub Options */}
                            <div className="bg-black/20 p-1.5 rounded-lg border border-white/5 flex items-center">
                                <AnimatePresence mode="wait">
                                    {approachCategory === 'ILS' && (
                                        <motion.div key="ils" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full">
                                            <label className="block text-xs font-semibold text-slate-400 mb-1">Category / Minima</label>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setIlsCategory('CAT_I')}
                                                    className={cn("flex-1 py-1 rounded-md border font-medium text-xs transition-all", ilsCategory === 'CAT_I' ? "bg-white/10 border-white/30 text-white shadow-sm" : "bg-black/40 border-white/5 text-slate-500")}
                                                >
                                                    CAT I / LPV
                                                </button>
                                                <button
                                                    onClick={() => setIlsCategory('CAT_II_III')}
                                                    className={cn("flex-1 py-1 rounded-md border font-medium text-xs transition-all", ilsCategory === 'CAT_II_III' ? "bg-white/10 border-white/30 text-white shadow-sm" : "bg-black/40 border-white/5 text-slate-500")}
                                                >
                                                    CAT II / CAT III
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                    {approachCategory === 'NON_PRECISION' && (
                                        <motion.div key="np" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full text-xs font-medium text-slate-400 italic">
                                            Apply corrections to all procedure altitudes.
                                            <span className="text-xs text-slate-500 ml-1">(FLS: no correction req'd)</span>
                                        </motion.div>
                                    )}
                                    {(approachCategory === 'RNAV_GPS' || approachCategory === 'RNP_AR') && (
                                        <motion.div key="rnav" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full flex items-center justify-between gap-3">
                                            <label className="block text-xs font-semibold text-slate-400 mb-0 w-[140px]">Airport Temp Within Charted Temp?</label>
                                            <div className="flex gap-2 flex-1">
                                                <button
                                                    onClick={() => setChartedTemp('YES')}
                                                    className={cn("flex-1 py-1 rounded-md border font-medium text-xs transition-all", chartedTemp === 'YES' ? "bg-aviation-success/20 border-aviation-success/50 text-aviation-success shadow-sm" : "bg-black/40 border-white/5 text-slate-500")}
                                                >
                                                    YES
                                                </button>
                                                <button
                                                    onClick={() => setChartedTemp('NO')}
                                                    className={cn("flex-1 py-1 rounded-md border font-medium text-xs transition-all", chartedTemp === 'NO' ? "bg-red-500/20 border-red-500/50 text-red-400 shadow-sm" : "bg-black/40 border-white/5 text-slate-500")}
                                                >
                                                    NO
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Status Banners */}
                <AnimatePresence>
                    {statMsg && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            className={cn(
                                "rounded-lg px-2 py-1.5 border flex items-start gap-2 shadow-lg whitespace-pre-wrap overflow-hidden max-w-3xl ml-0",
                                statMsg.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                                    statMsg.type === 'success' ? 'bg-aviation-success/10 border-aviation-success/30 text-aviation-success' :
                                        'bg-blue-500/10 border-blue-500/30 text-blue-300'
                            )}
                        >
                            {statMsg.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> :
                                statMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> :
                                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                            }
                            <div className="text-xs font-semibold">{statMsg.text}</div>
                        </motion.div>
                    )}

                    {isWarningNote1Applicable() && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 rounded-lg px-2 py-1.5 flex items-start gap-2 shadow-lg overflow-hidden max-w-3xl ml-0"
                        >
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                            <div className="text-xs">
                                <span className="font-bold">NOTE 1:</span> {getNote1WarningText()}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Correction Tables Tabs */}
                <div className="mt-1 glass-panel !p-0 shadow-xl overflow-hidden mb-20 max-w-3xl ml-0">
                    {/* Tab Headers */}
                    <div className="flex border-b border-white/10 bg-black/20">
                        <button
                            onClick={() => setActiveTableTab('procedure')}
                            className={cn(
                                "flex-1 py-1.5 px-3 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5",
                                activeTableTab === 'procedure'
                                    ? "bg-aviation-accent/10 text-white border-b-2 border-aviation-accent"
                                    : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                            )}
                        >
                            <Activity className="w-3 h-3" />
                            PROCEDURE
                        </button>
                        <button
                            onClick={() => setActiveTableTab('stepdown')}
                            className={cn(
                                "flex-1 py-1.5 px-3 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5",
                                activeTableTab === 'stepdown'
                                    ? "bg-aviation-accent/10 text-white border-b-2 border-aviation-accent"
                                    : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                            )}
                        >
                            <Ruler className="w-3 h-3" />
                            STEP-DOWN
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="p-1">
                        <AnimatePresence mode="wait">
                            {activeTableTab === 'procedure' ? (
                                <motion.div
                                    key="procedure-tab"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    transition={{ duration: 0.2 }}
                                >

                                    <div className="space-y-1.5">
                                        <div className="grid grid-cols-12 gap-1 text-[9px] font-bold text-slate-500 uppercase px-1 items-center">
                                            <div className="col-span-4">Fix Name</div>
                                            <div className="col-span-3 text-center">Published</div>
                                            <div className="col-span-3 text-aviation-accent text-center">Corrected</div>
                                            <div className="col-span-1 text-center">Type</div>
                                            <div className="col-span-1 flex justify-end">
                                                <button onClick={addFix} className="flex items-center gap-0.5 px-1.5 py-0.5 bg-aviation-accent/10 hover:bg-aviation-accent/20 text-aviation-accent rounded border border-aviation-accent/30 text-[9px] font-bold transition-colors">
                                                    <Plus className="w-2.5 h-2.5" />ADD
                                                </button>
                                            </div>
                                        </div>
                                        <AnimatePresence>
                                            {fixes.map((fix) => {
                                                const corrected = getCorrectedAltitude(fix.altitude, fix.minimaType);
                                                return (
                                                    <motion.div
                                                        key={fix.id}
                                                        initial={{ opacity: 0, y: -10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.95 }}
                                                        className="grid grid-cols-12 gap-1 items-center bg-black/20 px-1 py-1 rounded-md border border-white/5 group relative"
                                                    >
                                                        <div className="col-span-4">
                                                            <input
                                                                type="text"
                                                                value={fix.name}
                                                                onChange={(e) => updateFix(fix.id, 'name', e.target.value)}
                                                                placeholder="Fix"
                                                                className="w-full bg-transparent border-none text-xs font-semibold text-white focus:outline-none placeholder-slate-600 truncate"
                                                            />
                                                        </div>
                                                        <div className="col-span-3 flex justify-center">
                                                            <input
                                                                type="number"
                                                                value={fix.altitude}
                                                                onChange={(e) => updateFix(fix.id, 'altitude', e.target.value)}
                                                                placeholder="Alt"
                                                                className="w-full max-w-[80px] text-center bg-black/40 border border-white/10 rounded px-1.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-aviation-accent"
                                                            />
                                                        </div>
                                                        <div className="col-span-3 flex items-center justify-center">
                                                            <div className={cn(
                                                                "w-full max-w-[80px] text-center py-1 rounded font-mono text-xs font-bold shadow-inner bg-black/60",
                                                                corrected.disabled ? "text-slate-500 border border-white/5" : "text-aviation-accent border border-aviation-accent/30"
                                                            )}>
                                                                {corrected.string}
                                                            </div>
                                                        </div>
                                                        <div className="col-span-1 flex items-center justify-center">
                                                            <select
                                                                value={fix.isFAF ? 'FAF' : fix.minimaType === 'DA' ? 'DA' : fix.minimaType === 'MDA' ? 'MDA' : 'FIX'}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    if (val === 'FAF') {
                                                                        updateFix(fix.id, 'isFAF', true);
                                                                    } else if (val === 'DA') {
                                                                        updateFix(fix.id, 'minimaType', 'DA');
                                                                    } else if (val === 'MDA') {
                                                                        updateFix(fix.id, 'minimaType', 'MDA');
                                                                    } else {
                                                                        setFixes(fixes.map(f => f.id === fix.id ? { ...f, isFAF: false, minimaType: 'NONE' } : f));
                                                                    }
                                                                }}
                                                                className={cn(
                                                                    "text-[9px] font-bold px-0.5 py-0.5 rounded border-none focus:outline-none appearance-none cursor-pointer text-center w-full",
                                                                    fix.isFAF ? "bg-yellow-500/20 text-yellow-500" :
                                                                        fix.minimaType === 'DA' ? "bg-orange-500/20 text-orange-500" :
                                                                            fix.minimaType === 'MDA' ? "bg-purple-500/20 text-purple-400" :
                                                                                "bg-black/40 text-slate-400 hover:text-white"
                                                                )}
                                                            >
                                                                <option value="FIX">FIX</option>
                                                                <option value="FAF">FAF</option>
                                                                <option value="DA">DA</option>
                                                                <option value="MDA">MDA</option>
                                                            </select>
                                                        </div>
                                                        <div className="col-span-1 flex justify-end">
                                                            <button onClick={() => removeFix(fix.id)} className="w-5 h-5 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Trash2 className="w-2.5 h-2.5" />
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                )
                                            })}
                                        </AnimatePresence>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="stepdown-tab"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ duration: 0.2 }}
                                >                                    <div className="space-y-1.5">
                                        <div className="grid grid-cols-12 gap-1 text-[9px] font-bold text-slate-500 uppercase px-1 text-center items-center">
                                            <div className="col-span-3">Distance</div>
                                            <div className="col-span-3 text-center">Published</div>
                                            <div className="col-span-3 text-aviation-accent text-center">Corrected</div>
                                            <div className="col-span-3 flex justify-end">
                                                <button onClick={addStepDown} className="flex items-center gap-0.5 px-1.5 py-0.5 bg-aviation-accent/10 hover:bg-aviation-accent/20 text-aviation-accent rounded border border-aviation-accent/30 text-[9px] font-bold transition-colors">
                                                    <Plus className="w-2.5 h-2.5" />ADD
                                                </button>
                                            </div>
                                        </div>
                                        <AnimatePresence>
                                            {stepDowns.map((sd) => {
                                                const corrected = getCorrectedAltitude(sd.altitude, false);
                                                return (
                                                    <motion.div
                                                        key={sd.id}
                                                        initial={{ opacity: 0, y: -10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.95 }}
                                                        className="grid grid-cols-12 gap-1 items-center bg-black/20 px-1 py-1 rounded-md border border-white/5 group relative"
                                                    >
                                                        <div className="col-span-3 flex items-center gap-0.5 justify-center">
                                                            <span className="text-slate-500 font-mono text-xs">D</span>
                                                            <input
                                                                type="number"
                                                                step="0.1"
                                                                value={sd.distance}
                                                                onChange={(e) => updateStepDown(sd.id, 'distance', e.target.value)}
                                                                placeholder="2.0"
                                                                className="w-full max-w-[60px] bg-transparent border-none text-xs font-semibold text-white focus:outline-none placeholder-slate-600 font-mono text-center px-0.5"
                                                            />
                                                        </div>
                                                        <div className="col-span-3 flex justify-center">
                                                            <input
                                                                type="number"
                                                                value={sd.altitude}
                                                                onChange={(e) => updateStepDown(sd.id, 'altitude', e.target.value)}
                                                                placeholder="Alt"
                                                                className="w-full max-w-[80px] text-center bg-black/40 border border-white/10 rounded px-1.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-aviation-accent"
                                                            />
                                                        </div>
                                                        <div className="col-span-3 flex items-center justify-center">
                                                            <div className={cn(
                                                                "w-full max-w-[80px] text-center py-1 rounded font-mono text-xs font-bold shadow-inner bg-black/60",
                                                                corrected.disabled ? "text-slate-500 border border-white/5" : "text-aviation-accent border border-aviation-accent/30"
                                                            )}>
                                                                {corrected.string}
                                                            </div>
                                                        </div>
                                                        <div className="col-span-3 flex justify-end">
                                                            <button onClick={() => removeStepDown(sd.id)} className="w-5 h-5 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Trash2 className="w-2.5 h-2.5" />
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                )
                                            })}
                                        </AnimatePresence>
                                        {stepDowns.length === 0 && (
                                            <div className="text-center text-xs text-slate-500 py-4 italic">No step-down altitudes added.</div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}
