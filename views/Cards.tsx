import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, Timestamp, updateDoc, where } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';

type CardBrand = 'visa' | 'mastercard' | 'amex' | 'discover' | 'jcb' | 'unionpay' | 'diners' | 'other';
type CardStatus = 'active' | 'locked';

interface StoredCard {
  id: string;
  userId: string;
  brand: CardBrand;
  holderName: string;
  label: string;
  last4: string;
  expiryMonth: string;
  expiryYear: string;
  fingerprint: string;
  status: CardStatus;
  createdAt?: any;
}

const brandLabels: Record<CardBrand, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  discover: 'Discover',
  jcb: 'JCB',
  unionpay: 'UnionPay',
  diners: 'Diners Club',
  other: 'Autre'
};

const brandIcons: Record<CardBrand, string> = {
  visa: 'fab fa-cc-visa',
  mastercard: 'fab fa-cc-mastercard',
  amex: 'fab fa-cc-amex',
  discover: 'fab fa-cc-discover',
  jcb: 'fab fa-cc-jcb',
  unionpay: 'fas fa-credit-card',
  diners: 'fab fa-cc-diners-club',
  other: 'fas fa-credit-card'
};

const brandGradients: Record<CardBrand, string> = {
  visa: 'linear-gradient(135deg, #111827 0%, #1D4ED8 100%)',
  mastercard: 'linear-gradient(135deg, #191919 0%, #B91C1C 55%, #F59E0B 100%)',
  amex: 'linear-gradient(135deg, #0F172A 0%, #0891B2 100%)',
  discover: 'linear-gradient(135deg, #111827 0%, #EA580C 100%)',
  jcb: 'linear-gradient(135deg, #0F172A 0%, #047857 100%)',
  unionpay: 'linear-gradient(135deg, #0F172A 0%, #7C3AED 100%)',
  diners: 'linear-gradient(135deg, #111827 0%, #0369A1 100%)',
  other: 'linear-gradient(135deg, #2D3436 0%, #000000 100%)'
};

const normalizeCardNumber = (value: string) => value.replace(/\D/g, '').slice(0, 19);

const formatCardNumber = (value: string) => normalizeCardNumber(value).replace(/(.{4})/g, '$1 ').trim();

