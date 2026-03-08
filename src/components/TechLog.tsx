import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Fuel, ArrowRightLeft, AlertTriangle, Calculator, AlertCircle } from 'lucide-react';
import { cn, formatNumber } from '../lib/utils';
import fuelDiscrepancyData from '../data/fueldiscrepancy.json';

// Helper to determine the applicable limit
function getDiscrepancyLimit(aircraftType: string, fobKg: number): number {
    const defaultLimit = 500;
    if (!aircraftType || aircraftType === 'Unknown') return defaultLimit;

    // Map aircraft (e.g., A332 -> A330)
    const baseType = (fuelDiscrepancyData.aircraft_mappings as Record<string, string>)[aircraftType] || aircraftType;
    const limitsList = (fuelDiscrepancyData.fleet_data as Record<string, Array<{ fob_max_t: number | string, diff_kg: number }>>)[baseType];

    if (!limitsList) return defaultLimit;

    // The FCOM values in JSON are in kilograms (e.g. 15000, 35000) despite the key name 'fob_max_t'
    for (const rule of limitsList) {
        if (rule.fob_max_t === 'unlimited' || fobKg <= (rule.fob_max_t as number)) {
            return rule.diff_kg;
        }
    }

    return defaultLimit; // Fallback
}

export const TechLog: React.FC = () => {
    const { flightData, techLogData, setTechLogData } = useStore();
    const {
        reqFuel, qtyBeforeRefuel, meteredUpliftLts, specificGravity, arrFuel, depFuel,
        reqUplift, meteredUpliftKg, fuelUsedOnGround, discrepancy, error
    } = techLogData;

    // Derived limit - moved to render to avoid cascading renders
    const depFuelNum = parseFloat((depFuel || '').replace(/\s/g, '')) || 0;
    const applicableLimit = flightData?.aircraftType ? getDiscrepancyLimit(flightData.aircraftType, depFuelNum) : 500;

    const setReqFuel = (val: string) => setTechLogData({ reqFuel: val });
    const setQtyBeforeRefuel = (val: string) => setTechLogData({ qtyBeforeRefuel: val });
    const setMeteredUpliftLts = (val: string) => setTechLogData({ meteredUpliftLts: val });
    const setSpecificGravity = (val: string) => setTechLogData({ specificGravity: val });
    const setArrFuel = (val: string) => setTechLogData({ arrFuel: val });
    const setDepFuel = (val: string) => setTechLogData({ depFuel: val });

    const setError = (val: string | null) => setTechLogData({ error: val });

    // Initialize default values from flight plan if available
    useEffect(() => {
        if (flightData && flightData.rampFuel) {
            const ramp = parseInt(flightData.rampFuel).toString();
            // Only set if they are currently empty so we don't overwrite user edits on every render
            if (!reqFuel) setReqFuel(ramp);
            if (!depFuel) setDepFuel(ramp);
        }
    }, [flightData]);



    if (!flightData) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 glass-panel p-8">
                <Fuel className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-sm font-medium">Please load a flight plan in the Flight Init tab first.</p>
            </div>
        );
    }

    const handleCalculate = () => {
        setError(null);

        // Required Inputs Validation
        if (!reqFuel || !qtyBeforeRefuel || !meteredUpliftLts || !specificGravity || !arrFuel || !depFuel) {
            setError('Please fill in all required fuel inputs to calculate discrepancy.');
            setTechLogData({ discrepancy: null });
            return;
        }

        const A = parseFloat(reqFuel);
        const B = parseFloat(qtyBeforeRefuel);
        const D = parseFloat(meteredUpliftLts);

        // Parse Specific Gravity (e.g., .778 or 0.778)
        let E = parseFloat(specificGravity);
        if (specificGravity.startsWith('.')) {
            E = parseFloat(`0${specificGravity}`);
        }

        const F = parseFloat(arrFuel);
        const H = parseFloat(depFuel);

        if (isNaN(A) || isNaN(B) || isNaN(D) || isNaN(E) || isNaN(F) || isNaN(H)) {
            setError('Invalid number format in one or more fields.');
            setTechLogData({ discrepancy: null });
            return;
        }

        // Calculations
        const C = A - B;
        const G = Math.round(D * E);
        const I = F - B;
        const J = Math.round((G - (H - F)) - I);

        // Single state update for all calculated values
        setTechLogData({
            reqUplift: C,
            meteredUpliftKg: G,
            fuelUsedOnGround: I,
            discrepancy: J
        });
    };

    return (
        <div className="flex-1 flex flex-col gap-3 min-h-0">

            <div className="flex-1 glass-panel overflow-hidden flex flex-col min-h-0 border-t-2 border-t-aviation-accent max-w-4xl mx-auto w-full">
                <div className="flex-1 p-2 md:p-3 flex flex-col overflow-y-auto custom-scrollbar">

                    {/* 2-Column Grid filling vertical space */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5 mb-1.5 shrink-0">

                        {/* Column 1: A to E */}
                        <div className="space-y-1.5 flex flex-col items-center">
                            <InputField
                                label="(A) REQUIRED FUEL (KG)"
                                value={reqFuel}
                                onChange={setReqFuel}
                            />
                            <InputField
                                label="(B) QTY BEFORE REFUEL (KG)"
                                value={qtyBeforeRefuel}
                                onChange={setQtyBeforeRefuel}
                            />
                            <CalculatedField
                                label="(C) REQUIRED UPLIFT (KG)"
                                formula="(A) - (B)"
                                value={reqUplift}
                            />
                            <InputField
                                label="(D) METERED UPLIFT (LTS)"
                                value={meteredUpliftLts}
                                onChange={setMeteredUpliftLts}
                            />
                            <InputField
                                label="(E) SPECIFIC GRAVITY"
                                value={specificGravity}
                                onChange={(val) => {
                                    let formatted = val.replace(/[^0-9.]/g, '');
                                    if (formatted.length > 0 && !formatted.startsWith('.') && !formatted.startsWith('0.')) {
                                        formatted = '.' + formatted.replace(/\./g, '');
                                    }
                                    setSpecificGravity(formatted);
                                }}
                                placeholder=".___ (e.g. .778)"
                            />
                        </div>

                        {/* Column 2: F to I */}
                        <div className="space-y-1.5 flex flex-col items-center">
                            <InputField
                                label="(F) ARR FUEL (KG)"
                                value={arrFuel}
                                onChange={setArrFuel}
                            />
                            <CalculatedField
                                label="(G) METERED UPLIFT (KG)"
                                formula="(D) x (E)"
                                value={meteredUpliftKg}
                            />
                            <InputField
                                label="(H) DEPARTURE FUEL (KG)"
                                value={depFuel}
                                onChange={setDepFuel}
                            />
                            <CalculatedField
                                label="(I) FUEL USED ON GROUND (KG)"
                                formula="(F) - (B)"
                                value={fuelUsedOnGround}
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-center gap-1 pt-1.5 border-t border-white/10 mb-1.5 shrink-0">
                        {error && (
                            <div className="flex items-center gap-2 text-aviation-warning bg-aviation-warning/10 border border-aviation-warning/30 px-3 py-1.5 rounded-lg w-full max-w-[260px] justify-center">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wide">{error}</span>
                            </div>
                        )}

                        <button
                            onClick={handleCalculate}
                            className="w-full max-w-[180px] h-6 md:h-7 bg-aviation-accent text-black font-bold uppercase tracking-widest text-[8px] md:text-[9px] rounded-md hover:bg-white hover:scale-[1.02] transition-all flex items-center justify-center gap-1 shadow-lg shadow-aviation-accent/20"
                        >
                            <Calculator className="w-3 h-3" />
                            Calculate
                        </button>
                    </div>

                    {/* Discrepancy Display at bottom */}
                    {discrepancy !== null && (
                        <div className="flex justify-center w-full shrink-0">
                            <div className={cn(
                                "flex flex-col items-center justify-center p-1.5 w-full max-w-[240px] rounded-lg border-2 transition-all animate-in fade-in zoom-in duration-300",
                                Math.abs(discrepancy) > applicableLimit
                                    ? "bg-aviation-warning/10 border-aviation-warning/30 shadow-[0_0_10px_rgba(239,68,68,0.1)]"
                                    : "bg-aviation-success/10 border-aviation-success/30 shadow-[0_0_10px_rgba(34,197,94,0.08)]"
                            )}>
                                <div className="flex flex-col items-center justify-center w-full">
                                    <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center gap-1.5">
                                            <ArrowRightLeft className={cn("w-3 h-3", Math.abs(discrepancy) > applicableLimit ? "text-aviation-warning" : "text-aviation-success")} />
                                            <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-widest text-slate-300">(J) DISCREPANCY</span>
                                        </div>
                                        <span className="text-[6px] text-slate-500 font-mono tracking-widest opacity-60">
                                            [(G)-[(H)-(F)]]-(I)
                                        </span>
                                    </div>
                                    <span className={cn(
                                        "text-base md:text-lg font-mono font-black tracking-tighter leading-none mt-0.5",
                                        Math.abs(discrepancy) > applicableLimit ? "text-aviation-warning" : "text-aviation-success"
                                    )}>
                                        {discrepancy > 0 ? '+' : ''}{formatNumber(Math.abs(discrepancy))} kg
                                    </span>
                                </div>
                                <div className={cn(
                                    "flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-sm border",
                                    Math.abs(discrepancy) > applicableLimit
                                        ? "text-aviation-warning bg-aviation-warning/20 border-aviation-warning/20"
                                        : "text-slate-400 bg-white/5 border-white/5"
                                )}>
                                    {Math.abs(discrepancy) > applicableLimit && <AlertTriangle className="w-2.5 h-2.5" />}
                                    <span className="text-[6px] md:text-[7px] font-bold uppercase tracking-widest">
                                        {Math.abs(discrepancy) > applicableLimit ? "Outside Limits" : "Within Limits"} (±{formatNumber(applicableLimit)}kg)
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

function InputField({ label, value, onChange, placeholder = "ENTER VALUE" }: { label: string, value: string, onChange: (v: string) => void, placeholder?: string }) {
    const isFloat = value.includes('.') || label.includes('GRAVITY');
    const displayValue = isFloat ? value : (value ? formatNumber(value) : '');

    return (
        <div className="bg-white/5 rounded-md border border-white/5 overflow-hidden focus-within:border-aviation-accent/50 transition-colors w-full">
            <div className="px-2 py-1 bg-black/40 border-b border-white/5">
                <label className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
            </div>
            <input
                type="text"
                inputMode={isFloat ? "decimal" : "numeric"}
                value={displayValue}
                onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder={placeholder}
                className="w-full bg-transparent px-2 py-1 text-xs md:text-sm font-mono font-bold text-white placeholder:text-slate-700 focus:outline-none"
            />
        </div>
    );
}

function CalculatedField({ label, formula, value }: { label: string, formula: string, value: number | null }) {
    return (
        <div className="bg-transparent rounded-md border border-dashed border-white/20 overflow-hidden relative w-full">
            <div className="px-2 py-1 bg-black/20 flex justify-between items-center border-b border-dashed border-white/10">
                <label className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</label>
                <span className="text-[8px] md:text-[9px] font-mono text-slate-600 tracking-widest">{formula}</span>
            </div>
            <div className="px-2 py-1 text-xs md:text-sm font-mono font-bold text-aviation-accent/80">
                {value !== null ? formatNumber(value) : <span className="text-slate-700">-</span>}
            </div>
        </div>
    );
}
