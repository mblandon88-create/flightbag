import { useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { FlightInit } from './components/FlightInit'
import { Performance } from './components/Performance'
import { TechLog } from './components/TechLog'
import { DangerousGoods } from './components/DangerousGoods'
import { InflightDisplay } from './components/InflightDisplay'
import { PAGuide } from './components/PAGuide'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('init')

  // Simple renderer for content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'init': return <FlightInit />;
      case 'performance': return <Performance />;
      case 'techlog': return <TechLog />;
      case 'dg': return <DangerousGoods />;
      case 'inflight': return <InflightDisplay />;
      case 'pa': return <PAGuide />;
      default: return (
        <div>
          <h2>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Module</h2>
          <div className="card" style={{ marginTop: '1rem' }}>
            <p style={{ color: 'var(--text-secondary)' }}>This module is currently under construction.</p>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  )
}

export default App
