import React from 'react';
import { Plane, FileText, Settings, Fuel, AlertTriangle, Monitor, BedDouble, Volume2, Info } from 'lucide-react';

interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

const navItems = [
    { id: 'init', label: 'Flight Init', icon: Plane },
    { id: 'performance', label: 'Performance', icon: Settings },
    { id: 'techlog', label: 'TechLog', icon: Fuel },
    { id: 'dg', label: 'Dangerous Goods', icon: AlertTriangle },
    { id: 'inflight', label: 'Inflight Display', icon: Monitor },
    { id: 'briefing', label: 'Briefing', icon: FileText },
    { id: 'pa', label: 'PA Guide', icon: Volume2 },
    { id: 'rest', label: 'Inflight Rest', icon: BedDouble },
    { id: 'about', label: 'About', icon: Info },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <h1 className="sidebar-title">eFlightBag</h1>
                <span className="sidebar-subtitle">Offline Capable EFB</span>
            </div>
            <ul className="nav-list">
                {navItems.map((item) => (
                    <li
                        key={item.id}
                        className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(item.id)}
                    >
                        <item.icon size={20} />
                        <span>{item.label}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};
