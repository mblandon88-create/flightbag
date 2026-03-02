import React, { useState, useEffect } from 'react';
import {
    Plane,
    Activity,
    ClipboardList,
    AlertTriangle,
    Monitor,
    BookOpen,
    Mic2,
    Bed,
    Info,
    MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import type { AppSection } from '../types';

interface MainLayoutProps {
    children: React.ReactNode;
    activeSection: AppSection;
    onSectionChange: (section: AppSection) => void;
    route?: string;
}

export function MainLayout({ children, activeSection, onSectionChange, route = 'EFB DASHBOARD' }: MainLayoutProps) {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatZulu = (date: Date) => {
        return date.toISOString().substring(11, 16) + ' Z';
    };

    const navItems = [
        { id: 'flight-init', label: 'Flight Init', icon: Plane },
        { id: 'performance', label: 'Performance', icon: Activity },
        { id: 'techlog', label: 'TechLog', icon: ClipboardList },
        { id: 'dangerous-goods', label: 'Dangerous Goods', icon: AlertTriangle },
        { id: 'inflight', label: 'Inflight Display', icon: Monitor },
        { id: 'briefing', label: 'Briefing', icon: BookOpen },
        { id: 'pa-guide', label: 'PA Guide', icon: Mic2 },
        { id: 'inflight-rest', label: 'Inflight Rest', icon: Bed },
        { id: 'about', label: 'About', icon: Info },
    ];

    return (
        <div className="flex h-screen overflow-hidden bg-aviation-bg text-slate-200 font-sans">
            {/* Sidebar */}
            <aside className={cn(
                "border-r border-white/5 bg-aviation-panel flex flex-col transition-all duration-300 shrink-0",
                "w-16 md:w-20 lg:w-64"
            )}>
                <div className="p-4 lg:p-6 overflow-hidden">
                    <h1 className="text-xl font-bold tracking-tighter text-white flex items-center gap-2">
                        <div className="w-8 h-8 bg-aviation-accent rounded-lg flex items-center justify-center shrink-0">
                            <Plane className="w-5 h-5 text-black" />
                        </div>
                        <span className="hidden lg:inline truncate">eFlightBag</span>
                    </h1>
                    <p className="hidden lg:block text-[10px] font-bold text-aviation-accent uppercase tracking-[0.2em] mt-1 truncate">
                        Offline Capable EFB
                    </p>
                </div>

                <nav className="flex-1 px-2 lg:px-3 space-y-1 overflow-y-auto custom-scrollbar">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => onSectionChange(item.id as AppSection)}
                            title={item.label}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 lg:px-4 py-3 rounded-xl transition-all duration-200 group text-left",
                                activeSection === item.id
                                    ? "bg-aviation-accent/10 text-aviation-accent"
                                    : "text-slate-500 hover:text-slate-200 hover:bg-white/5"
                            )}
                        >
                            <item.icon className={cn(
                                "w-5 h-5 transition-transform duration-200 group-hover:scale-110 shrink-0",
                                activeSection === item.id ? "text-aviation-accent" : "text-slate-500"
                            )} />
                            <span className="text-sm font-medium hidden lg:inline truncate">{item.label}</span>
                            {activeSection === item.id && (
                                <motion.div
                                    layoutId="activeNav"
                                    className="ml-auto w-1.5 h-1.5 rounded-full bg-aviation-accent shadow-[0_0_8px_rgba(56,189,248,0.6)] hidden lg:block"
                                />
                            )}
                        </button>
                    ))}
                </nav>

                <div className="p-4 lg:p-6 border-t border-white/5">
                    <div className="flex items-center gap-3 text-slate-500">
                        <div className="w-2 h-2 rounded-full bg-aviation-success animate-pulse shrink-0" />
                        <span className="text-[10px] font-bold uppercase tracking-widest hidden lg:inline">System Ready</span>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Top Bar */}
                <header className="h-14 md:h-16 border-bottom border-white/5 bg-aviation-panel/50 backdrop-blur-xl flex items-center justify-between px-4 md:px-8 shrink-0">
                    <div className="flex items-center gap-2 md:gap-4">
                        <h2 className="text-sm md:text-lg font-semibold text-white truncate max-w-[120px] md:max-w-none">
                            {navItems.find(i => i.id === activeSection)?.label}
                        </h2>
                        <div className="h-4 w-[1px] bg-white/10" />
                        <div className="flex items-center gap-2 text-slate-400">
                            <MapPin className="w-3 h-3 md:w-4 md:h-4" />
                            <span className="text-[10px] md:text-xs font-mono">{route}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 md:gap-6">
                        <div className="flex flex-col items-end">
                            <span className="text-[8px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date (UTC)</span>
                            <span className="text-sm md:text-lg font-mono font-medium text-aviation-accent leading-none">
                                {currentTime.getUTCDate().toString().padStart(2, '0')} {currentTime.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' }).toUpperCase()} {currentTime.getUTCFullYear()}
                            </span>
                        </div>
                        <div className="h-8 w-[1px] bg-white/10 hidden sm:block" />
                        <div className="flex flex-col items-end">
                            <span className="text-[8px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest">Zulu Time</span>
                            <span className="text-sm md:text-lg font-mono font-medium text-aviation-accent leading-none">{formatZulu(currentTime)}</span>
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <div className="flex-1 min-h-0 p-4 md:p-6 lg:p-8 flex flex-col">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeSection}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="flex-1 flex flex-col min-h-0"
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}
