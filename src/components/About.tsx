import React from 'react';
import { Info, ShieldAlert, Cpu, Rocket, BookOpen, Mail } from 'lucide-react';
import { motion } from 'framer-motion';

export const About: React.FC = () => {
    const techStack = [
        { name: 'React', desc: 'Core UI Framework' },
        { name: 'Tailwind CSS', desc: 'Modern Styling Engine' },
        { name: 'Framer Motion', desc: 'Fluid Animations' },
        { name: 'Lucide React', desc: 'Premium Aviation-style Icons' },
        { name: 'Zustand', desc: 'State Management' },
    ];

    const roadmap = [
        { title: 'User Manual', status: 'In Progress', desc: 'Expanding and refining operational documentation and safety logic.' },
        { title: 'Dynamic Waypoints', status: 'Planned', desc: 'Implementing a way to add and remove waypoints in the enroute tab to handle tactical re-routes.' },
        { title: 'PDF Integration', status: 'Completed', desc: 'Robust dual-channel data extraction from LIDO flight plans (PDF/Clipboard).' },
    ];

    const buildInfo = {
        version: "v1.5.3",
        buildDate: "10 MAR 2026 23:45 UTC",
        revision: "ui-manual-wording-fix"
    };

    return (
        <div className="h-full flex flex-col pt-4 overflow-hidden">
            {/* Header */}
            <section className="mb-4 shrink-0 max-w-3xl ml-0">
                <h3 className="text-sm md:text-base font-bold text-white">
                    About eFlightBag
                </h3>
            </section>

            <div className="flex-1 overflow-y-auto custom-scrollbar pb-8 space-y-6">
                {/* Operational Disclaimer - CRITICAL */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="glass-panel !p-0 overflow-hidden border-red-500/30 bg-red-500/5 max-w-3xl ml-0"
                >
                    <div className="px-1.5 py-1 bg-red-500/10 border-b border-red-500/20 flex items-center gap-1.5 shrink-0">
                        <ShieldAlert className="w-3 h-3 text-red-500" />
                        <h4 className="font-bold text-red-500 uppercase tracking-widest text-[10px] md:text-[11px]">Operational Disclaimer</h4>
                    </div>
                    <div className="p-4 md:p-6">
                        <p className="text-red-400 font-bold text-base md:text-lg leading-tight">
                            NOT FOR OPERATIONAL USE. FOR EDUCATIONAL PURPOSES ONLY.
                        </p>
                        <p className="text-slate-400 text-xs mt-2 italic">
                            This application is a technology demonstration and should never be used for actual flight planning or navigation. Always refer to official documentation and approved EFB tools.
                        </p>
                        <p className="text-red-400 font-bold text-xs mt-2 uppercase tracking-wide">
                            CRITICAL: ALWAYS REFER TO THE ORIGINAL OPERATIONAL FLIGHT PLAN (OFP).
                        </p>
                        <p className="text-red-400/90 font-bold text-[10px] mt-2 uppercase">
                            USER RESPONSIBILITY: ALL MANUALLY ENTERED OR PARSED DATA MUST BE CROSS-CHECKED WITH THE OFFICIAL OFP.
                        </p>
                        <p className="text-slate-400 font-bold text-[10px] mt-2 uppercase">
                            NON-CERTIFIED TOOL: THIRD-PARTY SOFTWARE NOT APPROVED FOR PRIMARY NAVIGATION OR PERFORMANCE DISPATCH.
                        </p>
                        <p className="text-aviation-accent font-bold text-[10px] mt-2 uppercase tracking-wide border-t border-white/5 pt-2">
                            Compatibility: This application is specifically designed to work with LIDO flight plans only.
                        </p>
                        <p className="text-red-400/80 text-[10px] font-bold uppercase tracking-wider mt-2 pl-3 border-l-2 border-red-500/30">
                            Notice: Due to API access limitations, the automated "Copy for EFB" or "Download the flight plan" functions are not currently supported.
                        </p>
                    </div>
                </motion.div>

                {/* Data Precision & Safety */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="glass-panel !p-0 overflow-hidden border-aviation-warning/30 bg-aviation-warning/5 max-w-3xl ml-0"
                >
                    <div className="px-1.5 py-1 bg-aviation-warning/10 border-b border-aviation-warning/20 flex items-center gap-1.5 shrink-0">
                        <ShieldAlert className="w-3 h-3 text-aviation-warning" />
                        <h4 className="font-bold text-aviation-warning uppercase tracking-widest text-[10px] md:text-[11px]">Data Precision & Safety</h4>
                    </div>
                    <div className="p-4 md:p-6">
                        <p className="text-slate-200 font-bold text-[9px] md:text-[10px] md:text-base leading-tight">
                            Conservative Calculation Model
                        </p>
                        <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                            To ensure a safe operational margin, <strong className="text-aviation-warning">Ramp Fuel</strong> and all <strong className="text-aviation-warning">Weights</strong> (MTOW, MZFW, EZFW, etc.) are always rounded <strong className="text-aviation-warning">UP</strong> to the nearest 100kg. Individual fuel components like Trip Fuel remain precise for accurate monitoring.
                        </p>
                    </div>
                </motion.div>

                {/* App Description */}
                <div className="glass-panel !p-0 overflow-hidden max-w-3xl ml-0">
                    <div className="px-1.5 py-1 bg-aviation-accent/5 border-b border-white/5 flex items-center gap-1.5 shrink-0">
                        <BookOpen className="w-3 h-3 text-aviation-accent" />
                        <h4 className="font-bold text-aviation-accent uppercase tracking-widest text-[10px] md:text-[11px]">Application Overview</h4>
                    </div>
                    <div className="p-4 md:p-6 space-y-4">
                        <p className="text-slate-300 text-[9px] md:text-[10px] leading-relaxed">
                            eFlightBag is a modern, offline-capable Electronic Flight Bag (EFB) companion designed to streamline pilot workflows. It provides a centralized dashboard for performance calculations, cold weather corrections, and tactical inflight monitoring. See the <strong>Manual</strong> tab for detailed operational logic.
                        </p>
                        <p className="text-aviation-accent/80 text-[10px] font-bold uppercase tracking-wider border-l-2 border-aviation-accent/30 pl-3 py-1 bg-aviation-accent/5 rounded-r-md">
                            Optimization Note: The interface has been meticulously tuned for high information density on small screens (iPad), ensuring critical data remains legible and accessible in a compact aviation environment.
                        </p>

                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {[
                                'Performance & Fuel Planning',
                                'Cold Weather Temperature Corrections',
                                'Digital TechLog Management',
                                'Dangerous Goods (DG) Quick Reference',
                                'Tactical Inflight Display & FIR Tracking',
                                'Inflight Rest & Rotation Planning'
                            ].map((feature, i) => (
                                <li key={i} className="flex items-center gap-2 text-[11px] text-slate-400 uppercase tracking-tight">
                                    <div className="w-1.5 h-1.5 rounded-full bg-aviation-accent/40" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl ml-0">
                    {/* Tech Stack */}
                    <div className="glass-panel !p-0 overflow-hidden h-full">
                        <div className="px-1.5 py-1 bg-aviation-accent/5 border-b border-white/5 flex items-center gap-1.5 shrink-0">
                            <Cpu className="w-3 h-3 text-aviation-accent" />
                            <h4 className="font-bold text-aviation-accent uppercase tracking-widest text-[10px] md:text-[11px]">Technology Stack</h4>
                        </div>
                        <div className="p-4 space-y-3">
                            {techStack.map((tech, i) => (
                                <div key={i} className="flex justify-between items-center group">
                                    <span className="text-xs font-bold text-white group-hover:text-aviation-accent transition-colors">{tech.name}</span>
                                    <span className="text-[10px] text-slate-500 uppercase tracking-tighter">{tech.desc}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Build Info */}
                    <div className="glass-panel !p-0 overflow-hidden h-full">
                        <div className="px-1.5 py-1 bg-aviation-accent/5 border-b border-white/5 flex items-center gap-1.5 shrink-0">
                            <Info className="w-3 h-3 text-aviation-accent" />
                            <h4 className="font-bold text-aviation-accent uppercase tracking-widest text-[10px] md:text-[11px]">Build Information</h4>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Version</span>
                                <span className="text-xl font-mono font-bold text-white">{buildInfo.version}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Environment</span>
                                <span className="text-sm font-mono text-aviation-success">PRODUCTION_READY</span>
                            </div>
                            <div className="pt-2 border-t border-white/5">
                                <p className="text-[10px] text-slate-500 leading-tight">
                                    Build: {buildInfo.buildDate}<br />
                                    Branch: master / revision: {buildInfo.revision}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>


                {/* Feedback & Support */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className="glass-panel !p-0 overflow-hidden max-w-3xl ml-0 border-aviation-accent/20"
                >
                    <div className="px-1.5 py-1 bg-aviation-accent/10 border-b border-white/5 flex items-center gap-1.5 shrink-0">
                        <Mail className="w-3 h-3 text-aviation-accent" />
                        <h4 className="font-bold text-aviation-accent uppercase tracking-widest text-[10px] md:text-[11px]">Feedback & Support</h4>
                    </div>
                    <div className="p-4 md:p-6 flex items-center justify-between gap-4">
                        <div className="space-y-1">
                            <p className="text-slate-300 text-[10px] md:text-[11px] leading-tight">
                                Have suggestions or found a bug? Your feedback helps improve the eFlightBag experience.
                            </p>
                            <p className="text-aviation-accent font-mono text-[11px] md:text-xs font-bold py-1">
                                eAviation.projects@proton.me
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                window.location.href = "mailto:eAviation.projects@proton.me";
                            }}
                            className="shrink-0 p-2 bg-aviation-accent/10 hover:bg-aviation-accent/20 rounded-lg border border-aviation-accent/20 text-aviation-accent transition-all flex items-center gap-2 group"
                        >
                            <Mail size={16} className="group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-bold uppercase tracking-widest hidden md:inline">Contact Us</span>
                        </button>
                    </div>
                </motion.div>

                {/* Roadmap status */}
                <div className="glass-panel !p-0 overflow-hidden max-w-3xl ml-0">
                    <div className="px-1.5 py-1 bg-aviation-accent/5 border-b border-white/5 flex items-center gap-1.5 shrink-0">
                        <Rocket className="w-3 h-3 text-aviation-accent" />
                        <h4 className="font-bold text-aviation-accent uppercase tracking-widest text-[10px] md:text-[11px]">Project Roadmap</h4>
                    </div>
                    <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                        {roadmap.map((item, i) => (
                            <div key={i} className="space-y-2 p-3 rounded-lg bg-black/20 border border-white/5">
                                <div className="flex justify-between items-center">
                                    <span className="text-[9px] font-bold text-aviation-accent uppercase tracking-widest">{item.status}</span>
                                </div>
                                <h5 className="text-xs font-bold text-white uppercase">{item.title}</h5>
                                <p className="text-[10px] text-slate-500 leading-tight">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
