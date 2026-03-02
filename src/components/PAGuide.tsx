import React from 'react';
import { useStore } from '../store/useStore';

export const PAGuide: React.FC = () => {
    const flightData = useStore((state) => state.flightData);

    if (!flightData) {
        return (
            <div className="card">
                <h3>PA Guide</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Please load a flight plan in the Flight Init tab first.</p>
            </div>
        );
    }

    return (
        <div className="pa-guide">
            <h2>Passenger Announcements (PA)</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Dynamic templates for standard announcements.</p>

            <div style={{ display: 'grid', gap: '2rem' }}>

                <div className="card">
                    <h3 style={{ color: 'var(--accent-blue)', marginBottom: '1rem' }}>Welcome Aboard</h3>
                    <p style={{ lineHeight: '1.8', fontSize: '1.1rem', color: 'var(--text-primary)', background: 'var(--bg-base)', padding: '1.5rem', borderRadius: '4px', borderLeft: '4px solid var(--accent-blue)' }}>
                        "Ladies and gentlemen, welcome aboard flight <strong style={{ color: 'var(--accent-orange)' }}>{flightData.flightNumber}</strong> bound for
                        <strong style={{ color: 'var(--accent-orange)' }}> {flightData.arrival}</strong>.
                        The flight crew is currently finalizing preparations for our departure.
                        We anticipate a smooth ride to our destination today.
                        Please sit back, relax, and direct your attention to the cabin crew for the safety briefing."
                    </p>
                </div>

                <div className="card">
                    <h3 style={{ color: 'var(--accent-green)', marginBottom: '1rem' }}>Top of Descent</h3>
                    <p style={{ lineHeight: '1.8', fontSize: '1.1rem', color: 'var(--text-primary)', background: 'var(--bg-base)', padding: '1.5rem', borderRadius: '4px', borderLeft: '4px solid var(--accent-green)' }}>
                        "Ladies and gentlemen, as you may have noticed, we have begun our initial descent into
                        <strong style={{ color: 'var(--accent-orange)' }}> {flightData.arrival}</strong>.
                        The weather at our destination is currently looking good.
                        Cabin crew, please prepare the cabin for arrival."
                    </p>
                </div>

            </div>
        </div>
    );
};
