import React from 'react';
import { Info, ShieldAlert, Cpu, Rocket, BookOpen, ClipboardCopy, Star } from 'lucide-react';
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
        { title: 'PDF Integration', status: 'Completed', desc: 'Robust dual-channel data extraction from LIDO flight plans (PDF/Clipboard).' },
    ];

    const bookmarkletCode = "javascript:(function(){let t='';document.querySelectorAll('iframe').forEach(f=>{try{t+=f.contentDocument.body.innerText+'\\n'}catch(e){}});if(!t.trim())t=document.body.innerText;navigator.clipboard.writeText(t).then(()=>alert('OFP Copied! Now paste into EFB.')).catch(()=>alert('Copy failed.'))})();";

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

                {/* Data Precision & Safety */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="glass-panel p-4 md:p-6 border-aviation-warning/30 bg-aviation-warning/5 max-w-3xl ml-0"
                >
                    <div className="flex items-start gap-4">
                        <div className="bg-aviation-warning/20 p-2 rounded-lg shrink-0">
                            <ShieldAlert className="w-6 h-6 text-aviation-warning" />
                        </div>
                        <div>
                            <h4 className="text-aviation-warning font-bold uppercase tracking-wider text-sm mb-1">Data Precision & Safety</h4>
                            <p className="text-slate-200 font-bold text-sm md:text-base leading-tight">
                                Conservative Calculation Model
                            </p>
                            <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                                To ensure a safe operational margin, <strong className="text-aviation-warning">Ramp Fuel</strong> and all <strong className="text-aviation-warning">Weights</strong> (MTOW, MZFW, EZFW, etc.) are always rounded <strong className="text-aviation-warning">UP</strong> to the nearest 100kg. Individual fuel components like Trip Fuel remain precise for accurate monitoring.
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Ingestion Tools - Help for Safari */}
                <div className="glass-panel overflow-hidden max-w-3xl ml-0 border-aviation-accent/20">
                    <div className="px-4 py-3 md:px-6 md:py-4 bg-aviation-accent/10 border-b border-white/5 flex items-center gap-3 shrink-0">
                        <ClipboardCopy className="w-4 h-4 md:w-5 md:h-5 text-aviation-accent" />
                        <h4 className="font-bold text-aviation-accent uppercase tracking-widest text-[11px] md:text-xs">Safari Ingestion Masterclass</h4>
                    </div>
                    <div className="p-4 md:p-6 space-y-6">
                        <div className="space-y-4">
                            <h5 className="text-sm font-bold text-white uppercase flex items-center gap-2">
                                <Star className="w-4 h-4 text-aviation-warning" />
                                The "Copy for EFB" Bookmarklet
                            </h5>
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                                Since Safari on iPad restricts "Select All" on the Lido portal, we use a **Bookmarklet**.
                                This is a specialized bookmark that runs a script to grab your flight plan instantly.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full bg-aviation-accent/20 flex items-center justify-center text-[10px] font-bold text-aviation-accent">1</div>
                                        <h6 className="text-[10px] font-bold text-slate-300 uppercase">Save a Bookmark</h6>
                                    </div>
                                    <p className="text-[10px] text-slate-500 leading-tight">Open any page in Safari (like Google) and tap the <strong>Share</strong> icon, then <strong>Add Bookmark</strong>.</p>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full bg-aviation-accent/20 flex items-center justify-center text-[10px] font-bold text-aviation-accent">2</div>
                                        <h6 className="text-[10px] font-bold text-slate-300 uppercase">Edit & Paste code</h6>
                                    </div>
                                    <p className="text-[10px] text-slate-500 leading-tight">Open your bookmarks, tap <strong>Edit</strong>, change the name to <strong>Copy for EFB</strong>, and paste the code below into the URL field.</p>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full bg-aviation-accent/20 flex items-center justify-center text-[10px] font-bold text-aviation-accent">3</div>
                                        <h6 className="text-[10px] font-bold text-slate-300 uppercase">Use at Lido</h6>
                                    </div>
                                    <p className="text-[10px] text-slate-500 leading-tight">On the Lido flight plan page, simply open your bookmarks and tap <strong>Copy for EFB</strong>. Done!</p>
                                </div>
                            </div>

                            <div className="relative group">
                                <div className="bg-black/40 p-4 rounded-lg border border-white/10 font-mono text-[10px] text-aviation-accent break-all leading-tight">
                                    {bookmarkletCode}
                                </div>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(bookmarkletCode);
                                        alert('Bookmarklet code copied to clipboard!');
                                    }}
                                    className="absolute top-2 right-2 p-2 bg-aviation-accent/20 hover:bg-aviation-accent/40 rounded border border-aviation-accent/30 text-aviation-accent transition-colors flex items-center gap-2"
                                >
                                    <ClipboardCopy size={14} />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Copy Code</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

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
                                <span className="text-xl font-mono font-bold text-white">v1.3.0</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Environment</span>
                                <span className="text-sm font-mono text-aviation-success">PRODUCTION_READY</span>
                            </div>
                            <div className="pt-2 border-t border-white/5">
                                <p className="text-[10px] text-slate-500 leading-tight">
                                    Build: 2026.03.10.0515<br />
                                    Branch: master / revision: dual-parser-initial
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
