import React, { useState, useEffect } from 'react';
import { P2PRequest } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { createP2PRequest, performTransfer, getReceivedP2PRequests } from '../lib/transactionUtils';
import { useNotificationContext } from '../contexts/NotificationContext';

interface P2PModalProps {
  isOpen: boolean;
  onClose: () => void;
  userBalance: number;
  onP2PSuccess?: () => void;
}

type P2PStep = 'method' | 'request' | 'send' | 'processing' | 'success' | 'all-requests' | 'pay-request';

const P2PModal: React.FC<P2PModalProps> = ({ isOpen, onClose, userBalance, onP2PSuccess }) => {
  const { user } = useAuth();
  const { success, error } = useNotificationContext();
  const [step, setStep] = useState<P2PStep>('method');
  const [method, setMethod] = useState<'request' | 'send' | null>(null);
  const [recipientNumber, setRecipientNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [requests, setRequests] = useState<P2PRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<P2PRequest | null>(null);

  // Charger les demandes P2P reçues quand le modal s'ouvre
  useEffect(() => {
    if (isOpen && user?.uid) {
      loadRequests();
    }
  }, [isOpen, user?.uid]);

  const loadRequests = async () => {
    setLoadingRequests(true);
    try {
      const receivedRequests = await getReceivedP2PRequests(user!.uid);
      console.log('Received P2P requests:', receivedRequests);
      setRequests(receivedRequests as P2PRequest[]);
    } catch (err) {
      console.error('Error loading P2P requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  if (!isOpen) return null;

  const handleClose = () => {
    setStep('method');
    setMethod(null);
    setRecipientNumber('');
    setAmount('');
    setMessage('');
    setErrorMsg('');
    setIsProcessing(false);
    onClose();
  };

  const handleSendRequest = async () => {
    setErrorMsg('');

    if (!recipientNumber.trim()) {
      setErrorMsg('Veuillez entrer un numéro Moni');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setErrorMsg('Veuillez entrer un montant valide');
      return;
    }

    if (!user?.uid) {
      setErrorMsg('Utilisateur non authentifié');
      return;
    }

    setIsProcessing(true);
    setStep('processing');

    try {
      await createP2PRequest(
        user.uid,
        recipientNumber,
        parseFloat(amount),
        message || undefined
      );

      success('Demande envoyée', `Demande de ${amount}$ envoyée à ${recipientNumber}`);

      setStep('success');
      setTimeout(() => {
        onP2PSuccess?.();
        handleClose();
      }, 2000);
    } catch (err: any) {
      error('Erreur', err?.message || 'Erreur lors de l\'envoi. Veuillez réessayer.');
      setStep('request');
      console.error('P2P send error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    const request = requests.find(r => r.id === requestId);
    if (!request) return;

    if (request.amount > userBalance) {
      setErrorMsg('Solde insuffisant');
      return;
    }

    if (!user?.uid) {
      setErrorMsg('Utilisateur non authentifié');
      return;
    }

    setIsProcessing(true);
    setStep('processing');

    try {
      await performTransfer(
        user.uid,
        request.senderMoniNumber || request.senderId,
        request.amount,
        'p2p-send',
        {
          title: 'Demande P2P acceptée',
          description: `À ${request.senderName}`,
          icon: 'fas fa-check-circle',
          color: '#00F5D4',
          recipientName: request.senderName,
          recipientMoniNumber: request.senderMoniNumber || request.senderId,
          senderName: user.displayName || 'Utilisateur',
          senderMoniNumber: user.moniNumber,
          message: request.message || undefined,
          reference: `P2P-ACC-${Date.now()}`
        }
      );

      setRequests(requests.map(r => 
        r.id === requestId ? { ...r, status: 'accepted' as const } : r
      ));
      setStep('success');
      setTimeout(() => {
        onP2PSuccess?.();
        handleClose();
      }, 2000);
    } catch (err) {
      setErrorMsg('Erreur lors de l\'acceptation. Veuillez réessayer.');
      setStep('request');
      console.error('P2P accept error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectRequest = (requestId: string) => {
    setRequests(requests.map(r => 
      r.id === requestId ? { ...r, status: 'rejected' as const } : r
    ));
  };

  const handlePayRequest = async (request: P2PRequest) => {
    console.log('Paying request:', request);
    
    if (request.amount > userBalance) {
      setErrorMsg('Solde insuffisant');
      return;
    }

    if (!user?.uid) {
      setErrorMsg('Utilisateur non authentifié');
      return;
    }

    setIsProcessing(true);
    setStep('processing');

    try {
      const recipientMoniNumber = request.senderMoniNumber || request.senderId;
      console.log('Transferring to:', recipientMoniNumber);
      
      await performTransfer(
        user.uid,
        recipientMoniNumber,
        request.amount,
        'p2p-send',
        {
          title: 'Demande P2P acceptée',
          description: `À ${request.senderName}`,
          icon: 'fas fa-check-circle',
          color: '#00F5D4',
          recipientName: request.senderName,
          recipientMoniNumber: recipientMoniNumber,
          senderName: user.displayName || 'Utilisateur',
          senderMoniNumber: user.moniNumber,
          message: request.message || undefined,
          reference: `P2P-ACC-${Date.now()}`
        }
      );

      success('Paiement effectué', `Paiement de ${request.amount}$ envoyé à ${request.senderName}`);
      setStep('success');
      setTimeout(() => {
        onP2PSuccess?.();
        handleClose();
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erreur lors du paiement. Veuillez réessayer.');
      setStep('all-requests');
      console.error('P2P payment error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-black/50 flex items-end z-50 rounded-[40px]">
      <div className="w-full bg-moni-card rounded-t-3xl p-6 max-h-[90%] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-moni-white font-montserrat">P2P</h2>
          <button onClick={handleClose} className="text-moni-gray hover:text-moni-white">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {step === 'method' && (
          <>
            <div className="space-y-3 mb-6">
              <button
                onClick={() => {
                  setMethod('request');
                  setStep('request');
                }}
                className="w-full p-4 bg-moni-bg rounded-2xl border border-white/10 hover:border-moni-accent hover:bg-white/5 transition-all flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-moni-accent/20 rounded-xl flex items-center justify-center text-moni-accent">
                  <i className="fas fa-hand-holding-heart text-lg"></i>
                </div>
                <div className="text-left flex-1">
                  <h3 className="text-moni-white font-semibold text-sm">Demander de l'argent</h3>
                  <p className="text-moni-gray text-xs">Envoyer une demande de paiement</p>
                </div>
                <i className="fas fa-chevron-right text-moni-gray"></i>
              </button>

              <button
                onClick={() => {
                  setMethod('send');
                  setStep('send');
                }}
                className="w-full p-4 bg-moni-bg rounded-2xl border border-white/10 hover:border-moni-accent hover:bg-white/5 transition-all flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-moni-accent/20 rounded-xl flex items-center justify-center text-moni-accent">
                  <i className="fas fa-arrow-right text-lg"></i>
                </div>
                <div className="text-left flex-1">
                  <h3 className="text-moni-white font-semibold text-sm">Envoyer de l'argent</h3>
                  <p className="text-moni-gray text-xs">Payer directement un utilisateur</p>
                </div>
                <i className="fas fa-chevron-right text-moni-gray"></i>
              </button>

              {requests.filter(r => r.status === 'pending').length > 0 && (
                <button
                  onClick={() => setStep('request')}
                  className="w-full p-4 bg-moni-accent/20 rounded-2xl border border-moni-accent/50 hover:bg-moni-accent/30 transition-all flex items-center gap-4"
                >
                  <div className="w-12 h-12 bg-moni-accent/40 rounded-xl flex items-center justify-center text-moni-accent">
                    <i className="fas fa-bell text-lg"></i>
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="text-moni-white font-semibold text-sm">Demandes reçues</h3>
                    <p className="text-moni-gray text-xs">{requests.filter(r => r.status === 'pending').length} demande(s) en attente</p>
                  </div>
                  <i className="fas fa-chevron-right text-moni-gray"></i>
                </button>
              )}

              <button
                onClick={() => setStep('all-requests')}
                className="w-full p-4 bg-moni-bg rounded-2xl border border-white/10 hover:border-moni-accent hover:bg-white/5 transition-all flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-moni-accent/20 rounded-xl flex items-center justify-center text-moni-accent">
                  <i className="fas fa-list text-lg"></i>
                </div>
                <div className="text-left flex-1">
                  <h3 className="text-moni-white font-semibold text-sm">Voir toutes les demandes</h3>
                  <p className="text-moni-gray text-xs">Afficher toutes les demandes reçues</p>
                </div>
                <i className="fas fa-chevron-right text-moni-gray"></i>
              </button>
            </div>

            <button
              onClick={handleClose}
              className="w-full bg-white/10 text-moni-white py-3 rounded-xl font-semibold hover:bg-white/20 transition-all"
            >
              Annuler
            </button>
          </>
        )}

        {step === 'request' && method === 'request' && (
          <>
            <div className="mb-4">
              <label className="text-moni-gray text-xs font-semibold mb-2 block">Numéro Moni du destinataire</label>
              <input
                type="text"
                value={recipientNumber}
                onChange={(e) => {
                  setRecipientNumber(e.target.value.toUpperCase());
                  setErrorMsg('');
                }}
                placeholder="MN1000..."
                className="w-full bg-moni-bg border border-white/10 rounded-xl px-4 py-3 text-moni-white placeholder-moni-gray focus:outline-none focus:border-moni-accent font-mono"
              />
            </div>

            <div className="mb-4">
              <label className="text-moni-gray text-xs font-semibold mb-2 block">Montant</label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-moni-white text-lg">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="0.00"
                  className="w-full bg-moni-bg border border-white/10 rounded-xl pl-8 pr-4 py-3 text-moni-white placeholder-moni-gray focus:outline-none focus:border-moni-accent text-lg"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="text-moni-gray text-xs font-semibold mb-2 block">Message (optionnel)</label>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ajouter un message..."
                className="w-full bg-moni-bg border border-white/10 rounded-xl px-4 py-3 text-moni-white placeholder-moni-gray focus:outline-none focus:border-moni-accent"
              />
            </div>

            {errorMsg && (
              <div className="bg-red-500/20 border border-red-500 rounded-xl p-3 mb-4">
                <p className="text-red-200 text-xs">{errorMsg}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep('method')}
                className="flex-1 p-3 bg-moni-bg border border-white/10 rounded-xl text-moni-white font-semibold hover:bg-white/5 transition-all"
              >
                Retour
              </button>
              <button
                onClick={handleSendRequest}
                disabled={isProcessing}
                className="flex-1 p-3 bg-moni-accent text-moni-bg rounded-xl font-semibold hover:bg-moni-accent/90 transition-all active:scale-95 disabled:opacity-50"
              >
                {isProcessing ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
          </>
        )}

        {step === 'send' && method === 'send' && (
          <>
            <div className="mb-4">
              <label className="text-moni-gray text-xs font-semibold mb-2 block">Numéro Moni du destinataire</label>
              <input
                type="text"
                value={recipientNumber}
                onChange={(e) => {
                  setRecipientNumber(e.target.value.toUpperCase());
                  setErrorMsg('');
                }}
                placeholder="MN1000..."
                className="w-full bg-moni-bg border border-white/10 rounded-xl px-4 py-3 text-moni-white placeholder-moni-gray focus:outline-none focus:border-moni-accent font-mono"
              />
            </div>

            <div className="mb-4">
              <label className="text-moni-gray text-xs font-semibold mb-2 block">Montant</label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-moni-white text-lg">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="0.00"
                  className="w-full bg-moni-bg border border-white/10 rounded-xl pl-8 pr-4 py-3 text-moni-white placeholder-moni-gray focus:outline-none focus:border-moni-accent text-lg"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="text-moni-gray text-xs font-semibold mb-2 block">Message (optionnel)</label>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ajouter un message..."
                className="w-full bg-moni-bg border border-white/10 rounded-xl px-4 py-3 text-moni-white placeholder-moni-gray focus:outline-none focus:border-moni-accent"
              />
            </div>

            <div className="bg-moni-bg rounded-2xl p-4 mb-6 border border-white/10">
              <div className="flex justify-between mb-2">
                <span className="text-moni-gray text-xs">Solde disponible</span>
                <span className="text-moni-white font-semibold text-xs">${userBalance.toLocaleString()}</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div
                  className="bg-moni-accent rounded-full h-2 transition-all"
                  style={{ width: `${Math.min((parseFloat(amount || '0') / userBalance) * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            {errorMsg && (
              <div className="bg-red-500/20 border border-red-500 rounded-xl p-3 mb-4">
                <p className="text-red-200 text-xs">{errorMsg}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStep('method');
                  setMethod(null);
                  setRecipientNumber('');
                  setAmount('');
                  setMessage('');
                }}
                className="flex-1 p-3 bg-moni-bg border border-white/10 rounded-xl text-moni-white font-semibold hover:bg-white/5 transition-all"
              >
                Retour
              </button>
              <button
                onClick={handleSendRequest}
                disabled={isProcessing}
                className="flex-1 p-3 bg-moni-accent text-moni-bg rounded-xl font-semibold hover:bg-moni-accent/90 transition-all active:scale-95 disabled:opacity-50"
              >
                {isProcessing ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
          </>
        )}

        {step === 'request' && method === 'send' && (
          <>
            <div className="space-y-3 mb-6">
              {loadingRequests ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 rounded-full bg-moni-accent/20 flex items-center justify-center animate-pulse">
                    <i className="fas fa-spinner text-moni-accent text-lg animate-spin"></i>
                  </div>
                </div>
              ) : requests.filter(r => r.status === 'pending').length === 0 ? (
                <div className="bg-moni-bg rounded-2xl p-6 border border-white/10 text-center">
                  <i className="fas fa-inbox text-moni-gray text-3xl mb-3 block"></i>
                  <p className="text-moni-gray text-sm">Aucune demande en attente</p>
                </div>
              ) : (
                requests.filter(r => r.status === 'pending').map((req) => (
                  <div key={req.id} className="bg-moni-bg rounded-2xl p-4 border border-white/10">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="text-moni-white font-semibold text-sm">{req.senderName}</h4>
                        <p className="text-moni-gray text-xs font-mono">{req.senderId}</p>
                      </div>
                      <p className="text-moni-accent font-bold text-lg">${req.amount.toLocaleString()}</p>
                    </div>
                    {req.message && (
                      <p className="text-moni-gray text-xs mb-3 italic">"{req.message}"</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRejectRequest(req.id)}
                        className="flex-1 p-2 bg-red-500/20 text-red-200 rounded-lg text-xs font-semibold hover:bg-red-500/30 transition-all"
                      >
                        Refuser
                      </button>
                      <button
                        onClick={() => handleAcceptRequest(req.id)}
                        className="flex-1 p-2 bg-moni-accent text-moni-bg rounded-lg text-xs font-semibold hover:bg-moni-accent/90 transition-all"
                      >
                        Accepter
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setStep('method')}
              className="w-full bg-white/10 text-moni-white py-3 rounded-xl font-semibold hover:bg-white/20 transition-all"
            >
              Retour
            </button>
          </>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-moni-accent/20 flex items-center justify-center mb-4 animate-pulse">
              <i className="fas fa-spinner text-moni-accent text-2xl animate-spin"></i>
            </div>
            <h3 className="text-moni-white font-semibold text-lg mb-2">Traitement en cours</h3>
            <p className="text-moni-gray text-xs text-center">Veuillez patienter...</p>
          </div>
        )}

        {step === 'all-requests' && (
          <>
            <div className="space-y-3 mb-6">
              {loadingRequests ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 rounded-full bg-moni-accent/20 flex items-center justify-center animate-pulse">
                    <i className="fas fa-spinner text-moni-accent text-lg animate-spin"></i>
                  </div>
                </div>
              ) : requests.length === 0 ? (
                <div className="bg-moni-bg rounded-2xl p-6 border border-white/10 text-center">
                  <i className="fas fa-inbox text-moni-gray text-3xl mb-3 block"></i>
                  <p className="text-moni-gray text-sm">Aucune demande</p>
                </div>
              ) : (
                requests.map((req) => (
                  <div 
                    key={req.id} 
                    onClick={() => {
                      setSelectedRequest(req);
                      setStep('pay-request');
                    }}
                    className="bg-moni-bg rounded-2xl p-4 border border-white/10 hover:border-moni-accent cursor-pointer transition-all"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="text-moni-white font-semibold text-sm">{req.senderName}</h4>
                        <p className="text-moni-gray text-xs font-mono">{req.senderMoniNumber || req.senderId}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-moni-accent font-bold text-lg">${req.amount.toLocaleString()}</p>
                        <p className={`text-xs font-semibold ${req.status === 'pending' ? 'text-yellow-400' : req.status === 'accepted' ? 'text-green-400' : 'text-red-400'}`}>
                          {req.status === 'pending' ? 'En attente' : req.status === 'accepted' ? 'Acceptée' : 'Refusée'}
                        </p>
                      </div>
                    </div>
                    {req.message && (
                      <p className="text-moni-gray text-xs mb-2 italic">"{req.message}"</p>
                    )}
                    <p className="text-moni-gray text-xs">
                      {new Date(req.timestamp).toLocaleDateString('fr-FR', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setStep('method')}
              className="w-full bg-white/10 text-moni-white py-3 rounded-xl font-semibold hover:bg-white/20 transition-all"
            >
              Retour
            </button>
          </>
        )}

        {step === 'pay-request' && selectedRequest && (
          <>
            <div className="mb-6">
              <div className="bg-moni-bg rounded-2xl p-4 border border-moni-accent/50 mb-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-moni-gray text-xs mb-1">Demande de</p>
                    <h4 className="text-moni-white font-semibold text-lg">{selectedRequest.senderName}</h4>
                    <p className="text-moni-gray text-xs font-mono">{selectedRequest.senderMoniNumber || selectedRequest.senderId}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-moni-gray text-xs mb-1">Montant</p>
                    <p className="text-moni-accent font-bold text-2xl">${selectedRequest.amount.toLocaleString()}</p>
                  </div>
                </div>
                {selectedRequest.message && (
                  <div className="bg-white/5 rounded-lg p-3 mt-3">
                    <p className="text-moni-gray text-xs mb-1">Message</p>
                    <p className="text-moni-white text-sm italic">"{selectedRequest.message}"</p>
                  </div>
                )}
              </div>

              <div className="bg-moni-bg rounded-2xl p-4 mb-6 border border-white/10">
                <div className="flex justify-between mb-2">
                  <span className="text-moni-gray text-xs">Solde disponible</span>
                  <span className="text-moni-white font-semibold text-xs">${userBalance.toLocaleString()}</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className="bg-moni-accent rounded-full h-2 transition-all"
                    style={{ width: `${Math.min((selectedRequest.amount / userBalance) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>

              {errorMsg && (
                <div className="bg-red-500/20 border border-red-500 rounded-xl p-3 mb-4">
                  <p className="text-red-200 text-xs">{errorMsg}</p>
                </div>
              )}

              {selectedRequest.amount > userBalance && (
                <div className="bg-yellow-500/20 border border-yellow-500 rounded-xl p-3 mb-4">
                  <p className="text-yellow-200 text-xs">Solde insuffisant pour payer cette demande</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedRequest(null);
                  setStep('all-requests');
                  setErrorMsg('');
                }}
                className="flex-1 p-3 bg-moni-bg border border-white/10 rounded-xl text-moni-white font-semibold hover:bg-white/5 transition-all"
              >
                Annuler
              </button>
              <button
                onClick={() => handlePayRequest(selectedRequest)}
                disabled={isProcessing || selectedRequest.amount > userBalance}
                className="flex-1 p-3 bg-moni-accent text-moni-bg rounded-xl font-semibold hover:bg-moni-accent/90 transition-all active:scale-95 disabled:opacity-50"
              >
                {isProcessing ? 'Paiement...' : 'Payer'}
              </button>
            </div>
          </>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-moni-accent/20 flex items-center justify-center mb-4">
              <i className="fas fa-check text-moni-accent text-2xl"></i>
            </div>
            <h3 className="text-moni-white font-semibold text-lg mb-2">Succès</h3>
            <p className="text-moni-gray text-xs text-center mb-6">Votre demande a été envoyée</p>
            <button
              onClick={handleClose}
              className="w-full bg-moni-accent text-moni-bg py-3 rounded-xl font-semibold hover:bg-moni-accent/90 transition-all active:scale-95"
            >
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default P2PModal;
