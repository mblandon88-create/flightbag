import React from 'react';
import { 
    Book, 
    ClipboardCopy, 
    Activity, 
    Compass, 
    ThermometerSnowflake, 
    ClipboardList, 
    Star,
    ArrowRight,
    AlertCircle,
    Info,
    Shield,
    ShieldAlert
} from 'lucide-react';
import { motion } from 'framer-motion';

export const Manual: React.FC = () => {
    const bookmarkletCode = "javascript:(function(){let t='';document.querySelectorAll('iframe').forEach(f=>{try{t+=f.contentDocument.body.innerText+'\\n'}catch(e){}});if(!t.trim())t=document.body.innerText;navigator.clipboard.writeText(t).then(()=>alert('OFP Copied! Now paste into EFB.')).catch(()=>alert('Copy failed.'))})();";

    const sections = [
        {
            id: 'ingestion',
            title: '1. LIDO Data Ingestion',
            icon: ClipboardCopy,
            color: 'text-aviation-accent',
            bg: 'bg-aviation-accent/5',
            content: (
                <div className="space-y-4">
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                        The first step in any flight is loading your LIDO Operational Flight Plan (OFP). eFlightBag supports two high-fidelity ingestion methods:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 rounded-lg bg-black/20 border border-white/5 space-y-2">
                            <h5 className="text-[10px] font-bold text-white uppercase flex items-center gap-2">
                                <ArrowRight className="w-3 h-3 text-aviation-accent" />
                                PDF Upload
                            </h5>
                            <p className="text-[10px] text-slate-400">
                                Download your OFP from the portal in PDF format and drag it into the Flight Init tab. This is the most robust method for accurate data extraction.
                            </p>
                        </div>
                        <div className="p-3 rounded-lg bg-black/20 border border-white/5 space-y-2">
                            <h5 className="text-[10px] font-bold text-white uppercase flex items-center gap-2">
                                <ArrowRight className="w-3 h-3 text-aviation-accent" />
                                Clipboard Paste
                            </h5>
                            <p className="text-[10px] text-slate-400">
                                Copy the entire text of your OFP and paste it into the clipboard area. Useful for quick updates or when PDF access is restricted.
                            </p>
                        </div>
                    </div>

                    <div className="p-4 rounded-lg bg-aviation-accent/5 border border-aviation-accent/20 space-y-4">
                        <h5 className="text-[10px] font-bold text-aviation-accent uppercase flex items-center gap-2">
                            <Star className="w-4 h-4 text-aviation-warning" />
                            Safari Ingestion (iPad Workaround)
                        </h5>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                            Safari on iPad often restricts the "Select All" function on the Lido portal. To bypass this, install our **Bookmarklet**:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="text-[10px] text-slate-400">
                                <span className="text-aviation-accent font-bold">1. Save:</span> Create any bookmark in Safari.
                            </div>
                            <div className="text-[10px] text-slate-400">
                                <span className="text-aviation-accent font-bold">2. Edit:</span> Change the URL of that bookmark to the code below.
                            </div>
                            <div className="text-[10px] text-slate-400">
                                <span className="text-aviation-accent font-bold">3. Use:</span> Tap the bookmark while on the Lido page to instantly copy the text.
                            </div>
                        </div>
                        <div className="relative group">
                            <div className="bg-black/40 p-3 rounded border border-white/5 font-mono text-[9px] text-aviation-accent/80 break-all leading-tight">
                                {bookmarkletCode}
                            </div>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(bookmarkletCode);
                                    alert('Bookmarklet code copied!');
                                }}
                                className="mt-2 w-full py-1.5 bg-aviation-accent/10 hover:bg-aviation-accent/20 rounded border border-aviation-accent/20 text-aviation-accent text-[9px] font-bold uppercase transition-colors"
                            >
                                Copy Bookmarklet Code
                            </button>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'performance',
            title: '2. Performance & Weights',
            icon: Activity,
            color: 'text-aviation-warning',
            bg: 'bg-aviation-warning/5',
            content: (
                    <div className="space-y-4">
                        <div className="flex items-start gap-3 p-3 bg-aviation-warning/10 rounded-lg border border-aviation-warning/20">
                            <Shield className="w-4 h-4 text-aviation-warning shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-[10px] text-aviation-warning font-bold uppercase leading-tight">
                                    Safety Policy: Weights (RZFW, RTOW) & Ramp Fuel are rounded UP (+100kg buffer).
                                </p>
                                <p className="text-[9px] text-aviation-warning/80 leading-tight italic font-medium">
                                    Note: RZFW and RTOW represent the **REVISED** Zero Fuel Weight and Takeoff Weight respectively.
                                </p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <h5 className="text-[10px] font-bold text-white uppercase">Dynamic Calculations (ETOW / ELW)</h5>
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                                Any changes made to the **Actual Ramp Fuel** or **RZFW** will trigger an automatic recalculation of the **ETOW** (Estimated Takeoff Weight) and **ELW** (Estimated Landing Weight) throughout the flight.
                            </p>
                            <h5 className="text-[10px] font-bold text-white uppercase">Limiting Factors</h5>
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                                The Performance tab displays the most restrictive weight. The <span className="text-aviation-warning font-bold">(MLW)</span> or <span className="text-aviation-warning font-bold">(MTOW)</span> indicator highlights which factor is currently limiting your maximum allowable payload.
                            </p>
                        </div>
                    </div>
            )
        },
        {
            id: 'enroute',
            title: '3. Tactical Enroute (Inflight)',
            icon: Compass,
            color: 'text-aviation-success',
            bg: 'bg-aviation-success/5',
            content: (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <h5 className="text-[10px] font-bold text-white uppercase">Direct To & Sequencing</h5>
                            <p className="text-[10px] text-slate-400 leading-relaxed">
                                Use the **Direct** function to add or delete waypoints tacticaly. Bypassed waypoints (those between your current 'From' and 'To') are grayed out to maintain historical records, but you can still tap them to manually add data if required.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h5 className="text-[10px] font-bold text-white uppercase">Frequency & Recording</h5>
                            <p className="text-[10px] text-slate-400 leading-relaxed">
                                Record **ATA**, **Actual Fuel**, and a **Frequency** (displayed below the waypoint) for any fixed point. Dynamic GW estimates update automatically as you progress.
                            </p>
                        </div>
                    </div>
                    <div className="p-3 bg-black/20 border border-white/5 rounded-lg">
                        <h5 className="text-[10px] font-bold text-aviation-success uppercase flex items-center gap-2 mb-2">
                            <Info className="w-3 h-3" />
                            Landing Weight Safety (MLW Logic)
                        </h5>
                        <div className="space-y-3">
                            <p className="text-[10px] text-slate-400 leading-relaxed italic">
                                The system provides estimated monitoring of your transition below Maximum Landing Weight (MLW):
                            </p>
                            <ul className="text-[10px] text-slate-400 space-y-2 ml-4 list-disc">
                                <li><strong>Safety Banner:</strong> An alert banner appears at the top of the display, identifying the estimated waypoint and estimated time when the aircraft weight will drop below MLW.</li>
                                <li><strong>Tactical Tagging:</strong> The specific transition waypoint will display a <span className="text-aviation-success font-bold px-1 rounded bg-aviation-success/10 border border-aviation-success/20 text-[9px]">&lt;MLW</span> tab below the name.</li>
                                <li><strong>Color-Coded GW:</strong> Gross Weight (GW) values are color-coded to provide instant visual feedback on your current weight status relative to safety limits.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'techlog',
            title: '4. Digital TechLog',
            icon: ClipboardList,
            color: 'text-aviation-accent',
            bg: 'bg-aviation-accent/5',
            content: (
                <div className="space-y-4">
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                        The TechLog digitizes the aircraft transition process. It includes built-in logic for **A330 and A350 aircraft variants** to identify abnormal fuel discrepancies.
                    </p>
                    <div className="p-3 rounded-lg border border-aviation-accent/20 bg-aviation-accent/5">
                        <h5 className="text-[10px] font-bold text-aviation-accent uppercase mb-2">FCOM Anomaly Detection</h5>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                            The system automatically checks the difference between Gauges, Totalizer, and Loaded Fuel. If the discrepancy exceeds **1,000kg** (or specific variant limits), an **ABNORMAL** alert will trigger, requiring manual verification according to FCOM procedures.
                        </p>
                    </div>
                </div>
            )
        },
        {
            id: 'coldwx',
            title: '5. Cold Weather Corrections',
            icon: ThermometerSnowflake,
            color: 'text-aviation-accent/60',
            bg: 'bg-aviation-accent/5',
            content: (
                <div className="space-y-4">
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                        When the ambient temperature is below **0°C**, altitude corrections **may be required** for safety based on your **Company manual** policy.
                    </p>
                    <div className="space-y-2">
                        <h5 className="text-[10px] font-bold text-white uppercase">Temperature Correction Rules</h5>
                        <ul className="text-[10px] text-slate-400 space-y-1 ml-4 list-disc">
                            <li>Enter Airport Temp and Aerodrome Elevation to generate the baseline table.</li>
                            <li><strong>Minima (MDA/DA):</strong> If the approach minima is MDA or DA/MDA, the system adds **50ft** on top of the calculated temperature correction.</li>
                            <li>Use corrected altitudes for FAF and decision points as per **Company manual** instructions.</li>
                        </ul>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-[9px] text-red-400 mt-2 italic">
                        <ShieldAlert className="w-3 h-3 shrink-0" />
                        Always refer to your Company Manual for the actual procedure, valid correction ranges, and specific performance limitations.
                    </div>
                </div>
            )
        }
    ];

    return (
        <div className="h-full flex flex-col pt-4 overflow-hidden">
            {/* Header */}
            <section className="mb-4 shrink-0 max-w-4xl ml-0 flex items-center gap-3">
                <div className="w-10 h-10 bg-aviation-accent/10 rounded-xl flex items-center justify-center border border-aviation-accent/20">
                    <Book className="w-6 h-6 text-aviation-accent" />
                </div>
                <div>
                    <h3 className="text-sm md:text-base font-bold text-white uppercase tracking-tight">
                        User Manual & Operational Guide
                    </h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                        Effective Workflow & Safety Logic
                    </p>
                </div>
            </section>

            <div className="flex-1 overflow-y-auto custom-scrollbar pb-8 space-y-6 max-w-4xl">
                {sections.map((section, idx) => (
                    <motion.div
                        key={section.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: idx * 0.1 }}
                        className="glass-panel !p-0 overflow-hidden"
                    >
                        <div className={`px-1.5 py-1 ${section.bg} border-b border-white/5 flex items-center gap-1.5 shrink-0`}>
                            <section.icon className={`w-3 h-3 ${section.color}`} />
                            <h4 className={`font-bold ${section.color} uppercase tracking-widest text-[10px] md:text-[11px]`}>
                                {section.title}
                            </h4>
                        </div>
                        <div className="p-4 md:p-6">
                            {section.content}
                        </div>
                    </motion.div>
                ))}

                {/* Safety Warning Footer */}
                <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 flex items-center gap-4">
                    <AlertCircle className="w-8 h-8 text-red-500 shrink-0" />
                    <div>
                        <h5 className="text-red-500 font-bold uppercase text-[10px]">Operational Safety</h5>
                        <p className="text-slate-400 text-[10px] leading-tight mt-1 italic">
                            This manual provides guidance on software functionality. It does not supersede any official company SOPs, FCOM procedures, or AFM limitations. Use the secondary "About" tab for version information.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
