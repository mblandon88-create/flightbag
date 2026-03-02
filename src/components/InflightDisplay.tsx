import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Clock, MapPin, AlertCircle, CheckCircle2, Navigation } from 'lucide-react';

type SubTab = 'departure' | 'enroute' | 'arrival' | 'notes';

interface InflightDisplayProps {
    initialSubTab?: SubTab;
}

interface WaypointInput {
    ata: string;
    fuel: string;
}

export const InflightDisplay: React.FC<InflightDisplayProps> = ({ initialSubTab = 'departure' }) => {
    const flightData = useStore((state) => state.flightData);
    const [activeSubTab, setActiveSubTab] = useState<SubTab>((initialSubTab as any) === 'waypoints' ? 'enroute' : initialSubTab);
    const [waypointInputs, setWaypointInputs] = useState<Record<number, WaypointInput>>({});
    const [takeoffTime, setTakeoffTime] = useState<string>('');
    const [currentTime, setCurrentTime] = useState<string>(new Date().getUTCHours().toString().padStart(2, '0') + new Date().getUTCMinutes().toString().padStart(2, '0'));
    const [activeIndex, setActiveIndex] = useState<number>(-1);

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const rowRefs = useRef<Record<number, HTMLTableRowElement | null>>({});

    // Update current time every minute
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const timeStr = now.getUTCHours().toString().padStart(2, '0') + now.getUTCMinutes().toString().padStart(2, '0');
            setCurrentTime(timeStr);
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    // Auto-scroll logic & Active Waypoint Tracking
    useEffect(() => {
        if (flightData?.waypointEntries) {
            let foundIndex = -1;
            const nowNum = parseInt(currentTime, 10);

            for (let i = 0; i < flightData.waypointEntries.length; i++) {
                const wp = flightData.waypointEntries[i];
                if (wp.isFir) continue;
                const eta = calculateEta(takeoffTime, wp.stm);
                if (eta) {
                    const etaNum = parseInt(eta.replace(':', ''), 10);
                    if (etaNum >= nowNum) {
                        foundIndex = i;
                        break;
                    }
                }
            }

            setActiveIndex(foundIndex);

            // Scroll to the identified row if in Enroute tab
            if (activeSubTab === 'enroute' && foundIndex !== -1 && rowRefs.current[foundIndex]) {
                rowRefs.current[foundIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [activeSubTab, currentTime, takeoffTime, flightData?.waypointEntries]);

    // Sync sub-tab if prop changes (e.g. from sidebar shortcut)
    React.useEffect(() => {
        if (initialSubTab) {
            setActiveSubTab((initialSubTab as any) === 'waypoints' ? 'enroute' : initialSubTab);
        }
    }, [initialSubTab]);

    if (!flightData) {
        return (
            <div className="card">
                <h3>Inflight Display</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Please load a flight plan in the Flight Init tab first.</p>
            </div>
        );
    }

    const waypointEntries = flightData.waypointEntries || [];

    const handleInputChange = (index: number, field: keyof WaypointInput, value: string) => {
        let finalValue = value;
        if (field === 'ata') {
            const clean = value.replace(/\D/g, '');
            if (clean.length >= 3) {
                finalValue = `${clean.substring(0, 2)}:${clean.substring(2, 4)}`;
            } else {
                finalValue = clean;
            }
        }
        setWaypointInputs(prev => ({
            ...prev,
            [index]: {
                ...(prev[index] || { ata: '', fuel: '' }),
                [field]: finalValue
            }
        }));
    };

    const calculateEta = (takeoff: string, ctmMinutes: number) => {
        if (!takeoff || takeoff.length < 4) return null;

        // Handle both HH:MM and HHMM formats
        const cleanTime = takeoff.replace(':', '');
        if (cleanTime.length !== 4) return null;

        let hh = parseInt(cleanTime.substring(0, 2), 10);
        let mm = parseInt(cleanTime.substring(2, 4), 10);

        if (isNaN(hh) || isNaN(mm)) return null;

        // Add CTM minutes
        mm += ctmMinutes;

        // Handle overflow
        hh += Math.floor(mm / 60);
        mm %= 60;
        hh %= 24;

        return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
    };

    const formatTimeForInput = (timeStr?: string) => {
        if (!timeStr) return '';
        const clean = timeStr.replace(':', '');
        if (clean.length !== 4) return timeStr;
        return `${clean.substring(0, 2)}:${clean.substring(2, 4)}`;
    };

    const diffMinutes = (time1: string, time2: string) => {
        const t1 = time1.replace(':', '');
        const t2 = time2.replace(':', '');
        if (t1.length !== 4 || t2.length !== 4) return 0;
        const h1 = parseInt(t1.substring(0, 2), 10);
        const m1 = parseInt(t1.substring(2, 4), 10);
        const h2 = parseInt(t2.substring(0, 2), 10);
        const m2 = parseInt(t2.substring(2, 4), 10);
        let diff = (h1 * 60 + m1) - (h2 * 60 + m2);
        // Handle day wraps if simple comparison fails
        if (diff < -1200) diff += 1440;
        if (diff > 1200) diff -= 1440;
        return diff;
    };

    // Calculate global estimated ATA for touchdown autofill
    let globalEstAta = '';
    let lastAtaIdx = -1;
    for (let j = waypointEntries.length - 1; j >= 0; j--) {
        const ataClean = waypointInputs[j]?.ata?.replace(':', '');
        if (ataClean && ataClean.length === 4) {
            lastAtaIdx = j;
            break;
        }
    }
    if (lastAtaIdx !== -1) {
        const lastWp = waypointEntries[lastAtaIdx];
        const remainingMinutes = flightData.tripTime - lastWp.stm;
        globalEstAta = calculateEta(waypointInputs[lastAtaIdx].ata, remainingMinutes) || '';
    }

    // Sub-navigation renderers
    const renderSubNavigation = () => (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
            {['departure', 'enroute', 'arrival', 'notes'].map((tab) => (
                <button
                    key={tab}
                    className={`btn ${activeSubTab === tab ? 'btn-primary' : ''}`}
                    style={{
                        background: activeSubTab === tab ? 'var(--accent-blue)' : 'var(--bg-surface)',
                        color: activeSubTab === tab ? '#fff' : 'var(--text-secondary)',
                        whiteSpace: 'nowrap'
                    }}
                    onClick={() => setActiveSubTab(tab as any)}
                >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
            ))}
        </div>
    );

    const renderContent = () => {
        switch (activeSubTab) {
            case 'departure':
                return (
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ color: 'var(--accent-green)', margin: 0 }}>Departure: {flightData.departure}</h3>
                            <span style={{ color: 'var(--accent-orange)', fontWeight: 600 }}>STD: {flightData.std}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Block Off Time Z</label>
                                <input
                                    type="time"
                                    value={formatTimeForInput(waypointInputs[-1]?.ata)}
                                    onChange={(e) => setWaypointInputs(prev => ({ ...prev, [-1]: { ...prev[-1], ata: e.target.value.replace(':', '') } }))}
                                    style={{ width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border-color)', color: 'white', padding: '0.75rem', borderRadius: '4px' }}
                                />
                                {(() => {
                                    const blockOff = waypointInputs[-1]?.ata;
                                    if (!blockOff || blockOff.length !== 4) return null;
                                    const stdClean = flightData.std.split('/')[1] || flightData.std;
                                    const delay = diffMinutes(blockOff, stdClean);
                                    if (delay > 0) {
                                        return (
                                            <div style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: 'var(--accent-red)', fontWeight: 700 }}>
                                                DELAY: +{delay} MIN
                                            </div>
                                        );
                                    } else {
                                        return (
                                            <div style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: 'var(--accent-green)', fontWeight: 700 }}>
                                                EARLY: {delay} MIN
                                            </div>
                                        );
                                    }
                                })()}
                            </div>

                            <div>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Take Off Time Z</label>
                                <input
                                    type="time"
                                    value={takeoffTime}
                                    onChange={(e) => setTakeoffTime(e.target.value)}
                                    style={{ width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border-color)', color: 'white', padding: '0.75rem', borderRadius: '4px' }}
                                />
                                {takeoffTime && flightData.tripTime > 0 && (
                                    <div style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: 'var(--accent-orange)', fontWeight: 600 }}>
                                        ETA at Destination: {calculateEta(takeoffTime, flightData.tripTime)} Z
                                    </div>
                                )}
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Departure ATIS / CLEARANCE</label>
                                <textarea rows={4} style={{ width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border-color)', color: 'white', padding: '0.75rem', borderRadius: '4px', resize: 'vertical' }} placeholder="ATIS Info D, QNH 1013..."></textarea>
                            </div>
                        </div>
                    </div>
                );

            case 'enroute':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                            <div
                                ref={scrollContainerRef}
                                style={{
                                    maxHeight: '400px',
                                    overflowY: 'auto',
                                    scrollbarWidth: 'thin'
                                }}
                            >
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                    <thead style={{
                                        background: 'var(--bg-surface)',
                                        color: 'var(--text-secondary)',
                                        textAlign: 'left',
                                        position: 'sticky',
                                        top: 0,
                                        zIndex: 1
                                    }}>
                                        <tr>
                                            <th style={{ padding: '0.75rem 1rem' }}>WAYPOINT</th>
                                            <th style={{ padding: '0.75rem 1rem' }}>PLN ETA</th>
                                            <th style={{ padding: '0.75rem 1rem' }}>ATA (Z)</th>
                                            <th style={{ padding: '0.75rem 1rem' }}>PLN FUEL</th>
                                            <th style={{ padding: '0.75rem 1rem' }}>ACT FUEL</th>
                                            <th style={{ padding: '0.75rem 1rem' }}>DIFF</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {waypointEntries.length > 0 ? waypointEntries.map((wp, idx) => {
                                            const input = waypointInputs[idx] || { ata: '', fuel: '' };
                                            const plnFuel = wp.rfob;
                                            const actFuel = parseFloat(input.fuel);
                                            const diff = !isNaN(actFuel) ? (actFuel - plnFuel).toFixed(1) : null;
                                            const diffColor = diff === null ? 'var(--text-secondary)' : parseFloat(diff) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
                                            const plnEta = calculateEta(takeoffTime, wp.stm);

                                            // Highlight if this is the active (next) waypoint
                                            const isHighlight = idx === activeIndex;

                                            return (
                                                <tr
                                                    key={idx}
                                                    ref={el => { rowRefs.current[idx] = el; }}
                                                    style={{
                                                        borderBottom: '1px solid var(--border-color)',
                                                        background: isHighlight ? 'rgba(39, 174, 96, 0.15)' : (wp.isFir ? 'rgba(52, 152, 219, 0.05)' : 'transparent'),
                                                        transition: 'background 0.3s'
                                                    }}
                                                >
                                                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, fontFamily: 'monospace' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            {wp.isFir ? <MapPin size={14} color="var(--accent-blue)" /> :
                                                                wp.isToc ? <CheckCircle2 size={14} color="var(--accent-orange)" /> :
                                                                    wp.isTod ? <AlertCircle size={14} color="var(--accent-orange)" /> :
                                                                        (wp.name.length > 5 ? <Navigation size={14} color="var(--text-secondary)" /> : null)}
                                                            {wp.name}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem', color: 'var(--accent-orange)', fontWeight: 600 }}>
                                                        {wp.isFir ? '-' : (plnEta || '-')}
                                                    </td>
                                                    <td style={{ padding: '0.5rem' }}>
                                                        {!wp.isFir && (
                                                            <input
                                                                type="text"
                                                                placeholder="HHMM"
                                                                value={input.ata}
                                                                onChange={(e) => handleInputChange(idx, 'ata', e.target.value)}
                                                                style={{ width: '70px', background: 'var(--bg-base)', border: '1px solid var(--border-color)', color: 'white', padding: '4px 8px', borderRadius: '4px', textAlign: 'center', fontSize: '0.8rem' }}
                                                            />
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{wp.isFir ? '-' : plnFuel.toFixed(1)}</td>
                                                    <td style={{ padding: '0.5rem' }}>
                                                        {!wp.isFir && (
                                                            <input
                                                                type="number"
                                                                step="0.1"
                                                                placeholder="0.0"
                                                                value={input.fuel}
                                                                onChange={(e) => handleInputChange(idx, 'fuel', e.target.value)}
                                                                style={{ width: '70px', background: 'var(--bg-base)', border: '1px solid var(--border-color)', color: 'white', padding: '4px 8px', borderRadius: '4px', textAlign: 'right', fontSize: '0.8rem' }}
                                                            />
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: diffColor }}>
                                                        {!wp.isFir ? (diff ? (parseFloat(diff) > 0 ? `+${diff}` : diff) : '-') : ''}
                                                    </td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr>
                                                <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                                    No structured nav log entries identified.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Enroute Footer Stats */}
                        <div className="card" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', marginTop: '1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', textAlign: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>DEST STA</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-orange)' }}>{flightData.sta}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>DEST ETA</div>
                                    {(() => {
                                        const eta = calculateEta(takeoffTime, flightData.tripTime);
                                        const staClean = flightData.sta.split('/')[1] || flightData.sta;
                                        const delay = diffMinutes(eta || '', staClean);
                                        const color = delay > 0 ? 'var(--accent-red)' : 'var(--accent-green)';
                                        return <div style={{ fontSize: '1.1rem', fontWeight: 700, color }}>{eta || '-'}</div>;
                                    })()}
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>DEST ATA (EST)</div>
                                    {(() => {
                                        if (lastAtaIdx === -1) return <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>-</div>;

                                        const staClean = flightData.sta.split('/')[1] || flightData.sta;
                                        const delay = diffMinutes(globalEstAta || '', staClean);
                                        const color = delay > 0 ? 'var(--accent-red)' : 'var(--accent-green)';

                                        return <div style={{ fontSize: '1.1rem', fontWeight: 700, color }}>{globalEstAta}</div>;
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'arrival':
                return (
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ color: 'var(--accent-green)', margin: 0 }}>Arrival: {flightData.arrival}</h3>
                            <span style={{ color: 'var(--accent-orange)', fontWeight: 600 }}>STA: {flightData.sta}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Touchdown Time Z</label>
                                <input
                                    type="time"
                                    value={formatTimeForInput(waypointInputs[998]?.ata || globalEstAta)}
                                    onChange={(e) => setWaypointInputs(prev => ({ ...prev, [998]: { ...prev[998], ata: e.target.value.replace(':', '') } }))}
                                    style={{ width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border-color)', color: 'white', padding: '0.75rem', borderRadius: '4px' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Block On Time Z</label>
                                <input
                                    type="time"
                                    value={formatTimeForInput(waypointInputs[999]?.ata)}
                                    onChange={(e) => setWaypointInputs(prev => ({ ...prev, [999]: { ...prev[999], ata: e.target.value.replace(':', '') } }))}
                                    style={{ width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border-color)', color: 'white', padding: '0.75rem', borderRadius: '4px' }}
                                />
                                {(() => {
                                    const blockOn = waypointInputs[999]?.ata;
                                    if (!blockOn || blockOn.length !== 4) return null;
                                    const staClean = flightData.sta.split('/')[1] || flightData.sta;
                                    const delay = diffMinutes(blockOn, staClean);
                                    if (delay > 0) {
                                        return (
                                            <div style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: 'var(--accent-red)', fontWeight: 700 }}>
                                                DELAY: +{delay} MIN
                                            </div>
                                        );
                                    } else if (delay < 0) {
                                        return (
                                            <div style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: 'var(--accent-green)', fontWeight: 700 }}>
                                                EARLY: {delay} MIN
                                            </div>
                                        );
                                    } else {
                                        return (
                                            <div style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: 'var(--accent-green)', fontWeight: 700 }}>
                                                ON TIME
                                            </div>
                                        );
                                    }
                                })()}
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Arrival ATIS</label>
                                <textarea rows={4} style={{ width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border-color)', color: 'white', padding: '0.75rem', borderRadius: '4px', resize: 'vertical' }} placeholder="ATIS Info X, QNH 1010..."></textarea>
                            </div>
                        </div>
                    </div>
                );

            case 'notes':
                return (
                    <div className="card" style={{ height: '500px' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Scratchpad</h3>
                        <textarea
                            style={{ width: '100%', height: 'calc(100% - 3.5rem)', background: 'var(--bg-base)', border: '1px solid var(--border-color)', color: 'var(--accent-orange)', padding: '1rem', borderRadius: '4px', resize: 'none', fontFamily: 'monospace', fontSize: '1.2rem', lineHeight: '1.5' }}
                            placeholder="Jot down ATC clearances, frequencies, or temporary numbers here..."
                        ></textarea>
                    </div>
                );

            default:
                return (
                    <div className="card">
                        <p style={{ color: 'var(--text-secondary)' }}>Module section under construction.</p>
                    </div>
                );
        }
    };

    return (
        <div className="inflight-display">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0 }}>Inflight Display</h2>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        <Clock size={16} /> <span>{new Date().getUTCHours().toString().padStart(2, '0')}:{new Date().getUTCMinutes().toString().padStart(2, '0')} Z</span>
                    </div>
                </div>
            </div>
            {renderSubNavigation()}
            {renderContent()}
        </div>
    );
};
