import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Plus, Trash2 } from 'lucide-react';

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

        // Reset form
        setUnNumber('');
        setPsn('');
        setClassOrDiv('');
        setQuantity('');
        setLocation('');
    };

    return (
        <div className="dg-module">
            <h2>Dangerous Goods (NOTOC)</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Log required Notification to Captain items.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'start' }}>

                {/* Input Form */}
                <div className="card">
                    <h3 style={{ color: 'var(--accent-red)', marginBottom: '1rem' }}>Add DG Item</h3>
                    <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>UN Number *</label>
                            <input
                                type="text" required
                                value={unNumber} onChange={e => setUnNumber(e.target.value)}
                                style={{ background: 'var(--bg-base)', border: '1px solid var(--border-color)', color: 'white', padding: '0.5rem', borderRadius: '4px' }}
                                placeholder="e.g. 1863"
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Proper Shipping Name *</label>
                            <input
                                type="text" required
                                value={psn} onChange={e => setPsn(e.target.value)}
                                style={{ background: 'var(--bg-base)', border: '1px solid var(--border-color)', color: 'white', padding: '0.5rem', borderRadius: '4px' }}
                                placeholder="e.g. Fuel, aviation, turbine engine"
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Class/Div</label>
                                <input
                                    type="text"
                                    value={classOrDiv} onChange={e => setClassOrDiv(e.target.value)}
                                    style={{ background: 'var(--bg-base)', border: '1px solid var(--border-color)', color: 'white', padding: '0.5rem', borderRadius: '4px' }}
                                    placeholder="e.g. 3"
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Quantity</label>
                                <input
                                    type="text"
                                    value={quantity} onChange={e => setQuantity(e.target.value)}
                                    style={{ background: 'var(--bg-base)', border: '1px solid var(--border-color)', color: 'white', padding: '0.5rem', borderRadius: '4px' }}
                                    placeholder="e.g. 200 L"
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Loading Location</label>
                            <input
                                type="text"
                                value={location} onChange={e => setLocation(e.target.value)}
                                style={{ background: 'var(--bg-base)', border: '1px solid var(--border-color)', color: 'white', padding: '0.5rem', borderRadius: '4px' }}
                                placeholder="e.g. FWD Hold"
                            />
                        </div>

                        <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem', background: 'var(--accent-red)' }}>
                            <Plus size={18} /> Add Item
                        </button>
                    </form>
                </div>

                {/* List View */}
                <div className="card" style={{ minHeight: '300px' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Manifest</h3>

                    {dgItems.length === 0 ? (
                        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                            No Dangerous Goods logged for this flight.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {dgItems.map(item => (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-base)', borderLeft: '4px solid var(--accent-red)', borderRadius: '4px' }}>
                                    <div>
                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>UN{item.unNumber} - {item.psn}</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                            Class: {item.classOrDiv || 'N/A'} | Qty: {item.quantity || 'N/A'} | Loc: {item.location || 'N/A'}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => removeDGItem(item.id)}
                                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.5rem' }}
                                        title="Remove Item"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
