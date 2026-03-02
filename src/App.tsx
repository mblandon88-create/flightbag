import { useState } from 'react'
import { MainLayout } from './components/MainLayout'
import { FlightInit } from './components/FlightInit'
import { Performance } from './components/Performance'
import { TechLog } from './components/TechLog'
import { DangerousGoods } from './components/DangerousGoods'
import { InflightDisplay } from './components/InflightDisplay'
import { PAGuide } from './components/PAGuide'
import type { AppSection } from './types';
import { useStore } from './store/useStore'
import './index.css'

function App() {
  const [activeSection, setActiveSection] = useState<AppSection>('flight-init')
  const { flightData } = useStore();

  const routeLabel = flightData
    ? `${flightData.departure} ➔ ${flightData.arrival}`
    : 'EFB DASHBOARD';

  const renderContent = () => {
    switch (activeSection) {
      case 'flight-init': return <FlightInit />;
      case 'performance': return <Performance />;
      case 'techlog': return <TechLog />;
      case 'dangerous-goods': return <DangerousGoods />;
      case 'inflight': return <InflightDisplay />;
      case 'pa-guide': return <PAGuide />;
      default: return (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
          <p className="text-sm font-medium">Section "{activeSection}" is currently under maintenance.</p>
        </div>
      );
    }
  }

  return (
    <MainLayout
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      route={routeLabel}
    >
      {renderContent()}
    </MainLayout>
  )
}

export default App
