import React, { useMemo, useState } from 'react';
import { CURRENCY_SYMBOLS } from '../types';
import { useCurrency } from '../App';
import { useAuth } from '../contexts/AuthContext';
import { performTransfer } from '../lib/transactionUtils';
import PinConfirmModal from './PinConfirmModal';

interface BillsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userBalance: number;
  onBillPaySuccess?: () => void;
}

type BillsStep = 'list' | 'detail' | 'processing' | 'success';
type ServiceId = 'canal' | 'snel' | 'internet' | 'regideso';
type CanalMode = 'renew-current' | 'resubscribe';

interface BillService {
  id: ServiceId;
  provider: string;
  subtitle: string;
  icon: string;
  color: string;
}

interface Offer {
  id: string;
  name: string;
  amount: number;
}

const services: BillService[] = [
  {
    id: 'canal',
    provider: 'Canal+',
    subtitle: 'Abonnement TV',
    icon: 'fas fa-tv',
    color: '#EF476F'
  },
  {
    id: 'snel',
    provider: 'SNEL',
    subtitle: 'Électricité',
    icon: 'fas fa-bolt',
    color: '#FFD166'
  },
  {
    id: 'internet',
    provider: 'Internet',
    subtitle: 'Canalbox, Starlink, Liquid',
    icon: 'fas fa-wifi',
    color: '#118AB2'
  },
  {
    id: 'regideso',
    provider: 'REGIDESO',
    subtitle: 'Eau prépayée',
    icon: 'fas fa-droplet',
    color: '#00F5D4'
  }
];

const canalOffers: Offer[] = [
  { id: 'access', name: 'Access', amount: 10 },
  { id: 'evasion', name: 'Évasion', amount: 20 },
  { id: 'essentiel', name: 'Essentiel', amount: 30 },
  { id: 'premium', name: 'Premium', amount: 50 }
];

const internetOffers: Record<string, Offer[]> = {
  Canalbox: [
    { id: 'canalbox-start', name: 'Start', amount: 25 },
    { id: 'canalbox-family', name: 'Family', amount: 45 },
    { id: 'canalbox-max', name: 'Max', amount: 70 }
  ],
  Starlink: [
    { id: 'starlink-residential', name: 'Residential', amount: 60 },
    { id: 'starlink-priority', name: 'Priority', amount: 100 },
    { id: 'starlink-business', name: 'Business', amount: 150 }
  ],
  Liquid: [
    { id: 'liquid-basic', name: 'Basic', amount: 40 },
    { id: 'liquid-plus', name: 'Plus', amount: 75 },
    { id: 'liquid-pro', name: 'Pro', amount: 120 }
  ]
};

