import React, { useState, useEffect } from 'react';
import { BluetoothMoniUser } from '../types';

interface BluetoothUserSelectorProps {
  onUserSelected: (user: BluetoothMoniUser) => void;
  onClose: () => void;
}

const BluetoothUserSelector: React.FC<BluetoothUserSelectorProps> = ({ onUserSelected, onClose }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [nearbyUsers, setNearbyUsers] = useState<BluetoothMoniUser[]>([]);
  const [error, setError] = useState('');

  const mockNearbyUsers: BluetoothMoniUser[] = [
    { moniNumber: 'MN10001', name: 'Fatou Ndiaye', avatar: 'https://picsum.photos/seed/fatou/200', distance: '2m' },
    { moniNumber: 'MN10002', name: 'Amadou Sow', avatar: 'https://picsum.photos/seed/amadou/200', distance: '5m' },
    { moniNumber: 'MN10003', name: 'Aïssatou Ba', avatar: 'https://picsum.photos/seed/aissatou/200', distance: '8m' },
    { moniNumber: 'MN10004', name: 'Moussa Diallo', avatar: 'https://picsum.photos/seed/moussa/200', distance: '12m' },
  ];

  const handleOpenBluetooth = async () => {
    setIsScanning(true);
    setError('');

    try {
      // Vérifier si Bluetooth est disponible
      if (!navigator.bluetooth) {
        setError('Bluetooth n\'est pas disponible sur cet appareil');
        setIsScanning(false);
        return;
      }

      // Simulation de la recherche Bluetooth
      setTimeout(() => {
        setNearbyUsers(mockNearbyUsers);
        setIsScanning(false);
      }, 2000);
    } catch (err: any) {
      console.error('Erreur Bluetooth:', err);
      setError('Erreur lors de l\'activation du Bluetooth');
      setIsScanning(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-black/50 flex items-end z-50 rounded-[40px]">
      <div className="w-full bg-moni-card rounded-t-3xl p-6 max-h-[90%] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-moni-white font-montserrat">Utilisateurs à proximité</h2>
          <button onClick={onClose} className="text-moni-gray hover:text-moni-white">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {nearbyUsers.length === 0 ? (
          <>
            {/* Bluetooth Info */}
            <div className="bg-moni-bg rounded-2xl p-6 mb-6 border border-white/10 text-center">
              <i className="fas fa-bluetooth text-moni-accent text-4xl mb-4"></i>
              <h3 className="text-moni-white font-semibold text-lg mb-2">Activer le Bluetooth</h3>
              <p className="text-moni-gray text-xs mb-4">
                Découvrez les utilisateurs Moni à proximité et envoyez-leur de l'argent instantanément
              </p>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500 rounded-xl p-3 mb-4">
                <p className="text-red-200 text-xs">{error}</p>
              </div>
            )}

            <button
              onClick={handleOpenBluetooth}
              disabled={isScanning}
              className="w-full bg-moni-accent text-moni-bg py-3 rounded-xl font-semibold hover:bg-moni-accent/90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isScanning ? (
                <>
                  <i className="fas fa-spinner animate-spin"></i>
                  Recherche en cours...
                </>
              ) : (
                <>
                  <i className="fas fa-bluetooth"></i>
                  Ouvrir le Bluetooth
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="w-full bg-white/10 text-moni-white py-3 rounded-xl font-semibold hover:bg-white/20 transition-all mt-3"
            >
              Annuler
            </button>
          </>
        ) : (
          <>
            {/* Nearby Users List */}
            <div className="space-y-3 mb-6">
              {nearbyUsers.map((user) => (
                <button
                  key={user.moniNumber}
                  onClick={() => onUserSelected(user)}
                  className="w-full p-4 bg-moni-bg rounded-2xl border border-white/10 hover:border-moni-accent hover:bg-white/5 transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="text-left">
                      <h4 className="text-moni-white font-semibold text-sm">{user.name}</h4>
                      <p className="text-moni-gray text-xs font-mono">{user.moniNumber}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-moni-accent text-xs font-semibold">{user.distance}</p>
                    <i className="fas fa-chevron-right text-moni-gray text-xs mt-1"></i>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setNearbyUsers([]);
                setError('');
              }}
              className="w-full bg-white/10 text-moni-white py-3 rounded-xl font-semibold hover:bg-white/20 transition-all"
            >
              Nouvelle recherche
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default BluetoothUserSelector;
