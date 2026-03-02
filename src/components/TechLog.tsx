import React from 'react';
import { useStore } from '../store/useStore';

export const TechLog: React.FC = () => {
    const { flightData, meteredUplift, setMeteredUplift } = useStore();

    if (!flightData) {
        return (
            <div className="card">
                <h3>TechLog</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Please load a flight plan in the Flight Init tab first.</p>
            </div>
        );
    }

    const rampFuel = parseInt(flightData.rampFuel) || 0;
    // Assumed realistic standard SG for Jet-A1 if not provided
    const specificGravity = 0.8;
    const upliftLiters = Math.round(meteredUplift / specificGravity);
    const discrepancy = meteredUplift - rampFuel;

    return (
        <div className="techlog">
            <h2>TechLog: Fuel Uplift</h2>

            <div className="card" style={{ maxWidth: '500px', marginTop: '2rem' }}>
                <h3 style={{ color: 'var(--accent-blue)', marginBottom: '1.5rem' }}>Refueling Data</h3>

                <div style={{ display: 'grid', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Required Ramp Fuel:</span>
                        <strong>{rampFuel} kg</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Specific Gravity (SG):</span>
                        <strong>{specificGravity}</strong>
                    </div>

                    <hr style={{ borderColor: 'var(--border-color)', margin: '0.5rem 0' }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Actual Metered Uplift (kg):</span>
                        <input
                            type="number"
                            value={meteredUplift || ''}
                            placeholder="KG"
                            onChange={(e) => setMeteredUplift(parseInt(e.target.value) || 0)}
                            style={{ background: 'var(--bg-base)', border: '1px solid var(--accent-blue)', color: 'white', padding: '0.5rem', borderRadius: '4px', width: '100px', textAlign: 'right', fontSize: '1.1rem' }}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Equivalent in Liters:</span>
                        <span>{upliftLiters} L</span>
                    </div>

                    <hr style={{ borderColor: 'var(--border-color)', margin: '0.5rem 0' }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1.1rem' }}>
                        <span>Discrepancy:</span>
                        <strong style={{ color: Math.abs(discrepancy) > 500 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                            {discrepancy > 0 ? '+' : ''}{discrepancy} kg
                        </strong>
                    </div>
                    {Math.abs(discrepancy) > 500 && (
                        <div style={{ color: 'var(--accent-red)', fontSize: '0.85rem', textAlign: 'right', marginTop: '-0.5rem' }}>
                            Warning: Discrepancy differs by more than 500kg from Required Ramp Fuel.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