const BillsModal: React.FC<BillsModalProps> = ({ isOpen, onClose, userBalance, onBillPaySuccess }) => {
  const { user } = useAuth();
  const { currency } = useCurrency();
  const symbol = CURRENCY_SYMBOLS[currency] || '$';
  const [step, setStep] = useState<BillsStep>('list');
  const [selectedService, setSelectedService] = useState<BillService | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPinConfirm, setShowPinConfirm] = useState(false);
  const [error, setError] = useState('');
  const [canalMode, setCanalMode] = useState<CanalMode>('renew-current');
  const [decoderNumber, setDecoderNumber] = useState('');
  const [customerNumber, setCustomerNumber] = useState('');
  const [internetProvider, setInternetProvider] = useState('Canalbox');
  const [customInternetProvider, setCustomInternetProvider] = useState('');
  const [selectedOfferId, setSelectedOfferId] = useState('');
  const [customOffer, setCustomOffer] = useState('');
  const [amount, setAmount] = useState('');

  const resetForm = () => {
    setCanalMode('renew-current');
    setDecoderNumber('');
    setCustomerNumber('');
    setInternetProvider('Canalbox');
    setCustomInternetProvider('');
    setSelectedOfferId('');
    setCustomOffer('');
    setAmount('');
    setError('');
    setIsProcessing(false);
    setShowPinConfirm(false);
  };

  const handleClose = () => {
    setStep('list');
    setSelectedService(null);
    resetForm();
    onClose();
  };

  const offers = useMemo(() => {
    if (selectedService?.id === 'canal') return canalOffers;
    if (selectedService?.id === 'internet') return internetOffers[internetProvider] || [];
    return [];
  }, [internetProvider, selectedService?.id]);

  const selectedOffer = offers.find((offer) => offer.id === selectedOfferId);
  const paymentAmount = selectedOffer?.amount || parseFloat(amount || '0');
  const providerName = selectedService?.id === 'internet'
    ? internetProvider === 'Autre'
      ? customInternetProvider
      : internetProvider
    : selectedService?.provider;

  if (!isOpen) return null;

  const openService = (service: BillService) => {
    setSelectedService(service);
    setSelectedOfferId('');
    setError('');
    setStep('detail');
  };

  const validatePayment = () => {
    setError('');

    if (!selectedService) {
      setError('Veuillez choisir un service.');
      return false;
    }

    if (!user?.uid) {
      setError('Utilisateur non authentifié.');
      return false;
    }

    if (selectedService.id === 'canal') {
      if (!decoderNumber.trim()) {
        setError('Veuillez saisir le numéro du décodeur.');
        return false;
      }
      if (!selectedOfferId) {
        setError('Veuillez choisir une offre.');
        return false;
      }
    }

    if (selectedService.id === 'snel' || selectedService.id === 'regideso') {
      if (!customerNumber.trim()) {
        setError('Veuillez saisir le numéro client.');
        return false;
      }
      if (!paymentAmount || paymentAmount <= 0) {
        setError('Veuillez saisir un montant valide.');
        return false;
      }
    }

    if (selectedService.id === 'internet') {
      if (internetProvider === 'Autre' && !customInternetProvider.trim()) {
        setError('Veuillez saisir le fournisseur.');
        return false;
      }
      if (internetProvider === 'Autre') {
        if (!customOffer.trim()) {
          setError('Veuillez saisir l’offre.');
          return false;
        }
        if (!paymentAmount || paymentAmount <= 0) {
          setError('Veuillez saisir un montant valide.');
          return false;
        }
      } else if (!selectedOfferId) {
        setError('Veuillez choisir une offre.');
        return false;
      }
    }

    if (paymentAmount > userBalance) {
      setError('Solde insuffisant.');
      return false;
    }

    return true;
  };

  const handlePayBill = () => {
    if (validatePayment()) {
      setShowPinConfirm(true);
    }
  };

  const executeBillPayment = async () => {
    if (!selectedService || !user?.uid) return;

    setShowPinConfirm(false);
    setIsProcessing(true);
    setStep('processing');

    try {
      await performTransfer(
        user.uid,
        null,
        paymentAmount,
        'bill',
        {
          title: `Paiement ${providerName}`,
          description: selectedOffer?.name || customOffer || selectedService.subtitle,
          icon: selectedService.icon,
          color: selectedService.color,
          reference: `BILL-${selectedService.id.toUpperCase()}-${Date.now()}`,
          metadata: {
            service: selectedService.id,
            provider: providerName,
            currency,
            canalMode: selectedService.id === 'canal' ? canalMode : undefined,
            decoderNumber: selectedService.id === 'canal' ? decoderNumber : undefined,
            customerNumber: selectedService.id === 'snel' || selectedService.id === 'regideso' ? customerNumber : undefined,
            offer: selectedOffer?.name || customOffer || undefined
          }
        }
      );

      setStep('success');
      setTimeout(() => {
        onBillPaySuccess?.();
        handleClose();
      }, 1800);
    } catch (err: any) {
      console.error('Bill payment error:', err);
      setError(err?.message || 'Erreur lors du paiement. Veuillez réessayer.');
      setStep('detail');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderOfferButtons = (items: Offer[]) => (
    <div className="grid grid-cols-2 gap-2">
      {items.map((offer) => (
        <button
          key={offer.id}
          onClick={() => {
            setSelectedOfferId(offer.id);
            setAmount(String(offer.amount));
            setError('');
          }}
          className={`p-3 rounded-xl border text-left transition-all ${
            selectedOfferId === offer.id
              ? 'bg-moni-accent/20 border-moni-accent'
              : 'bg-moni-bg border-white/10 hover:border-moni-accent/50'
          }`}
          type="button"
        >
          <p className="text-moni-white text-sm font-semibold">{offer.name}</p>
          <p className="text-moni-gray text-xs">{symbol}{offer.amount.toFixed(2)}</p>
        </button>
      ))}
    </div>
  );

  return (
    <div className="absolute inset-0 bg-black/50 flex items-end z-50 rounded-[40px]">
      <div className="w-full bg-moni-card rounded-t-3xl p-6 max-h-[90%] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-moni-white font-montserrat">Factures</h2>
          <button onClick={handleClose} className="text-moni-gray hover:text-moni-white" type="button">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {step === 'list' && (
          <>
            <div className="space-y-3 mb-6">
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => openService(service)}
                  className="w-full p-4 rounded-2xl border bg-moni-bg border-white/10 hover:border-moni-accent hover:bg-white/5 transition-all flex items-center justify-between"
                  type="button"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-lg" style={{ color: service.color }}>
                      <i className={service.icon}></i>
                    </div>
                    <div className="text-left">
                      <h4 className="text-moni-white font-semibold text-sm">{service.provider}</h4>
                      <p className="text-moni-gray text-xs">{service.subtitle}</p>
                    </div>
                  </div>
                  <i className="fas fa-chevron-right text-moni-gray"></i>
                </button>
              ))}
            </div>

            <button
              onClick={handleClose}
              className="w-full bg-white/10 text-moni-white py-3 rounded-xl font-semibold hover:bg-white/20 transition-all"
              type="button"
            >
              Fermer
            </button>
          </>
        )}

        {step === 'detail' && selectedService && (
          <>
            <div className="bg-moni-bg rounded-2xl p-5 mb-5 border border-white/10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-xl" style={{ color: selectedService.color }}>
                  <i className={selectedService.icon}></i>
                </div>
                <div>
                  <h3 className="text-moni-white font-bold text-lg">{selectedService.provider}</h3>
                  <p className="text-moni-gray text-xs">{selectedService.subtitle}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              {selectedService.id === 'canal' && (
                <>
                  <div>
                    <label className="text-moni-gray text-xs font-semibold mb-2 block">Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'renew-current', label: 'Reconduire' },
                        { id: 'resubscribe', label: 'Se réabonner' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setCanalMode(item.id as CanalMode)}
                          className={`p-3 rounded-xl border text-sm font-semibold transition-all ${
                            canalMode === item.id
                              ? 'bg-moni-accent text-moni-bg border-moni-accent'
                              : 'bg-moni-bg text-moni-white border-white/10'
                          }`}
                          type="button"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-moni-gray text-xs font-semibold mb-2 block">Numéro décodeur</label>
                    <input
                      value={decoderNumber}
                      onChange={(event) => {
                        setDecoderNumber(event.target.value.replace(/\D/g, ''));
                        setError('');
                      }}
                      placeholder="Numéro du décodeur"
                      inputMode="numeric"
                      className="w-full bg-moni-bg border border-white/10 rounded-xl px-4 py-3 text-moni-white placeholder-moni-gray focus:outline-none focus:border-moni-accent"
                    />
                  </div>

                  <div>
                    <label className="text-moni-gray text-xs font-semibold mb-2 block">Offre</label>
                    {renderOfferButtons(canalOffers)}
                  </div>
                </>
              )}

              {(selectedService.id === 'snel' || selectedService.id === 'regideso') && (
                <>
                  <div>
                    <label className="text-moni-gray text-xs font-semibold mb-2 block">Numéro client</label>
                    <input
                      value={customerNumber}
                      onChange={(event) => {
                        setCustomerNumber(event.target.value.replace(/\D/g, ''));
                        setError('');
                      }}
                      placeholder="Numéro client"
                      inputMode="numeric"
                      className="w-full bg-moni-bg border border-white/10 rounded-xl px-4 py-3 text-moni-white placeholder-moni-gray focus:outline-none focus:border-moni-accent"
                    />
                  </div>

                  <div>
                    <label className="text-moni-gray text-xs font-semibold mb-2 block">Montant</label>
                    <div className="relative">
                      <span className="absolute left-4 top-3 text-moni-white text-lg">{symbol}</span>
                      <input
                        type="number"
                        value={amount}
                        onChange={(event) => {
                          setAmount(event.target.value);
                          setError('');
                        }}
                        placeholder="0.00"
                        className="w-full bg-moni-bg border border-white/10 rounded-xl pl-10 pr-4 py-3 text-moni-white placeholder-moni-gray focus:outline-none focus:border-moni-accent text-lg"
                      />
                    </div>
                  </div>
                </>
              )}

              {selectedService.id === 'internet' && (
                <>
                  <div>
                    <label className="text-moni-gray text-xs font-semibold mb-2 block">Fournisseur</label>
                    <select
                      value={internetProvider}
                      onChange={(event) => {
                        setInternetProvider(event.target.value);
                        setSelectedOfferId('');
                        setAmount('');
                        setError('');
                      }}
                      className="w-full bg-moni-bg border border-white/10 rounded-xl px-4 py-3 text-moni-white focus:outline-none focus:border-moni-accent"
                    >
                      <option value="Canalbox">Canalbox</option>
                      <option value="Starlink">Starlink</option>
                      <option value="Liquid">Liquid</option>
                      <option value="Autre">Autre opérateur</option>
                    </select>
                  </div>

                  {internetProvider === 'Autre' ? (
                    <>
                      <div>
                        <label className="text-moni-gray text-xs font-semibold mb-2 block">Nom du fournisseur</label>
                        <input
                          value={customInternetProvider}
                          onChange={(event) => {
                            setCustomInternetProvider(event.target.value);
                            setError('');
                          }}
                          placeholder="Fournisseur internet"
                          className="w-full bg-moni-bg border border-white/10 rounded-xl px-4 py-3 text-moni-white placeholder-moni-gray focus:outline-none focus:border-moni-accent"
                        />
                      </div>
                      <div>
                        <label className="text-moni-gray text-xs font-semibold mb-2 block">Offre</label>
                        <input
                          value={customOffer}
                          onChange={(event) => {
                            setCustomOffer(event.target.value);
                            setError('');
                          }}
                          placeholder="Nom de l’offre"
                          className="w-full bg-moni-bg border border-white/10 rounded-xl px-4 py-3 text-moni-white placeholder-moni-gray focus:outline-none focus:border-moni-accent"
                        />
                      </div>
                      <div>
                        <label className="text-moni-gray text-xs font-semibold mb-2 block">Montant</label>
                        <div className="relative">
                          <span className="absolute left-4 top-3 text-moni-white text-lg">{symbol}</span>
                          <input
                            type="number"
                            value={amount}
                            onChange={(event) => {
                              setAmount(event.target.value);
                              setError('');
                            }}
                            placeholder="0.00"
                            className="w-full bg-moni-bg border border-white/10 rounded-xl pl-10 pr-4 py-3 text-moni-white placeholder-moni-gray focus:outline-none focus:border-moni-accent text-lg"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="text-moni-gray text-xs font-semibold mb-2 block">Offre</label>
                      {renderOfferButtons(offers)}
                    </div>
                  )}
                </>
              )}
            </div>

            {paymentAmount > 0 && (
              <div className="bg-moni-bg rounded-2xl p-4 mb-5 border border-white/10">
                <div className="flex justify-between text-sm">
                  <span className="text-moni-gray">À payer</span>
                  <span className="text-moni-white font-bold">{symbol}{paymentAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs mt-2">
                  <span className="text-moni-gray">Solde</span>
                  <span className="text-moni-white">{symbol}{userBalance.toFixed(2)}</span>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-500/20 border border-red-500 rounded-xl p-3 mb-4">
                <p className="text-red-200 text-xs">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStep('list');
                  setSelectedService(null);
                  resetForm();
                }}
                className="flex-1 p-3 bg-moni-bg border border-white/10 rounded-xl text-moni-white font-semibold hover:bg-white/5 transition-all"
                type="button"
              >
                Retour
              </button>
              <button
                onClick={handlePayBill}
                disabled={isProcessing}
                className="flex-1 p-3 bg-moni-accent text-moni-bg rounded-xl font-semibold hover:bg-moni-accent/90 transition-all disabled:opacity-50"
                type="button"
              >
                Payer
              </button>
            </div>
          </>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-moni-accent/20 flex items-center justify-center mb-4 animate-pulse">
              <i className="fas fa-spinner text-moni-accent text-2xl animate-spin"></i>
            </div>
            <h3 className="text-moni-white font-semibold text-lg mb-2">Paiement en cours</h3>
            <p className="text-moni-gray text-xs text-center">Veuillez patienter...</p>
          </div>
        )}

        {step === 'success' && selectedService && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-moni-accent/20 flex items-center justify-center mb-4">
              <i className="fas fa-check text-moni-accent text-2xl"></i>
            </div>
            <h3 className="text-moni-white font-semibold text-lg mb-2">Paiement confirmé</h3>
            <p className="text-moni-gray text-xs text-center mb-4">
              {symbol}{paymentAmount.toFixed(2)} payés à {providerName}
            </p>
            <button
              onClick={handleClose}
              className="w-full bg-moni-accent text-moni-bg py-3 rounded-xl font-semibold hover:bg-moni-accent/90 transition-all"
              type="button"
            >
              Fermer
            </button>
          </div>
        )}
      </div>

      <PinConfirmModal
        isOpen={showPinConfirm}
        onClose={() => setShowPinConfirm(false)}
        onConfirmed={executeBillPayment}
        title="Confirmer le paiement"
        description={providerName ? `Paiement ${providerName}` : 'Paiement de facture'}
        amountLabel={paymentAmount ? `${symbol}${paymentAmount.toFixed(2)}` : undefined}
        confirmLabel="Payer"
      />
    </div>
  );
};

export default BillsModal;
