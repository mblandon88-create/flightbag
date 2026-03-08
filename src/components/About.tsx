import React from 'react';
import { Info, ShieldAlert, Cpu, Rocket, BookOpen } from 'lucide-react';
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
        { title: 'PA Guide Evaluation', status: 'Planned', desc: 'Evaluating if the Public Address (PA) guide should be refined or removed.' },
        { title: 'Title Standardization', status: 'Planned', desc: 'Syncing all component titles to a unified aviation standard.' },
        { title: 'PDF Integration', status: 'Researching', desc: 'Enhanced data extraction from LIDO flight plans.' },
    ];

    return (
        <div className="h-full flex flex-col pt-4 overflow-hidden">
            {/* Header */}
            <section className="px-2 mb-6 shrink-0 max-w-3xl ml-0">
                <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                    <Info className="w-6 h-6 text-aviation-accent" />
                    About eFlightBag
                </h3>
            </section>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-8 space-y-6">
                {/* Operational Disclaimer - CRITICAL */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="glass-panel p-4 md:p-6 border-red-500/30 bg-red-500/5 max-w-3xl ml-0"
                >
                    <div className="flex items-start gap-4">
                        <div className="bg-red-500/20 p-2 rounded-lg shrink-0">
                            <ShieldAlert className="w-6 h-6 text-red-500" />
                        </div>
                        <div>
                            <h4 className="text-red-500 font-bold uppercase tracking-wider text-sm mb-1">Operational Disclaimer</h4>
                            <p className="text-red-400 font-bold text-base md:text-lg leading-tight">
                                NOT FOR OPERATIONAL USE. FOR EDUCATIONAL PURPOSES ONLY.
                            </p>
                            <p className="text-slate-400 text-xs mt-2 italic">
                                This application is a technology demonstration and should never be used for actual flight planning or navigation. Always refer to official documentation and approved EFB tools.
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* App Description */}
                <div className="glass-panel overflow-hidden max-w-3xl ml-0">
                    <div className="px-4 py-3 md:px-6 md:py-4 bg-aviation-accent/5 border-b border-white/5 flex items-center gap-3 shrink-0">
                        <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-aviation-accent" />
                        <h4 className="font-bold text-aviation-accent uppercase tracking-widest text-[11px] md:text-xs">Application Overview</h4>
                    </div>
                    <div className="p-4 md:p-6 space-y-4">
                        <p className="text-slate-300 text-sm leading-relaxed">
                            eFlightBag is a modern, offline-capable Electronic Flight Bag (EFB) companion designed to streamline pilot workflows. It provides a centralized dashboard for performance calculations, cold weather corrections, and tactical inflight monitoring.
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
                    <div className="glass-panel overflow-hidden h-full">
                        <div className="px-4 py-3 md:px-6 md:py-4 bg-aviation-accent/5 border-b border-white/5 flex items-center gap-3 shrink-0">
                            <Cpu className="w-4 h-4 md:w-5 md:h-5 text-aviation-accent" />
                            <h4 className="font-bold text-aviation-accent uppercase tracking-widest text-[11px] md:text-xs">Technology Stack</h4>
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
                    <div className="glass-panel overflow-hidden h-full">
                        <div className="px-4 py-3 md:px-6 md:py-4 bg-aviation-accent/5 border-b border-white/5 flex items-center gap-3 shrink-0">
                            <Info className="w-4 h-4 md:w-5 md:h-5 text-aviation-accent" />
                            <h4 className="font-bold text-aviation-accent uppercase tracking-widest text-[11px] md:text-xs">Build Information</h4>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Version</span>
                                <span className="text-xl font-mono font-bold text-white">v1.2.4</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Environment</span>
                                <span className="text-sm font-mono text-aviation-success">PRODUCTION_READY</span>
                            </div>
                            <div className="pt-2 border-t border-white/5">
                                <p className="text-[10px] text-slate-500 leading-tight">
                                    Build: 2026.03.08.1502<br />
                                    Branch: master / revision: d816cf9
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Roadmap */}
                <div className="glass-panel overflow-hidden max-w-3xl ml-0">
                    <div className="px-4 py-3 md:px-6 md:py-4 bg-aviation-accent/5 border-b border-white/5 flex items-center gap-3 shrink-0">
                        <Rocket className="w-4 h-4 md:w-5 md:h-5 text-aviation-accent" />
                        <h4 className="font-bold text-aviation-accent uppercase tracking-widest text-[11px] md:text-xs">Project Roadmap</h4>
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
