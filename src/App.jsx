import React, { useState } from 'react';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';
import HostDashboard from './views/HostDashboard';
import StudentView from './views/StudentView';
import QrShareModal from './components/QrShareModal';

export default function App() {
  const [isHost, setIsHost] = useState(() => {
    return sessionStorage.getItem('gdg_is_host') === 'true';
  });

  const [isQrOpen, setIsQrOpen] = useState(false);

  const handleHostUnlock = () => {
    setIsHost(true);
    sessionStorage.setItem('gdg_is_host', 'true');
  };

  const handleExitHost = () => {
    setIsHost(false);
    sessionStorage.removeItem('gdg_is_host');
  };

  return (
    <SocketProvider>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar
          isHost={isHost}
          onExitHost={handleExitHost}
          onOpenQr={() => setIsQrOpen(true)}
        />

        <main style={{ flex: 1 }}>
          {isHost ? (
            <HostDashboard onOpenQr={() => setIsQrOpen(true)} />
          ) : (
            <StudentView onHostUnlock={handleHostUnlock} />
          )}
        </main>

        <QrShareModal
          isOpen={isQrOpen}
          onClose={() => setIsQrOpen(false)}
        />
      </div>
    </SocketProvider>
  );
}
