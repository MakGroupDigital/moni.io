import React, { useEffect, useRef, useState } from 'react';

interface QRScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

type ScannerMode = 'camera' | 'manual';

const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string>('');
  const [isScanning, setIsScanning] = useState(true);
  const [mode, setMode] = useState<ScannerMode>('camera');
  const [manualCode, setManualCode] = useState('');
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (mode !== 'camera') return;

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setError('Votre navigateur ne supporte pas l\'accès à la caméra.');
          setIsScanning(false);
          return;
        }

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { 
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            audio: false
          });
        } catch (err) {
          console.log('Tentative sans contrainte de caméra...');
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false
          });
        }
        
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log('Vidéo en cours de lecture');
                scanQRCode();
              })
              .catch((err: Error) => {
                console.error('Erreur lors du démarrage de la vidéo:', err);
                setError('Erreur lors du démarrage de la caméra.');
                setIsScanning(false);
              });
          }
        }
      } catch (err: any) {
        console.error('Erreur caméra complète:', err);
        let errorMsg = 'Impossible d\'accéder à la caméra.';
        
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMsg = 'Permission caméra refusée. Allez dans les paramètres pour autoriser.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorMsg = 'Aucune caméra trouvée sur cet appareil.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          errorMsg = 'La caméra est utilisée par une autre application.';
        } else if (err.name === 'TypeError') {
          errorMsg = 'Erreur de configuration de la caméra.';
        }
        
        setError(errorMsg);
        setIsScanning(false);
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        const tracks = streamRef.current.getTracks();
        tracks.forEach((track: MediaStreamTrack) => {
          track.stop();
        });
      }
      setIsScanning(false);
    };
  }, [mode]);

  const scanQRCode = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (!canvas || !video) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const scan = () => {
      try {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          let darkPixels = 0;
          for (let i = 0; i < data.length; i += 4) {
            const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
            if (brightness < 128) darkPixels++;
          }

          if (darkPixels > data.length / 8) {
            const mockQRData = `agent_${Math.random().toString(36).substring(2, 11)}`;
            onScan(mockQRData);
            setIsScanning(false);
            return;
          }
        }
      } catch (err) {
        console.error('Erreur lors du scan:', err);
      }

      if (isScanning) {
        requestAnimationFrame(scan);
      }
    };

    scan();
  };

  const closeScanner = () => {
    setIsScanning(false);
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      tracks.forEach((track: MediaStreamTrack) => {
        track.stop();
      });
    }
    onClose();
  };

  return (
    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50 rounded-[40px] overflow-hidden">
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={closeScanner}
          className="w-10 h-10 bg-moni-accent rounded-full flex items-center justify-center text-moni-bg hover:bg-moni-accent/90 transition-all active:scale-95"
          type="button"
        >
          <i className="fas fa-times text-lg"></i>
        </button>
      </div>

      {/* Mode Selector */}
      <div className="absolute top-16 left-4 right-4 flex gap-2 z-10">
        <button
          onClick={() => {
            setMode('camera');
            setError('');
            setManualCode('');
          }}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
            mode === 'camera'
              ? 'bg-moni-accent text-moni-bg'
              : 'bg-white/10 text-moni-white hover:bg-white/20'
          }`}
        >
          <i className="fas fa-camera mr-1"></i> Caméra
        </button>
        <button
          onClick={() => {
            setMode('manual');
            setError('');
          }}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
            mode === 'manual'
              ? 'bg-moni-accent text-moni-bg'
              : 'bg-white/10 text-moni-white hover:bg-white/20'
          }`}
        >
          <i className="fas fa-keyboard mr-1"></i> Code
        </button>
      </div>

      {mode === 'camera' ? (
        <>
          <div className="flex-1 flex items-center justify-center w-full relative">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              autoPlay
              muted
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* QR Frame Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-64 border-4 border-moni-accent rounded-3xl relative">
                {/* Corner Markers */}
                <div className="absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 border-moni-accent rounded-tl-lg"></div>
                <div className="absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 border-moni-accent rounded-tr-lg"></div>
                <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 border-moni-accent rounded-bl-lg"></div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 border-moni-accent rounded-br-lg"></div>

                {/* Scanning Line */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-b from-moni-accent to-transparent shadow-[0_0_20px_#00F5D4] animate-[scan_2s_ease-in-out_infinite]"></div>
              </div>
            </div>
          </div>

          {error && (
            <div className="absolute bottom-20 left-4 right-4 bg-red-500/20 border border-red-500 rounded-xl p-4 z-10">
              <p className="text-red-200 text-xs text-center mb-3">{error}</p>
              <button
                onClick={closeScanner}
                className="w-full px-4 py-2 bg-red-500/30 hover:bg-red-500/50 text-red-200 rounded-lg text-xs font-semibold transition-all"
              >
                Fermer
              </button>
            </div>
          )}

          {!error && (
            <div className="absolute bottom-4 left-4 right-4 text-center z-10">
              <p className="text-moni-gray text-xs">Placez le QR Code dans le cadre</p>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex-1 flex items-center justify-center w-full">
            <div className="w-full max-w-xs px-4">
              <div className="text-center mb-6">
                <i className="fas fa-qrcode text-moni-accent text-5xl mb-4"></i>
                <h3 className="text-moni-white font-semibold text-lg">Entrer le code</h3>
                <p className="text-moni-gray text-xs mt-2">Collez ou tapez le code QR</p>
              </div>

              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Entrez le code QR..."
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-moni-white placeholder-moni-gray focus:outline-none focus:border-moni-accent mb-4"
                autoFocus
              />

              <button
                onClick={() => {
                  if (manualCode.trim()) {
                    onScan(manualCode);
                    setIsScanning(false);
                  } else {
                    setError('Veuillez entrer un code');
                  }
                }}
                className="w-full bg-moni-accent text-moni-bg py-3 rounded-xl font-semibold hover:bg-moni-accent/90 transition-all active:scale-95"
              >
                Valider
              </button>
            </div>
          </div>

          {error && (
            <div className="absolute bottom-20 left-4 right-4 bg-red-500/20 border border-red-500 rounded-xl p-3 z-10">
              <p className="text-red-200 text-xs text-center">{error}</p>
            </div>
          )}
        </>
      )}

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

export default QRScanner;
