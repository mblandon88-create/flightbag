import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Plus, Trash2, AlertTriangle, ShieldAlert, Package, X, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import erDrillData from '../data/ERDrill.json';
import { cn } from '../lib/utils'; // Assuming this utility is available, if not, inline string logic works but cn is clean.

export const DangerousGoods: React.FC = () => {
    const { dgItems, addDGItem, removeDGItem } = useStore();
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Modal State
    const [drillNo, setDrillNo] = useState('1');
    const [drillLetter, setDrillLetter] = useState('');

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!drillNo) return;

        addDGItem({
            id: crypto.randomUUID(),
            drillNo,
            drillLetter: drillLetter.toUpperCase()
        });

        // Reset and close
        setDrillNo('1');
        setDrillLetter('');
        setIsModalOpen(false);
    };

    // Helper to get drill data
    const getDrillData = (no: string) => {
        return erDrillData.drills.find(d => d.drill_no === no);
    };

    // Helper to get letter definition
    const getLetterDefinition = (letter: string) => {
        const key = letter.toUpperCase();
        return (erDrillData.drill_letter_key as Record<string, string>)[key] || null;
    };

    return (
        <div className="flex-1 flex flex-col gap-4 md:gap-6 min-h-0 relative">
            <section className="shrink-0 flex items-center justify-between">
                <div>
                    <h3 className="text-lg md:text-xl font-bold text-white mb-0.5">DG Manifest</h3>
                    <p className="text-slate-400 text-[10px] md:text-xs">Log required Notification to Captain items.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-aviation-warning text-black font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-aviation-warning/80 transition-colors shadow-[0_0_15px_rgba(234,179,8,0.3)]"
                >
                    <Plus className="w-5 h-5" /> <span className="hidden sm:inline">Add DG Item</span>
                </button>
            </section>

            <div className="flex-1 glass-panel flex flex-col overflow-hidden min-h-0">
                <div className="px-6 py-4 bg-white/5 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <ShieldAlert className="w-4 h-4 text-slate-400" />
                        <h4 className="font-bold text-white uppercase tracking-widest text-xs">Manifest</h4>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 bg-white/5 px-2 py-1 rounded-full">{dgItems.length} ITEMS</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                    {dgItems.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-40">
                            <Package className="w-12 h-12 mb-2" />
                            <p className="text-xs font-bold uppercase tracking-widest">No DG Items Logged</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {dgItems.map(item => {
                                const drill = getDrillData(item.drillNo);
                                const letterDef = item.drillLetter ? getLetterDefinition(item.drillLetter) : null;

                                return (
                                    <DGManifestItem
                                        key={item.id}
                                        item={item}
                                        drill={drill}
                                        letterDef={letterDef}
                                        remove={() => removeDGItem(item.id)}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setIsModalOpen(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 10 }}
                            className="glass-panel w-full max-w-md relative z-10 overflow-hidden shadow-2xl border border-white/10"
                        >
                            <div className="px-6 py-4 bg-aviation-warning/10 border-b border-aviation-warning/20 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <BookOpen className="w-5 h-5 text-aviation-warning" />
                                    <h4 className="font-bold text-aviation-warning uppercase tracking-widest text-sm">Add DG Item</h4>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleAdd} className="p-6 space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Drill Number *</label>
                                    <select
                                        value={drillNo}
                                        onChange={e => setDrillNo(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 focus:border-aviation-warning/50 rounded-lg p-3 text-sm text-white outline-none transition-colors appearance-none font-mono"
                                        required
                                    >
                                        {Array.from({ length: 11 }, (_, i) => i + 1).map(num => (
                                            <option key={num} value={num.toString()} className="bg-slate-900">{num}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Drill Letter (Optional)</label>
                                    <input
                                        type="text"
                                        value={drillLetter}
                                        onChange={e => setDrillLetter(e.target.value.substring(0, 1).toUpperCase())}
                                        placeholder="e.g. W"
                                        maxLength={1}
                                        className="w-full bg-black/40 border border-white/10 focus:border-aviation-warning/50 rounded-lg p-3 text-sm text-white placeholder:text-slate-700 outline-none transition-colors font-mono uppercase"
                                    />
                                    <p className="text-[10px] text-slate-500 px-1 mt-1">Single letter only (A, C, E, F, H, i, L, M, N, P, S, W, X, Y)</p>
                                </div>

                                <div className="pt-2 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 bg-white/5 text-white font-bold py-3 rounded-xl hover:bg-white/10 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 bg-aviation-warning text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-aviation-warning/80 transition-colors shadow-lg"
                                    >
                                        Add Item
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Sub-component for individual DG manifest items (handles expand/collapse)
function DGManifestItem({ item, drill, letterDef, remove }: { item: any; drill: any; letterDef: any; remove: () => void; }) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="flex flex-col bg-black/40 border-l-4 border-l-aviation-warning border-y border-r border-white/5 rounded-r-xl group animate-in slide-in-from-right-2 overflow-hidden shadow-md transition-all">
            {/* Header Row (Clickable to expand) */}
            <div
                className="flex justify-between items-center p-3 md:p-4 bg-white/5 border-b border-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3 md:gap-4">
                    {/* Combined Drill Identifier */}
                    <div className="flex items-center justify-center min-w-[60px] bg-aviation-warning/20 px-3 py-1.5 rounded-lg border border-aviation-warning/30 shadow-sm">
                        <div className="flex items-baseline gap-[1px]">
                            <span className="text-xl md:text-2xl font-mono font-black text-aviation-warning leading-none tracking-tighter drop-shadow-md">{item.drillNo}</span>
                            {item.drillLetter && (
                                <span className={cn("text-xl md:text-2xl font-mono font-black text-aviation-accent leading-none drop-shadow-md")}>{item.drillLetter}</span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col">
                        <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Drill Identifier</span>
                        {/* Drill Letter Definition Tag in header if collapsed */}
                        {!isExpanded && letterDef ? (
                            <span className="text-[10px] md:text-xs font-mono font-bold text-slate-300 truncate max-w-[150px] sm:max-w-none">
                                [{item.drillLetter}] {letterDef}
                            </span>
                        ) : (
                            <span className="text-xs font-mono font-bold text-slate-500">
                                {isExpanded ? 'Details Expanded' : 'Click to expand'}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); remove(); }}
                        className="p-2 text-slate-600 hover:text-aviation-warning hover:bg-white/5 transition-colors rounded-lg"
                        title="Remove Item"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                    {/* Expand/Collapse Indicator */}
                    <div className="p-1.5 text-slate-500 hidden sm:block">
                        <svg className={cn("w-5 h-5 transition-transform duration-300", isExpanded ? 'rotate-180 text-aviation-warning' : '')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Expandable Content Area */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 md:p-6 space-y-4 md:space-y-6 bg-black/20 border-t border-white/5">
                            {/* Drill Letter Definition Tag */}
                            {letterDef && (
                                <div className="flex items-center gap-2">
                                    <span className="bg-aviation-accent/20 border border-aviation-accent/30 text-aviation-accent px-3 py-1.5 rounded-md text-[10px] md:text-xs font-mono font-bold shadow-sm">
                                        [{item.drillLetter}] {letterDef}
                                    </span>
                                </div>
                            )}

                            {/* Guidance Display */}
                            {drill ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
                                    <div className="space-y-4">
                                        <InfoBlock label="Inherent Risk" value={drill.inherent_risk} />
                                        <InfoBlock label="Risk to Aircraft" value={drill.risk_to_aircraft} />
                                        <InfoBlock label="Risk to Occupants" value={drill.risk_to_occupants} />
                                    </div>
                                    <div className="space-y-4">
                                        <InfoBlock label="Spill or Leak Procedure" value={drill.spill_or_leak_procedure} highlight />
                                        <InfoBlock label="Firefighting Procedure" value={drill.firefighting_procedure} highlight />
                                        <InfoBlock label="Additional Considerations" value={drill.additional_considerations} />
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm text-slate-400 italic flex items-center gap-2 py-2">
                                    <AlertTriangle className="w-4 h-4 text-aviation-warning" />
                                    Drill data not found for No. {item.drillNo}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Sub-component for displaying the drill data cleanly
function InfoBlock({ label, value, highlight }: { label: string, value: string, highlight?: boolean }) {
    if (!value) return null;
    return (
        <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
            <p className={`text-sm ${highlight ? 'text-white font-medium' : 'text-slate-300'}`}>
                {value}
            </p>
        </div>
    );
}
