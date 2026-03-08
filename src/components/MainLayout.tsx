import React, { useState, useEffect } from 'react';
import {
    Plane,
    Activity,
    ClipboardList,
    AlertTriangle,
    Monitor,
    Mic2,
    Bed,
    Info,
    MapPin,
    ThermometerSnowflake,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import type { AppSection } from '../types';

interface MainLayoutProps {
    children: React.ReactNode;
    activeSection: AppSection;
    onSectionChange: (section: AppSection) => void;
    route?: string;
    flightNumber?: string;
}

export function MainLayout({ children, activeSection, onSectionChange, route = 'EFB DASHBOARD', flightNumber }: MainLayoutProps) {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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
        { id: 'dangerous-goods', label: 'DG', icon: AlertTriangle },
        { id: 'inflight', label: 'Inflight', icon: Monitor },
        { id: 'cold-weather', label: 'Cold Wx', icon: ThermometerSnowflake },
        { id: 'pa-guide', label: 'PA Guide', icon: Mic2 },
        { id: 'inflight-rest', label: 'Inflight Rest', icon: Bed },
        { id: 'about', label: 'About', icon: Info },
    ];

    return (
        <div className="flex h-dvh overflow-hidden bg-aviation-bg text-slate-200 font-sans">
            {/* Sidebar */}
            <aside className={cn(
                "border-r border-white/5 bg-aviation-panel flex flex-col transition-all duration-300 shrink-0 relative",
                isSidebarCollapsed ? "w-16" : "w-16 md:w-20 lg:w-52"
            )}>
                {/* Toggle Button */}
                <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="absolute -right-3 top-20 w-6 h-6 bg-aviation-accent rounded-full flex items-center justify-center text-black shadow-lg z-50 hover:scale-110 transition-transform hidden lg:flex"
                >
                    {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>

                <div className="p-4 lg:p-5 overflow-hidden">
                    <h1 className="text-xl font-bold tracking-tighter text-white flex items-center gap-2">
                        <div className="w-8 h-8 bg-aviation-accent rounded-lg flex items-center justify-center shrink-0">
                            <Plane className="w-5 h-5 text-black" />
                        </div>
                        {!isSidebarCollapsed && <span className="hidden lg:inline truncate">eFlightBag</span>}
                    </h1>
                    {!isSidebarCollapsed && (
                        <p className="hidden lg:block text-[10px] font-bold text-aviation-accent uppercase tracking-[0.2em] mt-1 truncate">
                            Offline Capable EFB
                        </p>
                    )}
                </div>

                <nav className="flex-1 px-2 lg:px-2.5 space-y-1 overflow-y-auto custom-scrollbar">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => onSectionChange(item.id as AppSection)}
                            title={item.label}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 lg:px-4 py-2.5 rounded-xl transition-all duration-200 group text-left",
                                activeSection === item.id
                                    ? "bg-aviation-accent/10 text-aviation-accent"
                                    : "text-slate-500 hover:text-slate-200 hover:bg-white/5"
                            )}
                        >
                            <item.icon className={cn(
                                "w-5 h-5 transition-transform duration-200 group-hover:scale-110 shrink-0",
                                activeSection === item.id ? "text-aviation-accent" : "text-slate-500"
                            )} />
                            {!isSidebarCollapsed && <span className="text-sm font-medium hidden lg:inline truncate">{item.label}</span>}
                            {!isSidebarCollapsed && activeSection === item.id && (
                                <motion.div
                                    layoutId="activeNav"
                                    className="ml-auto w-1.5 h-1.5 rounded-full bg-aviation-accent shadow-[0_0_8px_rgba(56,189,248,0.6)] hidden lg:block"
                                />
                            )}
                        </button>
                    ))}
                </nav>

                <div className="p-4 lg:p-5 border-t border-white/5">
                    <div className="flex items-center gap-3 text-slate-500">
                        <div className="w-2 h-2 rounded-full bg-aviation-success animate-pulse shrink-0" />
                        {!isSidebarCollapsed && <span className="text-[10px] font-bold uppercase tracking-widest hidden lg:inline">System Ready</span>}
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Top Bar */}
                <header className="h-14 md:h-16 border-bottom border-white/5 bg-aviation-panel/50 backdrop-blur-xl flex items-center justify-between px-4 md:px-8 shrink-0 relative pt-[env(safe-area-inset-top)] max-w-4xl mx-auto w-full rounded-b-xl shadow-lg">
                    <div className="flex items-center gap-2 md:gap-4 z-10 max-w-[35%]">
                        <h2 className="text-sm md:text-lg font-semibold text-white truncate max-w-[120px] md:max-w-none">
                            {navItems.find(i => i.id === activeSection)?.label}
                        </h2>
                        <div className="h-4 w-[1px] bg-white/10" />
                        <div className="flex items-center gap-2 text-slate-400 flex truncate">
                            <MapPin className="w-3 h-3 md:w-4 md:h-4 shrink-0" />
                            <span className="text-[10px] md:text-xs font-mono truncate">{route}</span>
                        </div>
                    </div>

                    {flightNumber && activeSection !== 'flight-init' && (
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none z-10 flex">
                            <span className="text-[8px] md:text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Flight</span>
                            <span className="text-base md:text-xl font-mono font-bold text-aviation-success drop-shadow-md leading-none">{flightNumber}</span>
                        </div>
                    )}

                    <div className="flex items-center gap-3 md:gap-6 z-10 w-auto justify-end">
                        <div className="flex flex-col items-end flex">
                            <span className="text-[8px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date (UTC)</span>
                            <span className="text-sm md:text-lg font-mono font-medium text-aviation-accent leading-none">
                                {currentTime.getUTCDate().toString().padStart(2, '0')} {currentTime.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' }).toUpperCase()} {currentTime.getUTCFullYear()}
                            </span>
                        </div>
                        <div className="h-8 w-[1px] bg-white/10 block" />
                        <div className="flex flex-col items-end">
                            <span className="text-[8px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest">Zulu Time</span>
                            <span className="text-sm md:text-lg font-mono font-medium text-aviation-accent leading-none">{formatZulu(currentTime)}</span>
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <div className="flex-1 min-h-0 p-3 md:p-6 lg:p-8 flex flex-col pb-[env(safe-area-inset-bottom)]">
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
