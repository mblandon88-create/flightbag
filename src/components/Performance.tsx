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
    const { flightData, updateFlightData, inflightData, setInflightData } = useStore();

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

    const plannedRampFuel = taxi + trip + cont + alt + finl + extra + picd;

    // Tactical Actuals
    const actualRampFuel = inflightData.revisedRampFuel ? parseInt(inflightData.revisedRampFuel) : plannedRampFuel;
    const actualEzfw = inflightData.revisedEzfw ? parseInt(inflightData.revisedEzfw) : ezfw;

    const plannedEtow = ezfw + plannedRampFuel - taxi;
    const rTOW = actualEzfw + actualRampFuel - taxi;
    const eLW = rTOW - trip;

    // Decision Support: Max Allowable Fuel
    const maxFuelMtow = mtow - actualEzfw + taxi;
    const maxFuelMlw = mlw - actualEzfw + taxi + trip;
    const maxAllowableFuel = Math.min(maxFuelMtow, maxFuelMlw);
    const limitingFactor = maxFuelMtow < maxFuelMlw ? 'MTOW' : 'MLW';
    const fuelExceedsMax = actualRampFuel > maxAllowableFuel;

    return (
        <div className="flex-1 flex flex-col gap-4 md:gap-6 min-h-0">
            <section className="shrink-0">
                <h3 className="text-lg md:text-xl font-bold text-white mb-0.5">Performance Data</h3>
                <p className="text-slate-400 text-[10px] md:text-xs">Review and verify fuel and weight planning parameters.</p>
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
                        <PerformanceRow label="Taxi" value={flightData.taxiFuel} time={flightData.taxiTime} valuePadding="pr-8" textSize="text-sm" />
                        <PerformanceRow label="Trip" value={flightData.tripFuel} time={flightData.tripTime} valuePadding="pr-8" textSize="text-sm" />
                        <PerformanceRow
                            label={`CONT ${flightData.contingencyRemarks ? `(${flightData.contingencyRemarks})` : ''}`}
                            value={flightData.contingencyFuel}
                            time={flightData.contTime}
                            valuePadding="pr-8"
                            textSize="text-sm"
                        />
                        <PerformanceRow label="ALT" value={flightData.altFuel} time={flightData.altTime} valuePadding="pr-8" textSize="text-sm" />
                        <PerformanceRow label="FINL" value={flightData.finResFuel} time={flightData.finlTime} valuePadding="pr-8" textSize="text-sm" />
                        <div className="pt-2 border-t border-white/5">
                            <PerformanceRow label="Min Fuel Req" value={flightData.minReqFuel} time={flightData.minReqTime} success valuePadding="pr-8" textSize="text-sm" />
                        </div>
                        <PerformanceRow label="Extra" value={flightData.extraFuel} time={flightData.extraTime} valuePadding="pr-8" textSize="text-sm" />
                        <PerformanceRow
                            label="PICD"
                            value={flightData.picFuel}
                            input
                            onChange={(val) => updateFlightData({ picFuel: val })}
                            labelWidth="w-32"
                            inputWidth="w-16"
                            valuePadding="pr-1"
                            textSize="text-sm"
                        />
                        <div className="pt-4 border-t border-white/5 space-y-3">
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-1 shrink-0">
                                    <span className="text-sm font-bold text-aviation-accent uppercase tracking-widest w-20 shrink-0">Ramp Fuel</span>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] text-slate-500 font-bold uppercase w-10">Plan:</span>
                                            <div className="flex items-center">
                                                <span className="text-sm font-mono font-bold text-aviation-accent/60 w-24 text-right pr-8">{formatNumber(plannedRampFuel)}</span>
                                                <span className="text-xs font-mono font-bold text-slate-400">
                                                    {Math.floor(flightData.rampTime / 60).toString().padStart(2, '0')}:{(flightData.rampTime % 60).toString().padStart(2, '0')}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] text-aviation-accent font-bold uppercase w-10">Act:</span>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    value={inflightData.revisedRampFuel ? formatNumber(inflightData.revisedRampFuel) : ''}
                                                    placeholder={formatNumber(plannedRampFuel)}
                                                    onChange={(e) => setInflightData({ revisedRampFuel: e.target.value.replace(/\D/g, '') })}
                                                    className={cn(
                                                        "bg-black/40 border rounded py-0.5 text-sm font-mono text-aviation-accent w-18 text-right pr-2 focus:outline-none focus:border-aviation-accent",
                                                        fuelExceedsMax ? "border-red-500 text-red-500" : "border-aviation-accent/20 text-aviation-accent"
                                                    )}
                                                />
                                                {inflightData.revisedRampFuel && (
                                                    <span className={cn(
                                                        "text-[10px] font-mono font-bold",
                                                        (actualRampFuel - plannedRampFuel) >= 0 ? "text- aviation-warning" : "text-aviation-success"
                                                    )}>
                                                        {(actualRampFuel - plannedRampFuel) >= 0 ? '+' : ''}{formatNumber(actualRampFuel - plannedRampFuel)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1 pl-21 mt-1">
                                    <div className="flex items-center gap-1">
                                        <span className="text-[9px] text-slate-500 font-bold uppercase w-20 shrink-0">Max Allow:</span>
                                        <span className={cn(
                                            "text-xs font-mono font-bold whitespace-nowrap",
                                            fuelExceedsMax ? "text-red-500 underline decoration-wavy" : "text-slate-400"
                                        )}>
                                            {formatNumber(Math.floor(maxAllowableFuel))}
                                        </span>
                                        <span className="text-[9px] font-bold text-aviation-warning ml-1 shrink-0">
                                            ({limitingFactor})
                                        </span>
                                        {fuelExceedsMax && (
                                            <span className="text-[8px] text-red-500 font-bold uppercase animate-pulse ml-2 shrink-0">EXCEEDS {limitingFactor}</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="text-[9px] text-slate-500 font-bold uppercase w-20 shrink-0">Margin:</span>
                                        <span className={cn(
                                            "text-[10px] font-mono font-bold whitespace-nowrap",
                                            (maxAllowableFuel - actualRampFuel) >= 0 ? "text-aviation-success" : "text-red-500"
                                        )}>
                                            {(maxAllowableFuel - actualRampFuel) > 0 ? '+' : ''}{formatNumber(Math.floor(maxAllowableFuel - actualRampFuel))}
                                        </span>
                                    </div>
                                </div>
                            </div>
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
                            <div className="space-y-4 min-w-[180px]">
                                <div className="space-y-2">
                                    <PerformanceRow label="MZFW" value={mzfw.toString()} labelWidth="w-12" gap="gap-1" />
                                    <div className="flex flex-col gap-1">
                                        <PerformanceRow label="EZFW" value={flightData.ezfw} labelWidth="w-12" gap="gap-1" />
                                        <div className="flex items-center gap-1">
                                            <span className="font-medium text-aviation-warning transition-colors uppercase tracking-tight shrink-0 text-base w-12">RZFW:</span>
                                            <div className="flex items-center">
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    value={inflightData.revisedEzfw ? formatNumber(inflightData.revisedEzfw) : ''}
                                                    placeholder={formatNumber(ezfw)}
                                                    onChange={(e) => setInflightData({ revisedEzfw: e.target.value.replace(/\D/g, '') })}
                                                    className="bg-black/40 border border-aviation-warning/20 rounded py-0.5 font-mono text-aviation-warning w-20 ml-4 text-right pr-4 text-base focus:outline-none focus:border-aviation-warning"
                                                />
                                                {inflightData.revisedEzfw && (
                                                    <span className={cn(
                                                        "text-[10px] font-mono font-bold ml-2",
                                                        (actualEzfw - ezfw) >= 0 ? "text-aviation-warning" : "text-aviation-success"
                                                    )}>
                                                        {(actualEzfw - ezfw) >= 0 ? '+' : ''}{formatNumber(actualEzfw - ezfw)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <PerformanceRow
                                        label="Diff"
                                        value={(mzfw - actualEzfw).toString()}
                                        labelWidth="w-12"
                                        gap="gap-1"
                                        success={mzfw - actualEzfw >= 0}
                                        error={mzfw - actualEzfw < 0}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2 min-w-[140px]">
                                <PerformanceRow label="MTOW" value={mtow.toString()} labelWidth="w-12" gap="gap-1" />
                                <div className="flex flex-col gap-1">
                                    <PerformanceRow
                                        label="ETOW"
                                        value={plannedEtow.toString()}
                                        labelWidth="w-12"
                                        gap="gap-1"
                                    />
                                    <PerformanceRow
                                        label="RTOW"
                                        value={rTOW.toString()}
                                        error={rTOW > mtow}
                                        labelWidth="w-12"
                                        gap="gap-1"
                                        labelColor="text-aviation-warning"
                                        valueColor="text-aviation-warning"
                                    />
                                    <PerformanceRow
                                        label="Diff"
                                        value={(mtow - Math.round(rTOW)).toString()}
                                        labelWidth="w-12"
                                        gap="gap-1"
                                        success={mtow - rTOW >= 0}
                                        error={mtow - rTOW < 0}
                                    />
                                    {rTOW > mtow && (
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

                        {/* Decision Summary Banner */}
                        <div className="mt-auto pt-6">
                            <div className={cn(
                                "p-3 rounded-lg border flex flex-col gap-1",
                                (rTOW > mtow || eLW > mlw || (mzfw - actualEzfw) < 0)
                                    ? "bg-red-500/10 border-red-500/20"
                                    : "bg-aviation-success/10 border-aviation-success/20"
                            )}>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tactical Summary</span>
                                    <span className={cn(
                                        "text-[10px] font-bold uppercase",
                                        (rTOW > mtow || eLW > mlw || (mzfw - actualEzfw) < 0) ? "text-red-500" : "text-aviation-success"
                                    )}>
                                        {(rTOW > mtow || eLW > mlw || (mzfw - actualEzfw) < 0) ? "⚠️ Check Margins" : "✅ Performance Legal"}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 mt-1">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] text-slate-500 uppercase font-bold">RTOW</span>
                                        <span className="text-sm font-mono font-bold text-white">{formatNumber(Math.round(rTOW))}</span>
                                    </div>
                                    <div className="w-px h-6 bg-white/10" />
                                    <div className="flex flex-col">
                                        <span className="text-[9px] text-slate-500 uppercase font-bold">TOW Margin</span>
                                        <span className={cn("text-sm font-mono font-bold", (mtow - rTOW) >= 0 ? "text-aviation-success" : "text-red-500")}>
                                            {(mtow - rTOW) >= 0 ? '+' : ''}{formatNumber(Math.round(mtow - rTOW))}
                                        </span>
                                    </div>
                                    <div className="w-px h-6 bg-white/10" />
                                    <div className="flex flex-col">
                                        <span className="text-[9px] text-slate-500 uppercase font-bold">LW Margin</span>
                                        <span className={cn("text-sm font-mono font-bold", (mlw - eLW) >= 0 ? "text-aviation-success" : "text-red-500")}>
                                            {(mlw - eLW) >= 0 ? '+' : ''}{formatNumber(Math.round(mlw - eLW))}
                                        </span>
                                    </div>
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
    inputWidth = "w-24",
    textSize = "text-base",
    labelColor = "text-slate-500",
    valueColor = "text-slate-200"
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
    inputWidth?: string,
    textSize?: string,
    labelColor?: string,
    valueColor?: string
}) {
    const formattedTime = time !== undefined ? `${Math.floor(time / 60).toString().padStart(2, '0')}:${(time % 60).toString().padStart(2, '0')}` : null;

    return (
        <div className={cn("flex items-center group", gap)}>
            <span className={cn(
                "font-medium group-hover:text-slate-400 transition-colors uppercase tracking-tight shrink-0",
                labelColor,
                labelWidth,
                textSize
            )}>{label}:</span>
            <div className="flex items-center">
                {input ? (
                    <input
                        type="number"
                        value={value}
                        onChange={(e) => onChange?.(e.target.value)}
                        className={cn(
                            "bg-black/40 border border-white/10 rounded pl-2 py-0.5 font-mono text-white text-right focus:outline-none focus:border-aviation-accent",
                            inputWidth,
                            valuePadding,
                            textSize
                        )}
                    />
                ) : (
                    <span className={cn(
                        "font-mono font-bold w-24 text-right",
                        valuePadding,
                        success ? "text-aviation-success" : (error ? "text-aviation-warning" : valueColor),
                        textSize
                    )}>
                        {formatNumber(value)}
                    </span>
                )}

                {formattedTime && (
                    <span className={cn("font-mono font-bold text-slate-400", textSize)}>
                        {formattedTime}
                    </span>
                )}
            </div>
        </div>
    );
}