const detectBrand = (digits: string): CardBrand => {
  if (/^4/.test(digits)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'mastercard';
  if (/^3[47]/.test(digits)) return 'amex';
  if (/^(6011|65|64[4-9])/.test(digits)) return 'discover';
  if (/^35/.test(digits)) return 'jcb';
  if (/^62/.test(digits)) return 'unionpay';
  if (/^3(0[0-5]|[68])/.test(digits)) return 'diners';
  return 'other';
};

const isValidLuhn = (digits: string) => {
  let sum = 0;
  let shouldDouble = false;

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum > 0 && sum % 10 === 0;
};

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

const hashCardFingerprint = async (uid: string, digits: string) => {
  const encoded = new TextEncoder().encode(`MONI_CARD:${uid}:${digits}`);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return toHex(digest);
};

const isExpiryValid = (month: string, year: string) => {
  const monthNumber = Number(month);
  const yearNumber = Number(year.length === 2 ? `20${year}` : year);

  if (!Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12 || !Number.isInteger(yearNumber)) {
    return false;
  }

  const now = new Date();
  const expiry = new Date(yearNumber, monthNumber, 0, 23, 59, 59);
  return expiry >= now;
};

const parseExpiryInput = (value: string) => {
  const trimmed = value.trim();
  const parts = trimmed.split(/[^\d]+/).filter(Boolean);

  if (parts.length >= 2) {
    const [first, second] = parts;
    if (first.length === 4) {
      return {
        month: second.slice(0, 2),
        year: first.slice(-4)
      };
    }
    return {
      month: first.slice(0, 2),
      year: second.slice(0, 4)
    };
  }

  const digitsOnly = trimmed.replace(/\D/g, '').slice(0, 6);
  return {
    month: digitsOnly.slice(0, 2),
    year: digitsOnly.slice(2, 6)
  };
};

const maskCardNumber = (last4: string) => `•••• •••• •••• ${last4}`;

const toDateMs = (value: any) => {
  if (value?.toDate) return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  return new Date(value || 0).getTime();
};

const Cards: React.FC = () => {
  const { user } = useAuth();
  const [cards, setCards] = useState<StoredCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [holderName, setHolderName] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [expiryValue, setExpiryValue] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  const [label, setLabel] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setCards([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const cardsQuery = query(collection(db, 'paymentCards'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(
      cardsQuery,
      (snapshot) => {
        const items = snapshot.docs
          .map((document) => ({ id: document.id, ...document.data() })) as StoredCard[];
        items.sort((a, b) => toDateMs(b.createdAt) - toDateMs(a.createdAt));
        setCards(items);
        setSelectedCardId((current) => current && items.some((card) => card.id === current) ? current : items[0]?.id || '');
        setLoading(false);
      },
      (snapshotError) => {
        console.error('Cards load error:', snapshotError);
        setError('Impossible de charger les cartes.');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user?.uid]);

  const digits = normalizeCardNumber(cardNumber);
  const detectedBrand = useMemo(() => detectBrand(digits), [digits]);
  const selectedCard = cards.find((card) => card.id === selectedCardId) || null;

  const resetForm = () => {
    setCardNumber('');
    setHolderName('');
    setExpiryMonth('');
    setExpiryYear('');
    setExpiryValue('');
    setSecurityCode('');
    setLabel('');
    setError('');
    setSuccess('');
  };

  const handleExpiryChange = (value: string) => {
    const { month, year } = parseExpiryInput(value);
    setExpiryMonth(month);
    setExpiryYear(year);
    setExpiryValue(year ? `${month}/${year}` : month);
    setError('');
  };

  const syncFormValuesFromDom = () => {
    const numberInput = document.getElementById('cc-number') as HTMLInputElement | null;
    const nameInput = document.getElementById('cc-name') as HTMLInputElement | null;
    const expiryInput = document.getElementById('cc-exp') as HTMLInputElement | null;
    const cscInput = document.getElementById('cc-csc') as HTMLInputElement | null;
    const numberValue = numberInput?.value || cardNumber;
    const nameValue = nameInput?.value || holderName;
    const expiryRaw = expiryInput?.value || expiryValue;
    const { month, year } = parseExpiryInput(expiryRaw);

    setCardNumber(numberValue);
    setHolderName(nameValue);
    setExpiryMonth(month);
    setExpiryYear(year);
    setExpiryValue(year ? `${month}/${year}` : month);
    setSecurityCode(cscInput?.value || securityCode);

    return {
      digits: normalizeCardNumber(numberValue),
      holderName: nameValue,
      expiryMonth: month,
      expiryYear: year,
      label,
    };
  };

  const focusSavedCards = () => {
    const input = document.getElementById('cc-number') as HTMLInputElement | null;
    input?.focus();
    input?.click();
    window.setTimeout(syncFormValuesFromDom, 500);
    window.setTimeout(syncFormValuesFromDom, 1200);
  };

  const handleAddCard = async () => {
    setError('');
    setSuccess('');
    const current = syncFormValuesFromDom();

    if (!user?.uid) {
      setError('Utilisateur non authentifié.');
      return;
    }

    if (current.digits.length < 12 || !isValidLuhn(current.digits)) {
      setError('Numéro de carte invalide.');
      return;
    }

    if (!current.holderName.trim()) {
      setError('Veuillez saisir le titulaire.');
      return;
    }

    if (!isExpiryValid(current.expiryMonth, current.expiryYear)) {
      setError('Date d’expiration invalide.');
      return;
    }

    setSaving(true);

    try {
      const currentBrand = detectBrand(current.digits);
      const fingerprint = await hashCardFingerprint(user.uid, current.digits);
      const duplicate = cards.some((card) => card.fingerprint === fingerprint);
      if (duplicate) {
        setError('Cette carte est déjà enregistrée.');
        setSaving(false);
        return;
      }

      const year = current.expiryYear.length === 2 ? current.expiryYear : current.expiryYear.slice(-2);
      await addDoc(collection(db, 'paymentCards'), {
        userId: user.uid,
        brand: currentBrand,
        holderName: current.holderName.trim().toUpperCase(),
        label: current.label.trim() || `${brandLabels[currentBrand]} personnelle`,
        last4: current.digits.slice(-4),
        expiryMonth: current.expiryMonth.padStart(2, '0'),
        expiryYear: year.padStart(2, '0'),
        fingerprint,
        status: 'active',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      setSuccess('Carte ajoutée.');
      resetForm();
      setShowAddForm(false);
    } catch (saveError: any) {
      console.error('Card save error:', saveError);
      setError(saveError?.message || 'Impossible d’ajouter cette carte.');
    } finally {
      setSaving(false);
    }
  };

  const toggleSelectedCardStatus = async () => {
    if (!selectedCard) return;

    try {
      await updateDoc(doc(db, 'paymentCards', selectedCard.id), {
        status: selectedCard.status === 'locked' ? 'active' : 'locked',
        updatedAt: Timestamp.now(),
      });
    } catch (statusError: any) {
      console.error('Card status error:', statusError);
      setError(statusError?.message || 'Impossible de modifier cette carte.');
    }
  };

  const deleteSelectedCard = async () => {
    if (!selectedCard) return;

    try {
      await deleteDoc(doc(db, 'paymentCards', selectedCard.id));
      setShowDetails(false);
    } catch (deleteError: any) {
      console.error('Card delete error:', deleteError);
      setError(deleteError?.message || 'Impossible de supprimer cette carte.');
    }
  };

  return (
    <div className="px-5">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-moni-white font-montserrat">Mes Cartes</h1>
          <p className="text-moni-gray text-xs">Cartes enregistrées</p>
        </div>
        <div className="flex items-center gap-3">
          <img src="/onelogo.png" alt="Moni.io" className="h-8 w-auto" />
          <button
            onClick={() => {
              setShowAddForm(true);
              setShowDetails(false);
              resetForm();
            }}
            className="w-10 h-10 bg-moni-accent rounded-full flex items-center justify-center text-moni-bg shadow-lg shadow-moni-accent/30"
            type="button"
          >
            <i className="fas fa-plus"></i>
          </button>
        </div>
      </header>

      {loading ? (
        <div className="bg-moni-card rounded-3xl p-8 text-center text-moni-gray text-xs">Chargement des cartes...</div>
      ) : selectedCard ? (
        <div className="relative w-full max-w-[340px] aspect-[1.586/1] mx-auto rounded-[18px] overflow-hidden p-5 text-white mb-5 shadow-2xl shadow-black/40 border border-white/10" style={{ background: brandGradients[selectedCard.brand] }}>
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative flex justify-between items-start mb-6">
            <div className="w-10 h-8 bg-gradient-to-br from-yellow-300 to-yellow-600 rounded-md shadow-inner flex flex-col justify-around p-1">
              <div className="h-0.5 w-full bg-black/20"></div>
              <div className="h-0.5 w-full bg-black/20"></div>
              <div className="h-0.5 w-full bg-black/20"></div>
            </div>
            <div className="text-right">
              <i className={`${brandIcons[selectedCard.brand]} text-2xl text-white/90 block mb-1`}></i>
              {selectedCard.status === 'locked' && (
                <span className="text-[9px] bg-red-500/30 text-red-100 px-2 py-1 rounded-full">Verrouillée</span>
              )}
            </div>
          </div>

          <div className="relative mb-5">
            <p className="text-[10px] text-white/60 mb-1 tracking-widest uppercase">Numéro de carte</p>
            <h3 className="text-base font-mono tracking-[0.14em]">{maskCardNumber(selectedCard.last4)}</h3>
          </div>

          <div className="relative flex justify-between items-end">
            <div className="min-w-0">
              <p className="text-[8px] text-white/60 uppercase mb-0.5">Titulaire</p>
              <p className="text-[11px] font-semibold uppercase truncate max-w-[135px]">{selectedCard.holderName}</p>
            </div>
            <div>
              <p className="text-[8px] text-white/60 uppercase mb-0.5">Exp.</p>
              <p className="text-[11px] font-semibold">{selectedCard.expiryMonth}/{selectedCard.expiryYear}</p>
            </div>
            <div>
              <p className="text-[8px] text-white/60 uppercase mb-0.5">Type</p>
              <p className="text-[11px] font-semibold">{brandLabels[selectedCard.brand]}</p>
            </div>
          </div>

          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
        </div>
      ) : (
        <div className="bg-moni-card rounded-3xl p-8 text-center border border-white/5 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-moni-accent/10 text-moni-accent flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-credit-card text-xl"></i>
          </div>
          <h3 className="text-moni-white font-semibold text-sm mb-2">Aucune carte</h3>
          <p className="text-moni-gray text-xs mb-5">Ajoutez une carte Visa, Mastercard ou autre.</p>
          <button
            onClick={() => {
              setShowAddForm(true);
              resetForm();
            }}
            className="bg-moni-accent text-moni-bg px-5 py-3 rounded-xl text-sm font-semibold"
            type="button"
          >
            Ajouter une carte
          </button>
        </div>
      )}

      {cards.length > 1 && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {cards.map((card) => (
            <button
              key={card.id}
              onClick={() => setSelectedCardId(card.id)}
              className={`shrink-0 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                selectedCardId === card.id
                  ? 'bg-moni-accent text-moni-bg border-moni-accent'
                  : 'bg-moni-card text-moni-gray border-white/10'
              }`}
              type="button"
            >
              {brandLabels[card.brand]} • {card.last4}
            </button>
          ))}
        </div>
      )}

      {selectedCard && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <button
            onClick={toggleSelectedCardStatus}
            className="bg-moni-card border border-white/5 p-4 rounded-2xl flex flex-col items-center gap-2 hover:bg-white/5 transition-colors"
            type="button"
          >
            <i className={`fas ${selectedCard.status === 'locked' ? 'fa-unlock' : 'fa-lock'} text-moni-accent text-lg`}></i>
            <span className="text-xs text-moni-white font-medium">{selectedCard.status === 'locked' ? 'Déverrouiller' : 'Verrouiller'}</span>
          </button>
          <button
            onClick={() => setShowDetails((value) => !value)}
            className="bg-moni-card border border-white/5 p-4 rounded-2xl flex flex-col items-center gap-2 hover:bg-white/5 transition-colors"
            type="button"
          >
            <i className="fas fa-eye text-moni-gray text-lg"></i>
            <span className="text-xs text-moni-white font-medium">Détails</span>
          </button>
          <button
            onClick={deleteSelectedCard}
            className="bg-moni-card border border-white/5 p-4 rounded-2xl flex flex-col items-center gap-2 hover:bg-red-500/10 transition-colors"
            type="button"
          >
            <i className="fas fa-trash text-red-300 text-lg"></i>
            <span className="text-xs text-moni-white font-medium">Supprimer</span>
          </button>
        </div>
      )}

      {showDetails && selectedCard && (
        <div className="bg-moni-card rounded-3xl p-5 border border-white/5 mb-6">
          <h4 className="text-moni-white text-sm font-semibold mb-4">Détails de la carte</h4>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-moni-gray">Nom</span>
              <span className="text-moni-white font-semibold">{selectedCard.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-moni-gray">Marque</span>
              <span className="text-moni-white font-semibold">{brandLabels[selectedCard.brand]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-moni-gray">Carte</span>
              <span className="text-moni-white font-mono">{maskCardNumber(selectedCard.last4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-moni-gray">Statut</span>
              <span className={selectedCard.status === 'locked' ? 'text-red-300 font-semibold' : 'text-moni-accent font-semibold'}>
                {selectedCard.status === 'locked' ? 'Verrouillée' : 'Active'}
              </span>
            </div>
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 flex items-end z-50 rounded-[40px]">
          <div className="w-full bg-moni-card rounded-t-3xl p-6 max-h-[90%] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-moni-white font-montserrat">Ajouter une carte</h2>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  resetForm();
                }}
                className="text-moni-gray hover:text-moni-white"
                type="button"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            <form
              id="moni-payment-card-form"
              name="payment-card"
              autoComplete="on"
              onSubmit={(event) => {
                event.preventDefault();
                handleAddCard();
              }}
              className="space-y-4 mb-5"
            >
              <button
                onClick={focusSavedCards}
                className="w-full bg-moni-bg border border-moni-accent/30 rounded-2xl p-4 flex items-center gap-3 hover:bg-white/5 transition-all"
                type="button"
              >
                <div className="w-10 h-10 rounded-xl bg-moni-accent/10 text-moni-accent flex items-center justify-center">
                  <i className="fas fa-credit-card"></i>
                </div>
                <div className="text-left">
                  <p className="text-moni-white text-sm font-semibold">Utiliser une carte enregistrée</p>
                  <p className="text-moni-gray text-xs">Choisissez une carte sauvegardée dans le navigateur ou l’appareil.</p>
                </div>
              </button>

              <div>
                <label htmlFor="cc-number" className="text-moni-gray text-xs font-semibold mb-2 block">Numéro de carte</label>
                <input
                  id="cc-number"
                  name="cardnumber"
                  type="text"
                  value={formatCardNumber(cardNumber)}
                  onChange={(event) => {
                    setCardNumber(event.target.value);
                    setError('');
                    setSuccess('');
                  }}
                  onInput={(event) => {
                    setCardNumber((event.target as HTMLInputElement).value);
                  }}
                  onBlur={syncFormValuesFromDom}
                  placeholder="0000 0000 0000 0000"
                  inputMode="numeric"
                  autoComplete="section-moni-card cc-number"
                  className="w-full bg-moni-bg border border-white/10 rounded-xl px-4 py-3 text-moni-white placeholder-moni-gray focus:outline-none focus:border-moni-accent font-mono"
                />
                {digits.length >= 4 && (
                  <p className="text-moni-accent text-xs mt-2">{brandLabels[detectedBrand]}</p>
                )}
              </div>

              <div>
                <label htmlFor="cc-name" className="text-moni-gray text-xs font-semibold mb-2 block">Titulaire</label>
                <input
                  id="cc-name"
                  name="ccname"
                  type="text"
                  value={holderName}
                  onChange={(event) => {
                    setHolderName(event.target.value);
                    setError('');
                  }}
                  onInput={(event) => {
                    setHolderName((event.target as HTMLInputElement).value);
                  }}
                  onBlur={syncFormValuesFromDom}
                  placeholder="Nom sur la carte"
                  autoComplete="section-moni-card cc-name"
                  className="w-full bg-moni-bg border border-white/10 rounded-xl px-4 py-3 text-moni-white placeholder-moni-gray focus:outline-none focus:border-moni-accent uppercase"
                />
              </div>

              <div>
                <label htmlFor="cc-exp" className="text-moni-gray text-xs font-semibold mb-2 block">Expiration</label>
                <input
                  id="cc-exp"
                  name="exp-date"
                  type="text"
                  value={expiryValue}
                  onChange={(event) => handleExpiryChange(event.target.value)}
                  onInput={(event) => handleExpiryChange((event.target as HTMLInputElement).value)}
                  onBlur={syncFormValuesFromDom}
                  placeholder="MM/AA"
                  inputMode="numeric"
                  autoComplete="section-moni-card cc-exp"
                  className="w-full bg-moni-bg border border-white/10 rounded-xl px-4 py-3 text-moni-white placeholder-moni-gray focus:outline-none focus:border-moni-accent"
                />
                <div className="sr-only">
                  <input
                    name="cc-exp-month"
                    value={expiryMonth}
                    onChange={(event) => {
                      setExpiryMonth(event.target.value.replace(/\D/g, '').slice(0, 2));
                      setExpiryValue(`${event.target.value.replace(/\D/g, '').slice(0, 2)}/${expiryYear}`);
                    }}
                    autoComplete="section-moni-card cc-exp-month"
                    tabIndex={-1}
                  />
                  <input
                    name="cc-exp-year"
                    value={expiryYear}
                    onChange={(event) => {
                      setExpiryYear(event.target.value.replace(/\D/g, '').slice(0, 4));
                      setExpiryValue(`${expiryMonth}/${event.target.value.replace(/\D/g, '').slice(0, 4)}`);
                    }}
                    autoComplete="section-moni-card cc-exp-year"
                    tabIndex={-1}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="cc-csc" className="text-moni-gray text-xs font-semibold mb-2 block">CVV</label>
                <input
                  id="cc-csc"
                  name="cvc"
                  type="text"
                  value={securityCode}
                  onChange={(event) => {
                    setSecurityCode(event.target.value.replace(/\D/g, '').slice(0, 4));
                    setError('');
                  }}
                  onInput={(event) => {
                    setSecurityCode((event.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 4));
                  }}
                  placeholder="123"
                  inputMode="numeric"
                  autoComplete="section-moni-card cc-csc"
                  className="w-full bg-moni-bg border border-white/10 rounded-xl px-4 py-3 text-moni-white placeholder-moni-gray focus:outline-none focus:border-moni-accent"
                />
                <p className="text-moni-gray text-[10px] mt-2">Le CVV sert seulement à déclencher/remplir l’autofill. Il n’est pas enregistré.</p>
              </div>

              <div>
                <label htmlFor="card-label" className="text-moni-gray text-xs font-semibold mb-2 block">Nom de la carte</label>
                <input
                  id="card-label"
                  name="card-label"
                  type="text"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder="Ex: Carte principale"
                  autoComplete="off"
                  className="w-full bg-moni-bg border border-white/10 rounded-xl px-4 py-3 text-moni-white placeholder-moni-gray focus:outline-none focus:border-moni-accent"
                />
              </div>

              <div className="bg-moni-bg rounded-2xl p-4 border border-white/10">
                <p className="text-moni-gray text-xs">
                  Moni ne stocke pas le numéro complet de la carte ni le CVV.
                </p>
              </div>
            </form>

            {success && (
              <div className="bg-moni-accent/10 border border-moni-accent/40 rounded-xl p-3 mb-4">
                <p className="text-moni-accent text-xs">{success}</p>
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
                  setShowAddForm(false);
                  resetForm();
                }}
                className="flex-1 p-3 bg-moni-bg border border-white/10 rounded-xl text-moni-white font-semibold hover:bg-white/5 transition-all"
                type="button"
              >
                Annuler
              </button>
              <button
                onClick={handleAddCard}
                disabled={saving}
                className="flex-1 p-3 bg-moni-accent text-moni-bg rounded-xl font-semibold hover:bg-moni-accent/90 transition-all disabled:opacity-50"
                type="button"
              >
                {saving ? 'Ajout...' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && !showAddForm && (
        <div className="bg-red-500/20 border border-red-500 rounded-xl p-3 mt-4">
          <p className="text-red-200 text-xs">{error}</p>
        </div>
      )}
    </div>
  );
};

export default Cards;
