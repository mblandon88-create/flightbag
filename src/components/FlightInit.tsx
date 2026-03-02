import React, { useState } from 'react';
import { parseLidoPDF } from '../utils/pdfParser';
import { FileUp, Loader2, CheckCircle } from 'lucide-react';
import { useStore } from '../store/useStore';

export const FlightInit: React.FC = () => {
    const { flightData, setFlightData } = useStore();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setError(null);
        try {
            const parsed = await parseLidoPDF(file);
            setFlightData(parsed);
        } catch (err) {
            console.error(err);
            setError('Failed to parse PDF. Ensure it is a valid LIDO format.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flight-init">
            <h2>Flight Initialization</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Load your LIDO Flight Plan to automatically initialize the EFB.
            </p>

            <div className="card" style={{ maxWidth: '600px', marginBottom: '2rem', padding: '1rem' }}>
                <div
                    style={{
                        border: '2px dashed var(--border-color)',
                        borderRadius: '8px',
                        padding: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '1rem',
                        cursor: 'pointer',
                        transition: 'border-color var(--transition-fast)'
                    }}
                    onClick={() => document.getElementById('pdf-upload')?.click()}
                >
                    {loading ? (
                        <Loader2 size={28} color="var(--accent-blue)" className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                        <FileUp size={28} color="var(--accent-blue)" />
                    )}

                    <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.1rem' }}>
                        {loading ? 'Parsing...' : 'Upload LIDO PDF'}
                    </h3>

                    <input
                        type="file"
                        id="pdf-upload"
                        accept="application/pdf"
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                    />
                </div>
                {error && <p style={{ color: 'var(--accent-red)', marginTop: '1rem' }}>{error}</p>}
            </div>

            {flightData && (
                <div className="card" style={{ borderLeft: '4px solid var(--accent-blue)', animation: 'fade-in 0.3s ease' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-green)' }}>
                        <CheckCircle size={20} /> Data Loaded Successfully
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                        <div><strong>Flight Number:</strong> <span style={{ color: 'var(--accent-blue)' }}>{flightData.flightNumber}</span></div>
                        <div><strong>Route:</strong> {flightData.departure} ➔ {flightData.arrival}</div>
                        <div><strong>STD:</strong> <span style={{ color: 'var(--accent-orange)' }}>{flightData.std}</span></div>
                        <div><strong>STA:</strong> <span style={{ color: 'var(--accent-orange)' }}>{flightData.sta}</span></div>
                        <div style={{ gridColumn: 'span 2' }}><strong>Block Time (BLK):</strong> {flightData.blkTime}</div>
                        <div><strong>Trip Fuel:</strong> {flightData.tripFuel} kg</div>
                        <div><strong>Ramp Fuel:</strong> {flightData.rampFuel} kg</div>
                        <div><strong>MZFW:</strong> {flightData.mzfw} kg</div>
                        <div><strong>MTOW:</strong> {flightData.mtow} kg</div>
                    </div>
                    <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div>
                            <strong>Route:</strong> <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{flightData.route}</span>
                        </div>
                        <div>
                            <strong>Flight Level(s):</strong> <span style={{ fontFamily: 'monospace', color: 'var(--accent-orange)' }}>{flightData.flightLevel}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
