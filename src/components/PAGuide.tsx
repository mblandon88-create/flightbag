import React from 'react';
import { useStore } from '../store/useStore';
import { Mic2, MessageSquareText, PlaneLanding, PlaneTakeoff } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

export const PAGuide: React.FC = () => {
    const flightData = useStore((state) => state.flightData);

    if (!flightData) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 glass-panel p-8">
                <Mic2 className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-sm font-medium">Please load a flight plan in the Flight Init tab first.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col gap-4 md:gap-6 min-h-0">
            <section className="shrink-0">
                <h3 className="text-xl md:text-2xl font-bold text-white mb-1">Passenger Announcements (PA)</h3>
                <p className="text-slate-400 text-xs md:text-sm">Dynamic templates for standard announcements.</p>
            </section>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto pr-2 custom-scrollbar">
                <PACard
                    title="Welcome Aboard"
                    icon={PlaneTakeoff}
                    color="aviation-accent"
                    text={`"Ladies and gentlemen, welcome aboard flight ${flightData.flightNumber} bound for ${flightData.arrival}. The flight crew is currently finalizing preparations for our departure. We anticipate a smooth ride to our destination today. Please sit back, relax, and direct your attention to the cabin crew for the safety briefing."`}
                    data={[
                        { label: 'Flight', value: flightData.flightNumber },
                        { label: 'Destination', value: flightData.arrival }
                    ]}
                />

                <PACard
                    title="Top of Descent"
                    icon={PlaneLanding}
                    color="aviation-success"
                    text={`"Ladies and gentlemen, as you may have noticed, we have begun our initial descent into ${flightData.arrival}. The weather at our destination is currently looking good. Cabin crew, please prepare the cabin for arrival."`}
                    data={[
                        { label: 'Destination', value: flightData.arrival },
                        { label: 'Landing ATIS', value: 'Check Inflight Display' }
                    ]}
                />
            </div>
        </div>
    );
};

function PACard({ title, icon: Icon, color, text, data }: { title: string, icon: LucideIcon | React.ElementType, color: string, text: string, data: { label: string, value: string }[] }) {
    const colorClass = color === 'aviation-accent' ? 'text-aviation-accent' : 'text-aviation-success';
    const borderClass = color === 'aviation-accent' ? 'border-l-aviation-accent' : 'border-l-aviation-success';
    const bgClass = color === 'aviation-accent' ? 'bg-aviation-accent/5' : 'bg-aviation-success/5';

    return (
        <div className="glass-panel overflow-hidden flex flex-col">
            <div className={cn("px-6 py-4 border-b border-white/5 flex items-center gap-3", bgClass)}>
                <Icon className={cn("w-5 h-5", colorClass)} />
                <h4 className={cn("font-bold uppercase tracking-widest text-xs", colorClass)}>{title}</h4>
            </div>
            <div className="p-6 space-y-6 flex-1 flex flex-col">
                <div className={cn("bg-black/40 border-l-4 rounded-r-xl p-6 relative group", borderClass)}>
                    <MessageSquareText className="absolute top-2 right-2 w-4 h-4 text-white/5 group-hover:text-white/10 transition-colors" />
                    <p className="text-sm md:text-lg text-slate-200 leading-relaxed italic font-serif">
                        {text}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-auto pt-4 border-t border-white/5">
                    {data.map((item, idx) => (
                        <div key={idx}>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">{item.label}</span>
                            <span className="text-xs font-bold text-aviation-accent">{item.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
