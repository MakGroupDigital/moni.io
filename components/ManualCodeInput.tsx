import React, { useState } from 'react';

interface ManualCodeInputProps {
  onSubmit: (code: string) => void;
  onClose: () => void;
  title?: string;
  placeholder?: string;
}

const ManualCodeInput: React.FC<ManualCodeInputProps> = ({ 
  onSubmit, 
  onClose, 
  title = 'Entrer le code',
  placeholder = 'Entrez le code QR...'
}) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (code.trim()) {
      onSubmit(code);
      setCode('');
    } else {
      setError('Veuillez entrer un code');
    }
  };

  return (
    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50 rounded-[40px] overflow-hidden">
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={onClose}
          className="w-10 h-10 bg-moni-accent rounded-full flex items-center justify-center text-moni-bg hover:bg-moni-accent/90 transition-all active:scale-95"
          type="button"
        >
          <i className="fas fa-times text-lg"></i>
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center w-full">
        <div className="w-full max-w-xs px-4">
          <div className="text-center mb-6">
            <i className="fas fa-qrcode text-moni-accent text-5xl mb-4"></i>
            <h3 className="text-moni-white font-semibold text-lg">{title}</h3>
            <p className="text-moni-gray text-xs mt-2">Collez ou tapez le code</p>
          </div>

          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError('');
            }}
            placeholder={placeholder}
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-moni-white placeholder-moni-gray focus:outline-none focus:border-moni-accent mb-4"
            autoFocus
          />

          <button
            onClick={handleSubmit}
            className="w-full bg-moni-accent text-moni-bg py-3 rounded-xl font-semibold hover:bg-moni-accent/90 transition-all active:scale-95 mb-3"
          >
            Valider
          </button>

          <button
            onClick={onClose}
            className="w-full bg-white/10 text-moni-white py-3 rounded-xl font-semibold hover:bg-white/20 transition-all"
          >
            Annuler
          </button>
        </div>
      </div>

      {error && (
        <div className="absolute bottom-20 left-4 right-4 bg-red-500/20 border border-red-500 rounded-xl p-3 z-10">
          <p className="text-red-200 text-xs text-center">{error}</p>
        </div>
      )}
    </div>
  );
};

export default ManualCodeInput;
