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

    const updateFix = (id: string, field: keyof FixEntry, value: any) => {
        setFixes(fixes.map(f => {
            if (f.id === id) {
                // Ensure only one flag is set per fix if needed
                if (field === 'isFAF' && value === true) return { ...f, isFAF: true, minimaType: 'NONE' };
                if (field === 'minimaType' && value !== 'NONE') return { ...f, minimaType: value, isFAF: false };
                return { ...f, [field]: value };
            }
            // Unset others if setting unique flags (e.g. only 1 DA or 1 FAF if desired, 
            // though technically multiple step-downs could exist, keeping DA unique helps logic)
            return f;
        }));
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
        <div className="h-full flex flex-col pt-4 overflow-hidden">
            {/* Header */}
            <section className="px-2 mb-6 shrink-0 max-w-3xl ml-0">
                <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                    <ThermometerSnowflake className="w-6 h-6 text-aviation-accent" />
                    Cold Weather Corrections
                </h3>
            </section>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-8 space-y-6">

                {/* Top Controls Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 relative z-20">
                    {/* Aerodrome Inputs */}
                    <div className="col-span-1 md:col-span-4 glass-panel overflow-hidden flex flex-col h-fit">
                        <div className="px-4 py-3 bg-aviation-accent/5 border-b border-white/5 flex items-center gap-3 shrink-0">
                            <MapPin className="w-4 h-4 text-aviation-accent" />
                            <h4 className="font-bold text-aviation-accent uppercase tracking-widest text-[11px] md:text-xs">Aerodrome Conditions</h4>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1">Elevation (ft)</label>
                                <input
                                    type="number"
                                    value={elevation}
                                    onChange={(e) => setElevation(e.target.value)}
                                    placeholder="e.g. 1000"
                                    className="w-full max-w-[120px] bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-aviation-accent transition-colors"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1">Temp (°C)</label>
                                    <input
                                        type="number"
                                        value={temperature}
                                        onChange={(e) => setTemperature(e.target.value)}
                                        placeholder="e.g. -10"
                                        className="w-full max-w-[100px] bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-aviation-accent transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1">MSA</label>
                                    <input
                                        type="number"
                                        value={msa}
                                        onChange={(e) => setMsa(e.target.value)}
                                        placeholder="e.g. 4000"
                                        className="w-full max-w-[120px] bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-aviation-accent transition-colors"
                                        title="If published altitude is at or above corrected MSA, no correction will be applied to it (excluding DA/MDA)."
                                    />
                                </div>
                            </div>
                            {msa && !isNaN(parseInt(msa)) && !isNaN(parseInt(elevation)) && !isNaN(parseInt(temperature)) && (
                                <div className="bg-black/20 rounded-lg border border-white/5 p-3 flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-400">Corrected MSA:</span>
                                    <span className="text-sm font-mono font-bold text-aviation-accent">
                                        {Math.ceil((parseInt(msa) + calculateCorrection(parseInt(msa), parseInt(elevation), parseInt(temperature))) / 10) * 10}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Approach Type */}
                    <div className="col-span-1 md:col-span-8 glass-panel overflow-hidden flex flex-col max-w-[420px]">
                        <div className="px-4 py-3 bg-aviation-accent/5 border-b border-white/5 flex items-center gap-3 shrink-0">
                            <Plane className="w-4 h-4 text-aviation-accent" />
                            <h4 className="font-bold text-aviation-accent uppercase tracking-widest text-[11px] md:text-xs">Approach Type</h4>
                        </div>
                        <div className="p-5">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 max-w-[380px]">
                                <button
                                    onClick={() => setApproachCategory('ILS')}
                                    className={cn("px-2 py-2 rounded-lg border font-semibold text-[10px] leading-tight text-center transition-all", approachCategory === 'ILS' ? "bg-aviation-accent/20 border-aviation-accent text-white" : "bg-black/40 border-white/10 text-slate-400 hover:bg-white/5")}
                                >
                                    ILS / GLS /<br />RNP to LPV
                                </button>
                                <button
                                    onClick={() => setApproachCategory('NON_PRECISION')}
                                    className={cn("px-2 py-2 rounded-lg border font-semibold text-[10px] leading-tight text-center transition-all", approachCategory === 'NON_PRECISION' ? "bg-aviation-accent/20 border-aviation-accent text-white" : "bg-black/40 border-white/10 text-slate-400 hover:bg-white/5")}
                                >
                                    LOC / LDA /<br />VOR / NDB
                                </button>
                                <button
                                    onClick={() => setApproachCategory('RNAV_GPS')}
                                    className={cn("px-2 py-2 rounded-lg border font-semibold text-[10px] leading-tight text-center transition-all", approachCategory === 'RNAV_GPS' ? "bg-aviation-accent/20 border-aviation-accent text-white" : "bg-black/40 border-white/10 text-slate-400 hover:bg-white/5")}
                                >
                                    RNAV (GPS) /<br />RNP
                                </button>
                                <button
                                    onClick={() => setApproachCategory('RNP_AR')}
                                    className={cn("px-2 py-2 rounded-lg border font-semibold text-[10px] leading-tight text-center transition-all", approachCategory === 'RNP_AR' ? "bg-aviation-accent/20 border-aviation-accent text-white" : "bg-black/40 border-white/10 text-slate-400 hover:bg-white/5")}
                                >
                                    RNP (AR) /<br />RNAV (RNP)
                                </button>
                            </div>

                            {/* Sub Options */}
                            <div className="bg-black/20 p-3 rounded-xl border border-white/5 min-h-[70px] flex items-center max-w-md">
                                <AnimatePresence mode="wait">
                                    {approachCategory === 'ILS' && (
                                        <motion.div key="ils" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full">
                                            <label className="block text-xs font-semibold text-slate-400 mb-2">Category / Minima</label>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setIlsCategory('CAT_I')}
                                                    className={cn("flex-1 py-1.5 rounded-lg border font-medium text-xs transition-all", ilsCategory === 'CAT_I' ? "bg-white/10 border-white/30 text-white shadow-sm" : "bg-black/40 border-white/5 text-slate-500")}
                                                >
                                                    CAT I / LPV
                                                </button>
                                                <button
                                                    onClick={() => setIlsCategory('CAT_II_III')}
                                                    className={cn("flex-1 py-1.5 rounded-lg border font-medium text-xs transition-all", ilsCategory === 'CAT_II_III' ? "bg-white/10 border-white/30 text-white shadow-sm" : "bg-black/40 border-white/5 text-slate-500")}
                                                >
                                                    CAT II / CAT III
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                    {approachCategory === 'NON_PRECISION' && (
                                        <motion.div key="np" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full text-sm font-medium text-slate-400 italic">
                                            Apply corrections to all procedure altitudes.<br />
                                            <span className="text-xs text-slate-500">(Note: If flying using FLS, no temperature correction is required.)</span>
                                        </motion.div>
                                    )}
                                    {(approachCategory === 'RNAV_GPS' || approachCategory === 'RNP_AR') && (
                                        <motion.div key="rnav" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full flex items-center justify-between gap-4">
                                            <label className="block text-xs font-semibold text-slate-400 mb-0 w-[150px]">Airport Temp Within Charted Temp?</label>
                                            <div className="flex gap-2 flex-1">
                                                <button
                                                    onClick={() => setChartedTemp('YES')}
                                                    className={cn("flex-1 py-1.5 rounded-lg border font-medium text-xs transition-all", chartedTemp === 'YES' ? "bg-aviation-success/20 border-aviation-success/50 text-aviation-success shadow-sm" : "bg-black/40 border-white/5 text-slate-500")}
                                                >
                                                    YES
                                                </button>
                                                <button
                                                    onClick={() => setChartedTemp('NO')}
                                                    className={cn("flex-1 py-1.5 rounded-lg border font-medium text-xs transition-all", chartedTemp === 'NO' ? "bg-red-500/20 border-red-500/50 text-red-400 shadow-sm" : "bg-black/40 border-white/5 text-slate-500")}
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
                            animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            className={cn(
                                "rounded-xl p-4 border flex items-start gap-3 shadow-lg whitespace-pre-wrap overflow-hidden max-w-3xl ml-0",
                                statMsg.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                                    statMsg.type === 'success' ? 'bg-aviation-success/10 border-aviation-success/30 text-aviation-success' :
                                        'bg-blue-500/10 border-blue-500/30 text-blue-300'
                            )}
                        >
                            {statMsg.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" /> :
                                statMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" /> :
                                    <Info className="w-5 h-5 shrink-0 mt-0.5" />
                            }
                            <div className="text-sm font-semibold">{statMsg.text}</div>
                        </motion.div>
                    )}

                    {isWarningNote1Applicable() && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 rounded-xl p-4 flex items-start gap-3 shadow-lg overflow-hidden max-w-3xl ml-0"
                        >
                            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <span className="font-bold">NOTE 1:</span> {getNote1WarningText()}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Correction Tables Tabs */}
                <div className="mt-8 glass-panel shadow-xl overflow-hidden mb-20 max-w-3xl ml-0">
                    {/* Tab Headers */}
                    <div className="flex border-b border-white/10 bg-black/20">
                        <button
                            onClick={() => setActiveTableTab('procedure')}
                            className={cn(
                                "flex-1 py-3 px-6 text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2",
                                activeTableTab === 'procedure'
                                    ? "bg-aviation-accent/10 text-white border-b-2 border-aviation-accent"
                                    : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                            )}
                        >
                            <Activity className="w-4 h-4" />
                            PROCEDURE
                        </button>
                        <button
                            onClick={() => setActiveTableTab('stepdown')}
                            className={cn(
                                "flex-1 py-3 px-6 text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2",
                                activeTableTab === 'stepdown'
                                    ? "bg-aviation-accent/10 text-white border-b-2 border-aviation-accent"
                                    : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                            )}
                        >
                            <Ruler className="w-4 h-4" />
                            STEP-DOWN
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="p-5">
                        <AnimatePresence mode="wait">
                            {activeTableTab === 'procedure' ? (
                                <motion.div
                                    key="procedure-tab"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <div className="flex justify-end mb-4">
                                        <button onClick={addFix} className="flex items-center gap-1.5 px-3 py-1.5 bg-aviation-accent/10 hover:bg-aviation-accent/20 text-aviation-accent rounded-lg border border-aviation-accent/30 text-xs font-bold transition-colors">
                                            <Plus className="w-3.5 h-3.5" />
                                            ADD FIX
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-500 uppercase px-2">
                                            <div className="col-span-4">Fix Name</div>
                                            <div className="col-span-3 text-center">Published</div>
                                            <div className="col-span-3 text-aviation-accent text-center">Corrected</div>
                                            <div className="col-span-2 text-center">Type</div>
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
                                                        className="grid grid-cols-12 gap-2 items-center bg-black/20 p-2 rounded-lg border border-white/5 group relative"
                                                    >
                                                        <div className="col-span-4">
                                                            <input
                                                                type="text"
                                                                value={fix.name}
                                                                onChange={(e) => updateFix(fix.id, 'name', e.target.value)}
                                                                placeholder="Fix"
                                                                className="w-full bg-transparent border-none text-sm font-semibold text-white focus:outline-none placeholder-slate-600 truncate"
                                                            />
                                                        </div>
                                                        <div className="col-span-3 flex justify-center">
                                                            <input
                                                                type="number"
                                                                value={fix.altitude}
                                                                onChange={(e) => updateFix(fix.id, 'altitude', e.target.value)}
                                                                placeholder="Alt"
                                                                className="w-full max-w-[90px] text-center bg-black/40 border border-white/10 rounded-md px-2 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-aviation-accent"
                                                            />
                                                        </div>
                                                        <div className="col-span-3 flex items-center justify-center">
                                                            <div className={cn(
                                                                "w-full max-w-[90px] text-center py-1.5 rounded-md font-mono text-sm font-bold shadow-inner bg-black/60",
                                                                corrected.disabled ? "text-slate-500 border border-white/5" : "text-aviation-accent border border-aviation-accent/30"
                                                            )}>
                                                                {corrected.string}
                                                            </div>
                                                        </div>
                                                        <div className="col-span-2 flex items-center justify-center">
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
                                                                    "text-[10px] font-bold px-1 py-1 rounded border-none focus:outline-none appearance-none cursor-pointer text-center w-full",
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
                                                        <button onClick={() => removeFix(fix.id)} className="absolute -left-3 -top-3 w-6 h-6 bg-red-500/90 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10 scale-75 hover:scale-100">
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
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
                                >
                                    <div className="flex justify-end mb-4">
                                        <button onClick={addStepDown} className="flex items-center gap-1.5 px-3 py-1.5 bg-aviation-accent/10 hover:bg-aviation-accent/20 text-aviation-accent rounded-lg border border-aviation-accent/30 text-xs font-bold transition-colors">
                                            <Plus className="w-3.5 h-3.5" />
                                            ADD STEP
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-500 uppercase px-2 text-center">
                                            <div className="col-span-4">Distance</div>
                                            <div className="col-span-4 text-center">Published</div>
                                            <div className="col-span-4 text-aviation-accent text-center">Corrected</div>
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
                                                        className="grid grid-cols-12 gap-2 items-center bg-black/20 p-2 rounded-lg border border-white/5 relative group"
                                                    >
                                                        <div className="col-span-4 flex items-center gap-1 justify-center">
                                                            <span className="text-slate-500 font-mono text-xs pl-2">D</span>
                                                            <input
                                                                type="number"
                                                                step="0.1"
                                                                value={sd.distance}
                                                                onChange={(e) => updateStepDown(sd.id, 'distance', e.target.value)}
                                                                placeholder="2.0"
                                                                className="w-full max-w-[70px] bg-transparent border-none text-sm font-semibold text-white focus:outline-none placeholder-slate-600 font-mono text-center px-1"
                                                            />
                                                        </div>
                                                        <div className="col-span-4 flex justify-center">
                                                            <input
                                                                type="number"
                                                                value={sd.altitude}
                                                                onChange={(e) => updateStepDown(sd.id, 'altitude', e.target.value)}
                                                                placeholder="Alt"
                                                                className="w-full max-w-[90px] text-center bg-black/40 border border-white/10 rounded-md px-2 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-aviation-accent"
                                                            />
                                                        </div>
                                                        <div className="col-span-4 flex items-center justify-center">
                                                            <div className={cn(
                                                                "w-full max-w-[90px] text-center py-1.5 rounded-md font-mono text-sm font-bold shadow-inner bg-black/60",
                                                                corrected.disabled ? "text-slate-500 border border-white/5" : "text-aviation-accent border border-aviation-accent/30"
                                                            )}>
                                                                {corrected.string}
                                                            </div>
                                                        </div>
                                                        <button onClick={() => removeStepDown(sd.id)} className="absolute -left-3 -top-3 w-6 h-6 bg-red-500/90 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10 scale-75 hover:scale-100">
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
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
