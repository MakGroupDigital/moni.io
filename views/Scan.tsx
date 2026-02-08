
import React, { useState } from 'react';
import PaymentQRScanner from '../components/PaymentQRScanner';
import ManualCodeInput from '../components/ManualCodeInput';

const Scan: React.FC = () => {
  const [showCamera, setShowCamera] = useState(false);
  const [showManualCode, setShowManualCode] = useState(false);
  const [scannedCode, setScannedCode] = useState('');

  const handleQRScan = (result: string) => {
    setScannedCode(result);
    setShowCamera(false);
  };

  const handleManualCode = (code: string) => {
    setScannedCode(code);
    setShowManualCode(false);
  };

  if (showCamera) {
    return <PaymentQRScanner onScan={handleQRScan} onClose={() => setShowCamera(false)} />;
  }

  if (showManualCode) {
    return <ManualCodeInput onSubmit={handleManualCode} onClose={() => setShowManualCode(false)} title="Entrer le code du marchand" placeholder="Entrez le code QR du marchand..." />;
  }

  return (
    <div className="h-full flex flex-col bg-black/40">
      <header className="p-5 flex justify-between items-center bg-moni-bg">
         <h1 className="text-xl font-bold text-moni-white font-montserrat">Scanner</h1>
         <div className="flex items-center gap-3">
           <img src="/onelogo.png" alt="Moni.io" className="h-8 w-auto" />
           <i className="fas fa-bolt text-moni-gray"></i>
         </div>
      </header>

      <div className="flex-1 relative flex items-center justify-center">
        {/* Camera Preview or Placeholder */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/20 flex flex-col items-center justify-center p-10">
          <div className="w-full aspect-square border-2 border-moni-accent/30 rounded-3xl relative">
             {/* Corner Markers */}
             <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-moni-accent rounded-tl-xl"></div>
             <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-moni-accent rounded-tr-xl"></div>
             <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-moni-accent rounded-bl-xl"></div>
             <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-moni-accent rounded-br-xl"></div>
             
             {/* Scanning Line Animation */}
             <div className="absolute top-0 left-0 w-full h-0.5 bg-moni-accent/60 shadow-[0_0_15px_#00F5D4] animate-[scan_3s_ease-in-out_infinite]"></div>
          </div>
          
          <p className="mt-8 text-white text-center text-xs font-medium bg-black/40 px-6 py-2 rounded-full backdrop-blur-sm">
            {scannedCode ? `Code scanné: ${scannedCode}` : 'Placez le QR Code du marchand dans le cadre'}
          </p>
        </div>
      </div>

      <div className="p-10 bg-moni-bg flex justify-center gap-10">
         <div 
           onClick={() => setShowCamera(true)}
           className="flex flex-col items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
         >
            <div className="w-14 h-14 rounded-full bg-moni-card flex items-center justify-center text-xl text-moni-white">
               <i className="fas fa-camera"></i>
            </div>
            <span className="text-[10px] text-moni-gray">Caméra</span>
         </div>
         <div 
           onClick={() => setShowManualCode(true)}
           className="flex flex-col items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
         >
            <div className="w-14 h-14 rounded-full bg-moni-accent flex items-center justify-center text-xl text-moni-bg shadow-lg shadow-moni-accent/20">
               <i className="fas fa-keyboard"></i>
            </div>
            <span className="text-[10px] text-moni-accent font-bold">Code</span>
         </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default Scan;
