import React from 'react';
import { useStore } from '../store/useStore';

export const Performance: React.FC = () => {
    const { flightData, updateFlightData } = useStore();

    if (!flightData) {
        return (
            <div className="card">
                <h3>Performance</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Please load a flight plan in the Flight Init tab first.</p>
            </div>
        );
    }

    const mtow = parseInt(flightData.mtow) || 0;
    const mzfw = parseInt(flightData.mzfw) || 0;
    const ezfw = parseInt(flightData.ezfw) || 0;

    const taxi = parseInt(flightData.taxiFuel) || 0;
    const trip = parseInt(flightData.tripFuel) || 0;
    const cont = parseInt(flightData.contingencyFuel) || 0;
    const alt = parseInt(flightData.altFuel) || 0;
    const finl = parseInt(flightData.finResFuel) || 0;
    const extra = parseInt(flightData.extraFuel) || 0;
    const picd = parseInt(flightData.picFuel) || 0;

    const currentRampFuel = taxi + trip + cont + alt + finl + extra + picd;
    // eTOW is based on Estimated ZFW
    const eTOW = ezfw + currentRampFuel - taxi;

    return (
        <div className="performance">
            <h2>Performance Data</h2>

            <div style={{ display: 'flex', gap: '2rem', marginTop: '2rem', flexWrap: 'wrap' }}>
                {/* Fuel Planning */}
                <div className="card" style={{ flex: 1, minWidth: '300px' }}>
                    <h3 style={{ color: 'var(--accent-blue)', marginBottom: '1rem' }}>Fuel Planning (kg)</h3>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 100px',
                        columnGap: '3rem',
                        rowGap: '0.5rem',
                        alignItems: 'center'
                    }}>
                        <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Taxi:</span>
                        <strong style={{ textAlign: 'right' }}>{flightData.taxiFuel}</strong>

                        <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Trip:</span>
                        <strong style={{ textAlign: 'right' }}>{flightData.tripFuel}</strong>

                        <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>CONT.{flightData.contingencyRemarks ? ` (${flightData.contingencyRemarks})` : ''}:</span>
                        <strong style={{ textAlign: 'right' }}>{flightData.contingencyFuel}</strong>

                        <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>ALT:</span>
                        <strong style={{ textAlign: 'right' }}>{flightData.altFuel}</strong>

                        <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>FINL:</span>
                        <strong style={{ textAlign: 'right' }}>{flightData.finResFuel}</strong>

                        <span style={{ color: 'var(--accent-green)', whiteSpace: 'nowrap' }}>Min Fuel Req:</span>
                        <strong style={{ textAlign: 'right', color: 'var(--accent-green)' }}>{flightData.minReqFuel}</strong>

                        <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Extra:</span>
                        <strong style={{ textAlign: 'right' }}>{flightData.extraFuel}</strong>

                        <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>PICD:</span>
                        <div style={{ textAlign: 'right' }}>
                            <input
                                type="number"
                                value={flightData.picFuel}
                                onChange={(e) => {
                                    const newPicd = e.target.value;
                                    updateFlightData({ picFuel: newPicd });
                                }}
                                style={{ background: 'var(--bg-base)', border: '1px solid var(--border-color)', color: 'white', padding: '0.2rem 0.4rem', borderRadius: '4px', width: '70px', textAlign: 'right', fontSize: '0.9rem' }}
                            />
                        </div>

                        <div style={{ gridColumn: 'span 2' }}>
                            <hr style={{ borderColor: 'var(--border-color)', margin: '0.5rem 0' }} />
                        </div>

                        <span style={{ color: 'var(--accent-blue)', fontSize: '1.1rem', whiteSpace: 'nowrap' }}>Ramp Fuel:</span>
                        <strong style={{ textAlign: 'right', color: 'var(--accent-blue)', fontSize: '1.1rem' }}>{currentRampFuel}</strong>
                    </div>
                </div>

                {/* Weight Planning */}
                <div className="card" style={{ flex: 1, minWidth: '350px' }}>
                    <h3 style={{ color: 'var(--accent-orange)', marginBottom: '1rem' }}>Weight Planning (kg)</h3>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'auto auto auto auto auto',
                        columnGap: '0.5rem',
                        rowGap: '0.8rem',
                        alignItems: 'center',
                        justifyContent: 'start'
                    }}>
                        {/* Row 1 */}
                        <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>MZFW:</span>
                        <strong style={{ textAlign: 'right', minWidth: '70px' }}>{mzfw}</strong>

                        <div style={{ gridRow: 'span 2', width: '1px', backgroundColor: 'var(--border-color)', height: '100%', minHeight: '50px', margin: '0 2rem' }}></div>

                        <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>EZFW:</span>
                        <strong style={{ textAlign: 'right', minWidth: '70px' }}>{flightData.ezfw}</strong>

                        {/* Row 2 */}
                        <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>MTOW:</span>
                        <strong style={{ textAlign: 'right', minWidth: '70px' }}>{mtow}</strong>

                        <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>ETOW:</span>
                        <strong style={{
                            textAlign: 'right',
                            minWidth: '70px',
                            color: eTOW > mtow ? 'var(--accent-red)' : 'var(--text-primary)'
                        }}>{eTOW}</strong>
                    </div>
                    {eTOW > mtow && (
                        <p style={{ color: 'var(--accent-red)', fontSize: '0.8rem', textAlign: 'right', marginTop: '1rem', margin: 0 }}>Exceeds MTOW!</p>
                    )}
                </div>

            </div>
        </div>
    );
};
