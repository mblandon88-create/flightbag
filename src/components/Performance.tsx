import React from 'react';
import { useStore } from '../store/useStore';
import { Fuel, Weight } from 'lucide-react';
import { cn } from '../lib/utils';

const formatNumber = (val: string | number) => {
    const num = typeof val === 'string' ? parseInt(val) : val;
    if (isNaN(num)) return val.toString();
    // Using Unicode Thin Space (\u2009) for a narrower gap
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u2009");
};

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
    const mlw = parseInt(flightData.mlw) || 0;
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
    const eLW = eTOW - trip;

    // Endurance calculation: How long the total ramp fuel lasts at the trip burn rate
    const burnRate = trip > 0 && flightData.tripTime > 0 ? trip / flightData.tripTime : 0;
    const enduranceMinutes = burnRate > 0 ? Math.floor(currentRampFuel / burnRate) : 0;

    return (
        <div className="flex-1 flex flex-col gap-4 md:gap-6 min-h-0">
            <section className="shrink-0">
                <h3 className="text-xl md:text-2xl font-bold text-white mb-1">Performance Data</h3>
                <p className="text-slate-400 text-xs md:text-sm">Review and verify fuel and weight planning parameters.</p>
            </section>

            <div className="flex-1 flex flex-row flex-wrap gap-4 md:gap-8 min-h-0 items-start">
                {/* Fuel Planning */}
                <div className="glass-panel overflow-hidden flex flex-col min-h-0 w-full max-w-[360px]">
                    <div className="px-4 py-3 md:px-6 md:py-4 bg-aviation-accent/5 border-b border-white/5 flex items-center gap-3 shrink-0">
                        <Fuel className="w-4 h-4 md:w-5 md:h-5 text-aviation-accent" />
                        <h4 className="font-bold text-aviation-accent uppercase tracking-widest text-[11px] md:text-xs">Fuel Planning (kg)</h4>
                    </div>
                    <div className="flex-1 p-4 md:p-5 space-y-1 md:space-y-2 overflow-y-auto custom-scrollbar">
                        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">
                            <span className="w-32 shrink-0"></span>
                            <span className="w-24 text-right pr-8">Fuel</span>
                            <span>Time</span>
                        </div>
                        <PerformanceRow label="Taxi" value={flightData.taxiFuel} time={flightData.taxiTime} valuePadding="pr-8" />
                        <PerformanceRow label="Trip" value={flightData.tripFuel} time={flightData.tripTime} valuePadding="pr-8" />
                        <PerformanceRow
                            label={`CONT. ${flightData.contingencyRemarks ? `(${flightData.contingencyRemarks})` : ''}`}
                            value={flightData.contingencyFuel}
                            time={flightData.contTime}
                            valuePadding="pr-8"
                        />
                        <PerformanceRow label="ALT" value={flightData.altFuel} time={flightData.altTime} valuePadding="pr-8" />
                        <PerformanceRow label="FINL" value={flightData.finResFuel} time={flightData.finlTime} valuePadding="pr-8" />
                        <div className="pt-2 border-t border-white/5">
                            <PerformanceRow label="Min Fuel Req" value={flightData.minReqFuel} time={flightData.minReqTime} success valuePadding="pr-8" />
                        </div>
                        <PerformanceRow label="Extra" value={flightData.extraFuel} time={flightData.extraTime} valuePadding="pr-8" />
                        <PerformanceRow
                            label="PICD"
                            value={flightData.picFuel}
                            input
                            onChange={(val) => updateFlightData({ picFuel: val })}
                            labelWidth="w-32"
                            inputWidth="w-16"
                            valuePadding="pr-1"
                        />
                        <div className="pt-4 border-t border-white/5 space-y-3">
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="text-base font-bold text-aviation-accent uppercase tracking-widest w-32 shrink-0">Ramp Fuel</span>
                                <div className="flex items-center gap-8">
                                    <span className="text-xl md:text-2xl font-mono font-bold text-aviation-accent">{formatNumber(currentRampFuel)}</span>
                                    <span className="text-lg font-mono font-bold text-aviation-accent/60">
                                        {Math.floor(flightData.rampTime / 60).toString().padStart(2, '0')}:{(flightData.rampTime % 60).toString().padStart(2, '0')}
                                    </span>
                                </div>
                            </div>

                            {enduranceMinutes > 0 && (
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest w-32 shrink-0">Total Endurance</span>
                                    <span className="text-sm font-mono font-bold text-aviation-success">
                                        {Math.floor(enduranceMinutes / 60).toString().padStart(2, '0')}:{(enduranceMinutes % 60).toString().padStart(2, '0')}
                                    </span>
                                    <span className="text-[10px] text-slate-500 italic ml-2">(at planned burn)</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Weight Planning */}
                <div className="glass-panel overflow-hidden flex flex-col min-h-0 w-full max-w-[460px]">
                    <div className="px-4 py-3 md:px-6 md:py-4 bg-aviation-warning/5 border-b border-white/5 flex items-center gap-3 shrink-0">
                        <Weight className="w-4 h-4 md:w-5 md:h-5 text-aviation-warning" />
                        <h4 className="font-bold text-aviation-warning uppercase tracking-widest text-[11px] md:text-xs">Weight Planning (kg)</h4>
                    </div>
                    <div className="flex-1 p-4 md:p-5 flex flex-col overflow-y-auto custom-scrollbar">
                        <div className="flex flex-wrap gap-x-12 gap-y-4 pb-4">
                            <div className="space-y-2 min-w-[140px]">
                                <PerformanceRow label="MZFW" value={mzfw.toString()} labelWidth="w-12" gap="gap-1" />
                                <PerformanceRow label="EZFW" value={flightData.ezfw} labelWidth="w-12" gap="gap-1" />
                                <PerformanceRow
                                    label="Diff"
                                    value={(mzfw - ezfw).toString()}
                                    labelWidth="w-12"
                                    gap="gap-1"
                                    success={mzfw - ezfw >= 0}
                                    error={mzfw - ezfw < 0}
                                />
                            </div>
                            <div className="space-y-2 min-w-[140px]">
                                <PerformanceRow label="MTOW" value={mtow.toString()} labelWidth="w-12" gap="gap-1" />
                                <div className="flex flex-col gap-1">
                                    <PerformanceRow
                                        label="ETOW"
                                        value={eTOW.toString()}
                                        error={eTOW > mtow}
                                        labelWidth="w-12"
                                        gap="gap-1"
                                    />
                                    <PerformanceRow
                                        label="Diff"
                                        value={(mtow - Math.round(eTOW)).toString()}
                                        labelWidth="w-12"
                                        gap="gap-1"
                                        success={mtow - eTOW >= 0}
                                        error={mtow - eTOW < 0}
                                    />
                                    {eTOW > mtow && (
                                        <span className="text-[10px] text-aviation-warning font-bold uppercase tracking-tighter text-right">EXCEEDS MTOW!</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="w-full border-t border-white/10" />

                        <div className="flex flex-wrap gap-x-12 gap-y-4 pt-4">
                            <div className="space-y-2 min-w-[140px]">
                                <PerformanceRow label="MLW" value={mlw.toString()} labelWidth="w-12" gap="gap-1" />
                                <div className="flex flex-col gap-1">
                                    <PerformanceRow
                                        label="ELW"
                                        value={eLW.toString()}
                                        error={eLW > mlw}
                                        labelWidth="w-12"
                                        gap="gap-1"
                                    />
                                    <PerformanceRow
                                        label="Diff"
                                        value={(mlw - Math.round(eLW)).toString()}
                                        labelWidth="w-12"
                                        gap="gap-1"
                                        success={mlw - eLW >= 0}
                                        error={mlw - eLW < 0}
                                    />
                                    {eLW > mlw && (
                                        <span className="text-[10px] text-aviation-warning font-bold uppercase tracking-tighter text-right">EXCEEDS MLW!</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

function PerformanceRow({
    label,
    value,
    success,
    error,
    input,
    onChange,
    labelWidth = "w-32",
    time,
    valuePadding = "pr-4",
    gap = "gap-2",
    inputWidth = "w-24"
}: {
    label: string,
    value: string,
    success?: boolean,
    error?: boolean,
    input?: boolean,
    onChange?: (val: string) => void,
    labelWidth?: string,
    time?: number,
    valuePadding?: string,
    gap?: string,
    inputWidth?: string
}) {
    const formattedTime = time !== undefined ? `${Math.floor(time / 60).toString().padStart(2, '0')}:${(time % 60).toString().padStart(2, '0')}` : null;

    return (
        <div className={cn("flex items-center group", gap)}>
            <span className={cn(
                "text-base text-slate-500 font-medium group-hover:text-slate-400 transition-colors uppercase tracking-tight shrink-0",
                labelWidth
            )}>{label}:</span>
            <div className="flex items-center">
                {input ? (
                    <input
                        type="number"
                        value={value}
                        onChange={(e) => onChange?.(e.target.value)}
                        className={cn(
                            "bg-black/40 border border-white/10 rounded pl-2 py-0.5 text-base font-mono text-white text-right focus:outline-none focus:border-aviation-accent",
                            inputWidth,
                            valuePadding
                        )}
                    />
                ) : (
                    <span className={cn(
                        "text-base font-mono font-bold w-24 text-right",
                        valuePadding,
                        success ? "text-aviation-success" : (error ? "text-aviation-warning" : "text-slate-200")
                    )}>
                        {formatNumber(value)}
                    </span>
                )}

                {formattedTime && (
                    <span className="text-base font-mono font-bold text-slate-400">
                        {formattedTime}
                    </span>
                )}
            </div>
        </div>
    );
}
