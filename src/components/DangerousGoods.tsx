import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Plus, Trash2, AlertTriangle, ShieldAlert, Package } from 'lucide-react';

export const DangerousGoods: React.FC = () => {
    const { dgItems, addDGItem, removeDGItem } = useStore();

    const [unNumber, setUnNumber] = useState('');
    const [psn, setPsn] = useState('');
    const [classOrDiv, setClassOrDiv] = useState('');
    const [quantity, setQuantity] = useState('');
    const [location, setLocation] = useState('');

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!unNumber || !psn) return;

        addDGItem({
            id: crypto.randomUUID(),
            unNumber,
            psn,
            classOrDiv,
            quantity,
            location
        });

        setUnNumber('');
        setPsn('');
        setClassOrDiv('');
        setQuantity('');
        setLocation('');
    };

    return (
        <div className="flex-1 flex flex-col gap-4 md:gap-6 min-h-0">
            <section className="shrink-0">
                <h3 className="text-xl md:text-2xl font-bold text-white mb-1">Dangerous Goods (NOTOC)</h3>
                <p className="text-slate-400 text-xs md:text-sm">Log required Notification to Captain items.</p>
            </section>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0 overflow-hidden">
                {/* Input Form */}
                <div className="lg:col-span-1 glass-panel flex flex-col overflow-hidden">
                    <div className="px-6 py-4 bg-aviation-warning/10 border-b border-aviation-warning/20 flex items-center gap-3">
                        <AlertTriangle className="w-4 h-4 text-aviation-warning" />
                        <h4 className="font-bold text-aviation-warning uppercase tracking-widest text-xs">Add DG Item</h4>
                    </div>
                    <form onSubmit={handleAdd} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                        <DGInput label="UN Number *" value={unNumber} onChange={setUnNumber} placeholder="e.g. 1863" required />
                        <DGInput label="Proper Shipping Name *" value={psn} onChange={setPsn} placeholder="e.g. Fuel, aviation..." required />

                        <div className="grid grid-cols-2 gap-4">
                            <DGInput label="Class/Div" value={classOrDiv} onChange={setClassOrDiv} placeholder="3" />
                            <DGInput label="Quantity" value={quantity} onChange={setQuantity} placeholder="200 L" />
                        </div>

                        <DGInput label="Loading Location" value={location} onChange={setLocation} placeholder="FWD Hold" />

                        <button
                            type="submit"
                            className="w-full bg-aviation-warning text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-aviation-warning/80 transition-colors mt-2"
                        >
                            <Plus className="w-4 h-4" /> Add to Manifest
                        </button>
                    </form>
                </div>

                {/* List View */}
                <div className="lg:col-span-2 glass-panel flex flex-col overflow-hidden">
                    <div className="px-6 py-4 bg-white/5 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <ShieldAlert className="w-4 h-4 text-slate-400" />
                            <h4 className="font-bold text-white uppercase tracking-widest text-xs">Manifest</h4>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 bg-white/5 px-2 py-1 rounded-full">{dgItems.length} ITEMS</span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                        {dgItems.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-40">
                                <Package className="w-12 h-12 mb-2" />
                                <p className="text-xs font-bold uppercase tracking-widest">No DG Items Logged</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {dgItems.map(item => (
                                    <div key={item.id} className="flex justify-between items-center p-4 bg-black/40 border-l-4 border-l-aviation-warning border-y border-r border-white/5 rounded-r-xl group animate-in slide-in-from-right-2">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="bg-aviation-warning/20 text-aviation-warning px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">UN{item.unNumber}</span>
                                                <span className="text-sm font-bold text-white">{item.psn}</span>
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                                Class: <span className="text-slate-300">{item.classOrDiv || 'N/A'}</span> |
                                                Qty: <span className="text-slate-300">{item.quantity || 'N/A'}</span> |
                                                Loc: <span className="text-slate-300 font-mono text-aviation-accent">{item.location || 'N/A'}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeDGItem(item.id)}
                                            className="p-2 text-slate-600 hover:text-aviation-warning transition-colors"
                                            title="Remove Item"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

function DGInput({ label, value, onChange, placeholder, required }: { label: string, value: string, onChange: (v: string) => void, placeholder?: string, required?: boolean }) {
    return (
        <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{label}</label>
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                required={required}
                className="w-full bg-black/40 border border-white/10 focus:border-aviation-warning/50 rounded-lg p-2.5 text-xs text-white placeholder:text-slate-700 outline-none transition-colors"
            />
        </div>
    );
}
