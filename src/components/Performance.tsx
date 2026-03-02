import React from 'react';
import { useStore } from '../store/useStore';
import { Fuel, Weight } from 'lucide-react';
import { cn } from '../lib/utils';

export const Performance: React.FC = () => {
    const { flightData, updateFlightData } = useStore();

    if (!flightData) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 glass-panel p-8">
                <Fuel className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-sm font-medium">Please load a flight plan in the Flight Init tab first.</p>
            </div>
        );
    }

    const mtow = parseInt(flightData.mtow) || 0;
    const mzfw = parseInt(flightData.mzfw) || 0;
    const ezfw = parseInt(flightData.ezfw) || 0;

    const taxi = parseInt(flightData.taxiFuel) || 0;
    const trip = parseInt(flightData.tripFuel) || 0;
    const cont = parseInt(flightData.contingencyFuel) || 0;
    const alt = parseInt(flightData.altFuel) || 0;
    const finl = parseInt(flightData.finResFuel) || 0;
    const extra = parseInt(flightData.extraFuel) || 0;
    const picd = parseInt(flightData.picFuel) || 0;

    const currentRampFuel = taxi + trip + cont + alt + finl + extra + picd;
    const eTOW = ezfw + currentRampFuel - taxi;

    return (
        <div className="flex-1 flex flex-col gap-4 md:gap-6 min-h-0">
            <section className="shrink-0">
                <h3 className="text-xl md:text-2xl font-bold text-white mb-1">Performance Data</h3>
                <p className="text-slate-400 text-xs md:text-sm">Review and verify fuel and weight planning parameters.</p>
            </section>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8 min-h-0">
                {/* Fuel Planning */}
                <div className="glass-panel overflow-hidden flex flex-col min-h-0">
                    <div className="px-4 py-3 md:px-6 md:py-4 bg-aviation-accent/5 border-b border-white/5 flex items-center gap-3 shrink-0">
                        <Fuel className="w-4 h-4 md:w-5 md:h-5 text-aviation-accent" />
                        <h4 className="font-bold text-aviation-accent uppercase tracking-widest text-[10px] md:text-xs">Fuel Planning (kg)</h4>
                    </div>
                    <div className="flex-1 p-4 md:p-6 space-y-2 md:space-y-4 overflow-y-auto custom-scrollbar">
                        <PerformanceRow label="Taxi" value={flightData.taxiFuel} />
                        <PerformanceRow label="Trip" value={flightData.tripFuel} />
                        <PerformanceRow label={`CONT. ${flightData.contingencyRemarks ? `(${flightData.contingencyRemarks})` : ''}`} value={flightData.contingencyFuel} />
                        <PerformanceRow label="ALT" value={flightData.altFuel} />
                        <PerformanceRow label="FINL" value={flightData.finResFuel} />
                        <div className="pt-2 border-t border-white/5">
                            <PerformanceRow label="Min Fuel Req" value={flightData.minReqFuel} success />
                        </div>
                        <PerformanceRow label="Extra" value={flightData.extraFuel} />
                        <PerformanceRow
                            label="PICD"
                            value={flightData.picFuel}
                            input
                            onChange={(val) => updateFlightData({ picFuel: val })}
                        />
                        <div className="pt-4 border-t border-white/5 flex justify-between items-center shrink-0">
                            <span className="text-xs md:text-sm font-bold text-aviation-accent uppercase tracking-widest">Ramp Fuel</span>
                            <span className="text-xl md:text-2xl font-mono font-bold text-aviation-accent">{currentRampFuel}</span>
                        </div>
                    </div>
                </div>

                {/* Weight Planning */}
                <div className="glass-panel overflow-hidden flex flex-col min-h-0">
                    <div className="px-4 py-3 md:px-6 md:py-4 bg-aviation-warning/5 border-b border-white/5 flex items-center gap-3 shrink-0">
                        <Weight className="w-4 h-4 md:w-5 md:h-5 text-aviation-warning" />
                        <h4 className="font-bold text-aviation-warning uppercase tracking-widest text-[10px] md:text-xs">Weight Planning (kg)</h4>
                    </div>
                    <div className="flex-1 p-4 md:p-6 grid grid-cols-2 gap-4 md:gap-8 overflow-y-auto custom-scrollbar">
                        <div className="space-y-4">
                            <PerformanceRow label="MZFW" value={mzfw.toString()} />
                            <PerformanceRow label="MTOW" value={mtow.toString()} />
                        </div>
                        <div className="space-y-4">
                            <PerformanceRow label="EZFW" value={flightData.ezfw} />
                            <div className="flex flex-col gap-1">
                                <PerformanceRow
                                    label="ETOW"
                                    value={eTOW.toString()}
                                    error={eTOW > mtow}
                                />
                                {eTOW > mtow && (
                                    <span className="text-[9px] text-aviation-warning font-bold uppercase tracking-tighter text-right">EXCEEDS MTOW!</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

function PerformanceRow({ label, value, success, error, input, onChange }: { label: string, value: string, success?: boolean, error?: boolean, input?: boolean, onChange?: (val: string) => void }) {
    return (
        <div className="flex justify-between items-center group">
            <span className="text-xs text-slate-500 font-medium group-hover:text-slate-400 transition-colors uppercase tracking-tight">{label}:</span>
            {input ? (
                <input
                    type="number"
                    value={value}
                    onChange={(e) => onChange?.(e.target.value)}
                    className="bg-black/40 border border-white/10 rounded px-2 py-0.5 text-xs font-mono text-white w-20 text-right focus:outline-none focus:border-aviation-accent"
                />
            ) : (
                <span className={cn(
                    "text-xs font-mono font-bold",
                    success ? "text-aviation-success" : (error ? "text-aviation-warning" : "text-slate-200")
                )}>
                    {value}
                </span>
            )}
        </div>
    );
}
