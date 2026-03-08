import React, { useState } from 'react';
import { parseLidoPDF, parseLidoText } from '../utils/pdfParser';
import { Upload, Loader2, CheckCircle2, Clipboard } from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn, formatNumber } from '../lib/utils';

export const FlightInit: React.FC = () => {
    const { flightData, setFlightData, clearFlightData } = useStore();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPasting, setIsPasting] = useState(false);
    const [pasteText, setPasteText] = useState('');

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

    const handlePasteSubmit = () => {
        if (!pasteText.trim()) return;
        setLoading(true);
        setError(null);
        clearFlightData();
        try {
            const parsed = parseLidoText(pasteText);
            setFlightData(parsed);
            setIsPasting(false);
            setPasteText('');
        } catch (err) {
            console.error(err);
            setError('Failed to parse text. Ensure you copied the entire LIDO flight plan.');
        } finally {
            setLoading(false);
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
                            {loading && !isPasting ? (
                                <Loader2 className="w-4 h-4 md:w-5 md:h-5 text-aviation-accent animate-spin" />
                            ) : (
                                <Upload className="w-4 h-4 md:w-5 md:h-5 text-aviation-accent" />
                            )}
                        </div>
                        <span className="text-xs font-semibold text-white">
                            {loading && !isPasting ? 'Parsing...' : 'Upload LIDO PDF'}
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
                        onClick={() => setIsPasting(true)}
                    >
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-aviation-accent/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                            <Clipboard className="w-4 h-4 md:w-5 md:h-5 text-aviation-accent" />
                        </div>
                        <span className="text-xs font-semibold text-white">
                            Paste LIDO Text
                        </span>
                        <span className="text-[9px] text-slate-500 mt-1">Copy everything and paste</span>
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

                {/* Paste Modal */}
                {isPasting && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="glass-panel w-full max-w-2xl p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between">
                                <h4 className="text-lg font-bold text-white uppercase tracking-wider">Paste Flight Plan Text</h4>
                                <button
                                    onClick={() => setIsPasting(false)}
                                    className="text-slate-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                            <p className="text-xs text-slate-400">Paste the entire text content of your LIDO flight plan below.</p>
                            <textarea
                                className="flex-1 min-h-[300px] bg-aviation-bg/60 border border-white/10 rounded-lg p-4 font-mono text-xs text-slate-300 focus:outline-none focus:border-aviation-accent custom-scrollbar resize-none"
                                placeholder="Paste LIDO text here..."
                                value={pasteText}
                                onChange={(e) => setPasteText(e.target.value)}
                                autoFocus
                            />
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setIsPasting(false)}
                                    className="flex-1 py-3 border border-white/10 text-white font-bold uppercase tracking-widest rounded-lg hover:bg-white/5 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handlePasteSubmit}
                                    disabled={!pasteText.trim() || loading}
                                    className="flex-[2] py-3 bg-aviation-accent text-black font-bold uppercase tracking-widest rounded-lg hover:bg-aviation-accent/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                    {loading ? 'Parsing...' : 'Parse Flight Plan'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Data Display */}
                {flightData && (
                    <div className="md:col-span-3 glass-panel p-4 md:p-6 border-l-4 border-l-aviation-success flex flex-col min-h-0 animate-in fade-in slide-in-from-left-4 duration-300">
                        <div className="flex items-center gap-2 text-aviation-success mb-4 shrink-0">
                            <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" />
                            <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest">Data Loaded Successfully</span>
                        </div>

                        <div className="flex-1 grid grid-cols-2 gap-y-4 gap-x-8 md:gap-x-12 overflow-y-auto pr-2 custom-scrollbar">
                            <DataField label="Flight Number" value={flightData.flightNumber} highlight />
                            <DataField label="Route" value={`${flightData.departure} ➔ ${flightData.arrival}`} />
                            <DataField
                                label="STD"
                                value={flightData.std.includes('/') ? `${flightData.std.split('/')[1].substring(0, 2)}:${flightData.std.split('/')[1].substring(2, 4)}` : flightData.std}
                                warning
                            />
                            <DataField
                                label="STA"
                                value={flightData.sta.includes('/') ? `${flightData.sta.split('/')[1].substring(0, 2)}:${flightData.sta.split('/')[1].substring(2, 4)}` : flightData.sta}
                                warning
                            />
                            <DataField
                                label="Block Time (BLK)"
                                value={flightData.blkTime.length === 4 ? `${flightData.blkTime.substring(0, 2)}:${flightData.blkTime.substring(2, 4)}` : flightData.blkTime}
                                warning
                            />
                            <DataField
                                label="Trip Time"
                                value={`${Math.floor(flightData.tripTime / 60).toString().padStart(2, '0')}:${(flightData.tripTime % 60).toString().padStart(2, '0')}`}
                                warning
                            />
                            <DataField label="Trip Fuel" value={`${formatNumber(flightData.tripFuel)} kg`} />
                            <DataField label="Ramp Fuel" value={`${formatNumber(flightData.rampFuel)} kg`} />
                            <DataField label="MZFW" value={`${formatNumber(flightData.mzfw)} kg`} />
                            <DataField label="MTOW" value={`${formatNumber(flightData.mtow)} kg`} />

                            <div className="col-span-2 pt-4 border-t border-white/5">
                                <DataField label="Full Route String" value={flightData.route} mono />
                            </div>
                            <div className="col-span-2">
                                <DataField label="Flight Level(s)" value={flightData.flightLevel} warning />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

function DataField({ label, value, highlight, warning, mono }: { label: string, value: string, highlight?: boolean, warning?: boolean, mono?: boolean }) {
    return (
        <div className="space-y-1">
            <span className="data-label text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{label}</span>
            <p className={cn(
                "text-sm font-medium",
                mono ? "font-mono" : "font-sans",
                highlight ? "text-aviation-accent font-bold" : "text-slate-200",
                warning ? "text-aviation-warning font-bold" : ""
            )}>
                {value}
            </p>
        </div>
    );
}
