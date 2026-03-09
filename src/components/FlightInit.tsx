import React, { useState } from 'react';
import { parseLidoPDF, parseLidoText } from '../utils/pdfParser';
import { Upload, Loader2, CheckCircle2, Clipboard } from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn, formatNumber } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export const FlightInit: React.FC = () => {
    const { flightData, setFlightData, clearFlightData } = useStore();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeDataTab, setActiveDataTab] = useState<'general' | 'route'>('general');

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setError(null);
        clearFlightData();
        try {
            const parsed = await parseLidoPDF(file);
            setFlightData(parsed);
        } catch (err) {
            console.error(err);
            setError('Failed to parse PDF. Ensure it is a valid LIDO format.');
        } finally {
            setLoading(false);
        }
    };

    const handlePasteSubmit = (text: string) => {
        if (!text.trim()) {
            setError('Clipboard is empty. Please copy the LIDO text first.');
            return;
        }
        setLoading(true);
        setError(null);
        clearFlightData();
        try {
            const parsed = parseLidoText(text);
            setFlightData(parsed);
        } catch (err) {
            console.error(err);
            setError('Failed to parse text. Ensure you copied the entire LIDO flight plan.');
        } finally {
            setLoading(false);
        }
    };

    const handlePasteFromClipboard = async () => {
        setError(null);
        try {
            if (!navigator.clipboard || !navigator.clipboard.readText) {
                throw new Error('Clipboard API not available');
            }
            const text = await navigator.clipboard.readText();
            handlePasteSubmit(text);
        } catch (err) {
            console.error(err);
            setError('Unable to access clipboard. Please ensure the app has permission and you are using a secure connection (HTTPS or localhost).');
        }
    };

    return (
        <div className="flex-1 flex flex-col gap-4 md:gap-6 min-h-0">
            <section className="shrink-0">
                <h3 className="text-lg md:text-xl font-bold text-white mb-0.5">Flight Initialization</h3>
                <p className="text-slate-400 text-xs md:text-sm">Load your LIDO Flight Plan to automatically initialize the EFB.</p>
            </section>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 min-h-0">
                <div className="md:col-span-1 flex flex-col gap-4">
                    {/* Upload Card */}
                    <div
                        className="glass-panel p-4 flex flex-col items-center justify-center border-dashed border-2 border-white/10 hover:border-aviation-accent/50 transition-colors cursor-pointer group shrink-0"
                        onClick={() => document.getElementById('pdf-upload')?.click()}
                    >
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-aviation-accent/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                            {loading ? (
                                <Loader2 className="w-4 h-4 md:w-5 md:h-5 text-aviation-accent animate-spin" />
                            ) : (
                                <Upload className="w-4 h-4 md:w-5 md:h-5 text-aviation-accent" />
                            )}
                        </div>
                        <span className="text-xs font-semibold text-white">
                            {loading ? 'Parsing...' : 'Upload LIDO PDF'}
                        </span>
                        <span className="text-[9px] text-slate-500 mt-1">Drag and drop or click</span>
                        <input
                            type="file"
                            id="pdf-upload"
                            accept="application/pdf"
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                    </div>

                    {/* Paste Card */}
                    <div
                        className="glass-panel p-4 flex flex-col items-center justify-center border-dashed border-2 border-white/10 hover:border-aviation-accent/50 transition-colors cursor-pointer group shrink-0"
                        onClick={handlePasteFromClipboard}
                    >
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-aviation-accent/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                            <Clipboard className="w-4 h-4 md:w-5 md:h-5 text-aviation-accent" />
                        </div>
                        <span className="text-xs font-semibold text-white">
                            Paste LIDO Text
                        </span>
                        <span className="text-[9px] text-slate-500 mt-1">Copy everything and click</span>
                    </div>

                    {error && <p className="text-aviation-warning text-[10px] mt-2 text-center">{error}</p>}

                    {flightData && (
                        <button
                            onClick={clearFlightData}
                            className="w-full py-2 px-4 rounded-lg border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:border-red-500/40 text-xs font-bold uppercase tracking-widest transition-all"
                        >
                            Clear Data
                        </button>
                    )}
                </div>

                {/* Data Display */}
                {flightData && (
                    <div className="md:col-span-3 glass-panel p-4 md:p-6 border-l-4 border-l-aviation-success flex flex-col min-h-0 animate-in fade-in slide-in-from-left-4 duration-300">
                        <div className="flex items-center gap-2 text-aviation-success mb-4 shrink-0">
                            <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" />
                            <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest">Data Loaded Successfully</span>
                        </div>

                        <div className="flex gap-4 mb-4 border-b border-white/5 pb-2 shrink-0">
                            <button
                                onClick={() => setActiveDataTab('general')}
                                className={cn(
                                    "text-[10px] font-bold uppercase tracking-widest pb-1 transition-all relative",
                                    activeDataTab === 'general' ? "text-aviation-accent" : "text-slate-500 hover:text-slate-300"
                                )}
                            >
                                General Info
                                {activeDataTab === 'general' && <motion.div layoutId="initTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-aviation-accent" />}
                            </button>
                            <button
                                onClick={() => setActiveDataTab('route')}
                                className={cn(
                                    "text-[10px] font-bold uppercase tracking-widest pb-1 transition-all relative",
                                    activeDataTab === 'route' ? "text-aviation-accent" : "text-slate-500 hover:text-slate-300"
                                )}
                            >
                                Route & FL
                                {activeDataTab === 'route' && <motion.div layoutId="initTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-aviation-accent" />}
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            <AnimatePresence mode="wait">
                                {activeDataTab === 'general' ? (
                                    <motion.div
                                        key="general"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10 }}
                                        transition={{ duration: 0.15 }}
                                        className="grid grid-cols-1 md:grid-cols-3 gap-y-6 gap-x-32 w-max"
                                    >
                                        {/* ROW 1: Flight, Route, A/C */}
                                        <DataField label="Flight Number" value={flightData.flightNumber} highlight />
                                        <DataField label="Route" value={`${flightData.departure} ➔ ${flightData.arrival}`} />
                                        <DataField label="A/C Type & Reg" value={`${flightData.aircraftType} (${flightData.registration})`} />

                                        {/* ROW 2: STD, Block, STA */}
                                        <DataField
                                            label="STD"
                                            value={flightData.std.includes('/') ? `${flightData.std.split('/')[1].substring(0, 2)}:${flightData.std.split('/')[1].substring(2, 4)}` : flightData.std}
                                            warning
                                        />
                                        <DataField
                                            label="Block Time (BLK)"
                                            value={flightData.blkTime.length === 4 ? `${flightData.blkTime.substring(0, 2)}:${flightData.blkTime.substring(2, 4)}` : flightData.blkTime}
                                            warning
                                        />
                                        <DataField
                                            label="STA"
                                            value={flightData.sta.includes('/') ? `${flightData.sta.split('/')[1].substring(0, 2)}:${flightData.sta.split('/')[1].substring(2, 4)}` : flightData.sta}
                                            warning
                                        />

                                        {/* ROW 3: Trip Time, Trip Fuel, Ramp Fuel */}
                                        <DataField
                                            label="Trip Time"
                                            value={`${Math.floor(flightData.tripTime / 60).toString().padStart(2, '0')}:${(flightData.tripTime % 60).toString().padStart(2, '0')}`}
                                        />
                                        <DataField label="Trip Fuel" value={`${formatNumber(flightData.tripFuel)} kg`} />
                                        <DataField label="Ramp Fuel" value={`${formatNumber(flightData.rampFuel)} kg`} />

                                        {/* ROW 4: EZFW, ETOW */}
                                        <DataField label="EZFW" value={`${formatNumber(flightData.ezfw)} kg`} warning />
                                        <DataField label="ETOW" value={`${formatNumber(flightData.etow)} kg`} warning />
                                        <div className="hidden md:block" /> {/* Column Spacer */}

                                        {/* ROW 5: MZFW, MTOW */}
                                        <DataField label="MZFW" value={`${formatNumber(flightData.mzfw)} kg`} />
                                        <DataField label="MTOW" value={`${formatNumber(flightData.mtow)} kg`} />
                                        <div className="hidden md:block" /> {/* Column Spacer */}
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="route"
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        transition={{ duration: 0.15 }}
                                        className="space-y-6"
                                    >
                                        <DataField label="Full Route String" value={flightData.route} mono />
                                        <DataField label="Flight Level(s)" value={flightData.flightLevel} warning />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

function DataField({ label, value, highlight, warning, mono }: { label: string, value: string, highlight?: boolean, warning?: boolean, mono?: boolean }) {
    return (
        <div className="flex flex-col">
            <span className="data-label text-[9px] uppercase tracking-tighter text-slate-500 font-bold mb-0">{label}</span>
            <p className={cn(
                "text-sm font-medium leading-tight",
                mono ? "font-mono" : "font-sans",
                highlight ? "text-aviation-accent font-bold" : "text-slate-200",
                warning ? "text-aviation-warning font-bold" : ""
            )}>
                {value}
            </p>
        </div>
    );
}
