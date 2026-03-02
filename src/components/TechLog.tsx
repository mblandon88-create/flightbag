import React from 'react';
import { useStore } from '../store/useStore';
import { Fuel, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

export const TechLog: React.FC = () => {
    const { flightData, meteredUplift, setMeteredUplift } = useStore();

    if (!flightData) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 glass-panel p-8">
                <Fuel className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-sm font-medium">Please load a flight plan in the Flight Init tab first.</p>
            </div>
        );
    }

    const rampFuel = parseInt(flightData.rampFuel) || 0;
    const specificGravity = 0.8;
    const upliftLiters = Math.round(meteredUplift / specificGravity);
    const discrepancy = meteredUplift - rampFuel;

    return (
        <div className="flex-1 flex flex-col gap-4 md:gap-6 min-h-0">
            <section className="shrink-0">
                <h3 className="text-xl md:text-2xl font-bold text-white mb-1">TechLog: Fuel Uplift</h3>
                <p className="text-slate-400 text-xs md:text-sm">Log and verify fuel uplift discrepancy.</p>
            </section>

            <div className="flex-1 flex flex-col items-center justify-center min-h-0">
                <div className="w-full max-w-xl glass-panel overflow-hidden border-t-4 border-t-aviation-accent">
                    <div className="p-6 md:p-8 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <TechStat label="Required Ramp" value={`${rampFuel} kg`} />
                            <TechStat label="Specific Gravity" value={specificGravity.toString()} />
                        </div>

                        <div className="bg-white/5 rounded-xl p-6 border border-white/5 space-y-4">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Metered Uplift (KG)</label>
                            <input
                                type="number"
                                value={meteredUplift || ''}
                                onChange={(e) => setMeteredUplift(parseInt(e.target.value) || 0)}
                                placeholder="ENTER KG"
                                className="w-full bg-black/40 border-2 border-aviation-accent/30 focus:border-aviation-accent rounded-xl p-4 text-2xl font-mono font-bold text-aviation-accent text-center focus:outline-none transition-colors"
                            />
                            <div className="flex justify-between items-center px-2">
                                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Equivalent Volume</span>
                                <span className="text-sm font-mono text-slate-300">{upliftLiters} Liters</span>
                            </div>
                        </div>

                        <div className={cn(
                            "flex flex-col items-center justify-center p-4 rounded-xl border",
                            Math.abs(discrepancy) > 500
                                ? "bg-aviation-warning/10 border-aviation-warning/30"
                                : "bg-aviation-success/10 border-aviation-success/30"
                        )}>
                            <div className="flex items-center gap-2 mb-1">
                                <ArrowRightLeft className={cn("w-4 h-4", Math.abs(discrepancy) > 500 ? "text-aviation-warning" : "text-aviation-success")} />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Fuel Discrepancy</span>
                            </div>
                            <span className={cn(
                                "text-2xl font-mono font-bold",
                                Math.abs(discrepancy) > 500 ? "text-aviation-warning" : "text-aviation-success"
                            )}>
                                {discrepancy > 0 ? '+' : ''}{discrepancy} kg
                            </span>
                            {Math.abs(discrepancy) > 500 && (
                                <div className="flex items-center gap-1 mt-2 text-aviation-warning">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span className="text-[9px] font-bold uppercase">Outside Standard Limits (±500kg)</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

function TechStat({ label, value }: { label: string, value: string }) {
    return (
        <div className="flex flex-col">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</span>
            <span className="text-sm font-mono font-bold text-white">{value}</span>
        </div>
    );
}
