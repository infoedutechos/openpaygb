'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { pearlBlue, pearlGolden, pearlWhite, uraTreasuryCounter } from '@/images';
import { triggerHapticFeedback } from '@/utils/ui';
import { useGameStore } from '@/utils/game-mechanics';
import { useToast } from '@/contexts/ToastContext';
import { PEARLS_BALANCE_REFRESH_EVENT, notifyPearlBalancesRefresh } from '@/utils/pearl-balance-events';
import { WHITE_TO_GOLDISH_RATE } from '@/utils/consts';
import { PlayTonWalletConnect } from '@/components/PlayTonWalletConnect';

interface WalletProps {
  setCurrentView: (view: string) => void;
  embedded?: boolean;
}

type PearlType = 'white' | 'goldish';

export default function Wallet({ setCurrentView, embedded = false }: WalletProps) {
  const showToast = useToast();
  const { userTelegramInitData, setPointsBalance, setBluePearlsTotal } = useGameStore();

  const [loading, setLoading] = useState(true);
  const [white, setWhite] = useState(0);
  const [bluePending, setBluePending] = useState(0);
  const [blueApproved, setBlueApproved] = useState(0);
  const [golden, setGolden] = useState(0);
  const [history, setHistory] = useState<Array<{ id: string; eventType?: string; createdAt: string; amount?: number | null }>>([]);

  const [convertFromAmount, setConvertFromAmount] = useState(String(WHITE_TO_GOLDISH_RATE));
  const [converting, setConverting] = useState(false);
  const [exchangeMode, setExchangeMode] = useState<'whiteGolden' | 'whiteBlue'>('whiteGolden');

  const [withdrawAmount] = useState('1');
  const [withdrawing, setWithdrawing] = useState(false);

  const [sendRecipientTelegramId, setSendRecipientTelegramId] = useState('');
  const [sendPearlType, setSendPearlType] = useState<PearlType>('white');
  const [sendAmount, setSendAmount] = useState('1');
  const [sending, setSending] = useState(false);
  const [transferTab, setTransferTab] = useState<'send' | 'receive' | 'history' | 'recent'>('send');

  const [myTelegramId, setMyTelegramId] = useState('');

  const blueTotal = useMemo(() => bluePending + blueApproved, [bluePending, blueApproved]);
  const totalPearls = white + blueTotal + golden;
  const convertInput = Math.max(0, Math.floor(Number(convertFromAmount) || 0));
  const convertOutput = convertInput;

  const canConvert = useMemo(() => convertInput >= 1 && convertInput <= white, [convertInput, white]);
  const convertFromBalance = white;
  const convertToBalance = blueTotal;
  const tradeInput = Math.max(0, Math.floor(Number(convertFromAmount) || 0));
  const goldenConversionOut = Math.floor(tradeInput / WHITE_TO_GOLDISH_RATE);
  const canWhiteToGolden = tradeInput >= WHITE_TO_GOLDISH_RATE && tradeInput <= white;

  type ServerPearlBalances = {
    white: number;
    pointsBalance?: number;
    bluePending: number;
    blueApprovedTotal?: number;
    blueTotal?: number;
    goldish: number;
  };

  const applyServerBalances = (b: ServerPearlBalances) => {
    setWhite(Math.floor(b.white));
    const bp = Math.floor(b.bluePending);
    const ba = Math.floor(b.blueApprovedTotal ?? (typeof b.blueTotal === 'number' ? Math.max(0, b.blueTotal - bp) : 0));
    setBluePending(bp);
    const baSafe = Number.isFinite(ba) ? ba : 0;
    setBlueApproved(baSafe);
    setGolden(Math.floor(b.goldish));
    setBluePearlsTotal(bp + baSafe);
    if (typeof b.pointsBalance === 'number' && Number.isFinite(b.pointsBalance)) {
      setPointsBalance(Math.floor(b.pointsBalance));
    }
  };

  const loadWallet = async () => {
    if (!userTelegramInitData) return;
    setLoading(true);
    try {
      const res = await fetch('/api/pearls/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: userTelegramInitData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load wallet');
      const bp = Math.floor(data?.balances?.bluePending ?? 0);
      const ba = Math.floor(data?.balances?.blueApprovedTotal ?? 0);
      const bt =
        typeof data?.balances?.blueTotal === 'number'
          ? Math.floor(data.balances.blueTotal)
          : bp + ba;
      applyServerBalances({
        white: Math.floor(data?.balances?.white ?? 0),
        bluePending: bp,
        blueApprovedTotal: ba,
        blueTotal: bt,
        goldish: Math.floor(data?.balances?.goldish ?? 0),
        pointsBalance: Math.floor(data?.balances?.white ?? 0),
      });
      setHistory(data?.recentAudits ?? []);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to load wallet', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWallet();
    const onRefresh = () => {
      void loadWallet();
    };
    window.addEventListener(PEARLS_BALANCE_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(PEARLS_BALANCE_REFRESH_EVENT, onRefresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userTelegramInitData]);

  useEffect(() => {
    if (!userTelegramInitData) return;
    try {
      const params = new URLSearchParams(userTelegramInitData);
      const userRaw = params.get('user');
      if (!userRaw) return;
      const parsed = JSON.parse(decodeURIComponent(userRaw)) as { id?: number | string };
      if (parsed?.id != null) setMyTelegramId(String(parsed.id));
    } catch {
      // Ignore parse issues; receive section still shows instruction.
    }
  }, [userTelegramInitData]);

  const handleConvert = async () => {
    if (!userTelegramInitData || !canConvert) return;
    setConverting(true);
    try {
      const res = await fetch('/api/pearls/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData: userTelegramInitData,
          swapType: 'white_to_blue',
          amount: convertInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Conversion failed');
      if (data?.balances && typeof data.balances === 'object') {
        applyServerBalances(data.balances as ServerPearlBalances);
      }
      showToast('Conversion successful', 'success');
      await loadWallet();
      notifyPearlBalancesRefresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Swap failed', 'error');
    } finally {
      setConverting(false);
    }
  };

  const handleWhiteToGolden = async () => {
    if (!userTelegramInitData || !canWhiteToGolden) return;
    setConverting(true);
    try {
      const res = await fetch('/api/pearls/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData: userTelegramInitData,
          whiteAmount: tradeInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Conversion failed');
      if (data?.balances && typeof data.balances === 'object') {
        applyServerBalances(data.balances as ServerPearlBalances);
      }
      showToast('Conversion successful', 'success');
      await loadWallet();
      notifyPearlBalancesRefresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Conversion failed', 'error');
    } finally {
      setConverting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!userTelegramInitData) return;
    const amount = Math.max(0, Math.floor(Number(withdrawAmount) || 0));
    if (amount <= 0) {
      showToast('Enter valid withdrawal amount', 'error');
      return;
    }
    setWithdrawing(true);
    try {
      const res = await fetch('/api/pearls/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData: userTelegramInitData,
          goldishAmount: amount,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Withdrawal request failed');
      showToast('Withdrawal request submitted', 'success');
      await loadWallet();
      notifyPearlBalancesRefresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Withdrawal request failed', 'error');
    } finally {
      setWithdrawing(false);
    }
  };

  const handleSend = async () => {
    if (!userTelegramInitData) return;
    const amount = Math.max(0, Math.floor(Number(sendAmount) || 0));
    if (!sendRecipientTelegramId.trim() || amount <= 0) {
      showToast('Fill recipient Telegram ID and amount', 'error');
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/pearls/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData: userTelegramInitData,
          recipientTelegramId: sendRecipientTelegramId.trim(),
          amount,
          pearlType: sendPearlType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Transfer failed');
      showToast('Pearls sent successfully', 'success');
      setSendAmount('1');
      await loadWallet();
      notifyPearlBalancesRefresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Transfer failed', 'error');
    } finally {
      setSending(false);
    }
  };

  const onCopyReceiveId = async () => {
    triggerHapticFeedback(window);
    if (!myTelegramId) {
      showToast('Telegram ID not available yet', 'error');
      return;
    }
    try {
      await navigator.clipboard.writeText(myTelegramId);
      showToast('Telegram ID copied', 'success');
    } catch {
      showToast('Could not copy Telegram ID', 'error');
    }
  };

  const transferTabs: Array<{ key: 'send' | 'receive' | 'history' | 'recent'; label: string }> = [
    { key: 'send', label: 'Send' },
    { key: 'receive', label: 'Receive' },
    { key: 'history', label: 'My History' },
    { key: 'recent', label: 'Recent' },
  ];

  const e = embedded;

  return (
    <div className={embedded ? '' : 'bg-ura-page flex justify-center min-h-screen'}>
      <div className={embedded ? 'w-full text-white flex flex-col' : 'w-full bg-ura-page text-white flex flex-col max-w-xl pb-24'}>
        <div className={embedded ? 'space-y-3' : 'px-4 pt-4 space-y-4'}>
          <h1 className={`font-bold text-center ${e ? 'text-lg' : 'text-2xl'}`}>My Assets</h1>

          <PlayTonWalletConnect compact className={e ? 'mb-3' : 'mb-4'} />

          <div className={`rounded-3xl border border-ura-border/85 bg-gradient-to-r from-ura-panel-2 via-ura-panel-3 to-ura-panel-2 ${e ? 'p-3' : 'p-4'}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className={`text-gray-400 ${e ? 'text-xs' : 'text-sm'}`}>Total Assets</p>
                <p className={`mt-1 font-bold tabular-nums leading-tight ${e ? 'text-2xl' : 'text-5xl leading-none mt-2'}`}>
                  {totalPearls.toLocaleString()}
                </p>
                <p className={`text-gray-300 ${e ? 'text-xs mt-0.5' : 'text-lg mt-1'}`}>Pearls</p>
              </div>
              <Image
                src={uraTreasuryCounter}
                alt="Treasury pearls"
                width={e ? 56 : 88}
                height={e ? 56 : 88}
                className={e ? 'h-14 w-14 shrink-0 object-contain' : 'h-20 w-20 object-contain'}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleWithdraw}
              disabled={withdrawing}
              className={`rounded-2xl border border-ura-border/85 bg-gradient-to-r from-ura-panel-2 via-ura-panel-3 to-ura-panel-2 text-center ${e ? 'py-2' : 'py-3'}`}
            >
              <p className={`font-semibold ${e ? 'text-xs' : 'text-[13px]'}`}>{withdrawing ? 'Submitting...' : 'Withdraw'}</p>
            </button>
            <button
              type="button"
              onClick={handleConvert}
              disabled={converting || !canConvert}
              className={`rounded-2xl border border-ura-border/85 bg-gradient-to-r from-ura-panel-2 via-ura-panel-3 to-ura-panel-2 text-center disabled:opacity-60 ${e ? 'py-2' : 'py-3'}`}
            >
              <p className={`font-semibold ${e ? 'text-xs' : 'text-[13px]'}`}>{converting ? 'Converting...' : 'White→Blue'}</p>
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHapticFeedback(window);
                setCurrentView('airdrop');
              }}
              className={`rounded-2xl border border-ura-border/85 bg-gradient-to-r from-ura-panel-2 via-ura-panel-3 to-ura-panel-2 text-center ${e ? 'py-2' : 'py-3'}`}
            >
              <p className={`font-semibold ${e ? 'text-xs' : 'text-[13px]'}`}>Drops</p>
            </button>
          </div>

          <section className="space-y-2">
            <h2 className={`font-bold ${e ? 'text-sm' : 'text-lg'}`}>Balances</h2>
            {[
              { code: 'WHITE', name: 'White Pearl', value: white, image: pearlWhite },
              { code: 'BLUE', name: 'Blue pearl (pending + approved)', value: blueTotal, image: pearlBlue },
              { code: 'GOLDEN', name: 'Golden Pearl', value: golden, image: pearlGolden },
            ].map((item) => (
              <div
                key={item.code}
                className={`rounded-2xl border border-ura-border/85 bg-gradient-to-r from-ura-panel-2 via-ura-panel-3 to-ura-panel-2 px-3 flex items-center justify-between gap-3 ${e ? 'py-2' : 'py-3'}`}
              >
                <div className={`flex items-center min-w-0 ${e ? 'gap-2' : 'gap-3'}`}>
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={e ? 32 : 40}
                    height={e ? 32 : 40}
                    className={e ? 'h-8 w-8 object-contain' : 'h-10 w-10 object-contain'}
                  />
                  <div className="min-w-0">
                    <p className={`font-semibold ${e ? 'text-xs' : ''}`}>{item.code}</p>
                    <p className={`text-gray-400 truncate ${e ? 'text-[11px]' : 'text-sm'}`}>{item.name}</p>
                  </div>
                </div>
                <p className={`font-semibold tabular-nums ${e ? 'text-lg' : 'text-2xl'}`}>{item.value.toLocaleString()}</p>
              </div>
            ))}
          </section>

          <section className={`rounded-2xl border border-ura-border/85 bg-ura-navy-deep/95 ${e ? 'p-3' : 'p-4'}`}>
            <h2 className={`font-bold text-white ${e ? 'text-sm mb-2' : 'text-base mb-3'}`}>Conversions</h2>
            <div className="rounded-full border border-ura-line/70 bg-ura-navy-deep/90 p-1 grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => {
                  triggerHapticFeedback(window);
                  setExchangeMode('whiteGolden');
                }}
                className={`rounded-full font-semibold transition-colors inline-flex items-center justify-center gap-1.5 ${
                  e ? 'py-1 text-xs' : 'py-1.5 text-sm'
                } ${exchangeMode === 'whiteGolden' ? 'bg-[#2a2d34] text-white' : 'text-gray-500'}`}
              >
                <Image src={pearlWhite} alt="" width={16} height={16} className="h-4 w-4 object-contain opacity-90" />
                <Image src={pearlGolden} alt="" width={16} height={16} className="h-4 w-4 object-contain opacity-90" />
                <span>White→Golden</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHapticFeedback(window);
                  setExchangeMode('whiteBlue');
                }}
                className={`rounded-full font-semibold transition-colors inline-flex items-center justify-center gap-1.5 ${
                  e ? 'py-1 text-xs' : 'py-1.5 text-sm'
                } ${exchangeMode === 'whiteBlue' ? 'bg-[#2a2d34] text-white' : 'text-gray-500'}`}
              >
                <Image src={pearlWhite} alt="" width={16} height={16} className="h-4 w-4 object-contain opacity-90" />
                <Image src={pearlBlue} alt="" width={16} height={16} className="h-4 w-4 object-contain opacity-90" />
                <span>White→Blue</span>
              </button>
            </div>

            <div className={e ? 'mt-4 text-center' : 'mt-6 text-center'}>
              <p className={`font-semibold tracking-tight tabular-nums ${e ? 'text-2xl' : 'text-6xl'}`}>{tradeInput.toLocaleString()}</p>
            </div>

            {exchangeMode === 'whiteBlue' ? (
              <div className={`rounded-2xl border border-ura-line/70 bg-ura-navy-deep/90 divide-y divide-ura-line/55 overflow-hidden ${e ? 'mt-3' : 'mt-5'}`}>
                <div className={`flex items-center justify-between gap-3 ${e ? 'p-2.5' : 'p-3'}`}>
                  <div className={`flex items-center min-w-0 ${e ? 'gap-2' : 'gap-3'}`}>
                    <Image
                      src={pearlWhite}
                      alt="White pearl"
                      width={e ? 36 : 44}
                      height={e ? 36 : 44}
                      className={`shrink-0 object-contain ${e ? 'h-9 w-9' : 'h-11 w-11'}`}
                    />
                    <div className="min-w-0">
                      <p className={`font-semibold text-white ${e ? 'text-xs' : 'text-sm'}`}>From</p>
                      <p className="mt-0.5 text-[11px] text-gray-400">White converts to blue (pending)</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <input
                      type="number"
                      min={0}
                      value={convertFromAmount}
                      onChange={(e) => setConvertFromAmount(e.target.value)}
                      className={`w-24 bg-transparent text-right font-semibold outline-none ${e ? 'text-base' : 'text-lg'}`}
                    />
                    <p className="text-[11px] text-gray-400 mt-0.5">Available {convertFromBalance.toLocaleString()}</p>
                  </div>
                </div>
                <div className={`flex items-center justify-between gap-3 ${e ? 'p-2.5' : 'p-3'}`}>
                  <div className={`flex items-center min-w-0 ${e ? 'gap-2' : 'gap-3'}`}>
                    <Image
                      src={pearlBlue}
                      alt="Blue pearl"
                      width={e ? 36 : 44}
                      height={e ? 36 : 44}
                      className={`shrink-0 object-contain ${e ? 'h-9 w-9' : 'h-11 w-11'}`}
                    />
                    <div className="min-w-0">
                      <p className={`font-semibold text-white ${e ? 'text-xs' : 'text-sm'}`}>To</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Blue (adds to pending)</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-semibold tabular-nums ${e ? 'text-base' : 'text-lg'}`}>{convertOutput.toLocaleString()}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Total blue {convertToBalance.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className={`rounded-2xl border border-ura-line/70 bg-ura-navy-deep/90 divide-y divide-ura-line/55 overflow-hidden ${e ? 'mt-3' : 'mt-5'}`}>
                <div className={`flex items-center justify-between gap-3 ${e ? 'p-2.5' : 'p-3'}`}>
                  <div className={`flex items-center min-w-0 ${e ? 'gap-2' : 'gap-3'}`}>
                    <Image
                      src={pearlWhite}
                      alt="White pearl"
                      width={e ? 36 : 44}
                      height={e ? 36 : 44}
                      className={`shrink-0 object-contain ${e ? 'h-9 w-9' : 'h-11 w-11'}`}
                    />
                    <div className="min-w-0">
                      <p className={`font-semibold text-white ${e ? 'text-xs' : 'text-sm'}`}>From</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">White pearl</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <input
                      type="number"
                      min={0}
                      value={convertFromAmount}
                      onChange={(e) => setConvertFromAmount(e.target.value)}
                      className={`w-24 bg-transparent text-right font-semibold outline-none ${e ? 'text-base' : 'text-lg'}`}
                    />
                    <p className="text-[11px] text-gray-400 mt-0.5">Available {white.toLocaleString()}</p>
                  </div>
                </div>
                <div className={`flex items-center justify-between gap-3 ${e ? 'p-2.5' : 'p-3'}`}>
                  <div className={`flex items-center min-w-0 ${e ? 'gap-2' : 'gap-3'}`}>
                    <Image
                      src={pearlGolden}
                      alt="Golden pearl"
                      width={e ? 36 : 44}
                      height={e ? 36 : 44}
                      className={`shrink-0 object-contain ${e ? 'h-9 w-9' : 'h-11 w-11'}`}
                    />
                    <div className="min-w-0">
                      <p className={`font-semibold text-white ${e ? 'text-xs' : 'text-sm'}`}>To</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Golden pearl</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-semibold tabular-nums ${e ? 'text-base' : 'text-lg'}`}>
                      {goldenConversionOut.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {`${WHITE_TO_GOLDISH_RATE.toLocaleString()} white = 1 golden`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={exchangeMode === 'whiteBlue' ? handleConvert : handleWhiteToGolden}
              disabled={
                converting ||
                (exchangeMode === 'whiteBlue' && !canConvert) ||
                (exchangeMode === 'whiteGolden' && !canWhiteToGolden)
              }
              className={`mt-4 w-full rounded-full bg-ura-navy-deep border border-ura-line/70 font-semibold text-gray-300 disabled:opacity-50 ${e ? 'py-2.5 text-sm' : 'py-3 text-base'}`}
            >
              {converting ? 'Processing...' : 'Convert'}
            </button>
            {exchangeMode === 'whiteBlue' ? (
              <p className="mt-2 text-[11px] text-gray-500 text-center">
                One-way conversion: white to blue (pending). Blue cannot be converted back to white.
              </p>
            ) : (
              <p className="mt-2 text-[11px] text-gray-500 text-center">
                One-way conversion: white to golden. Golden cannot be converted back to white here.
              </p>
            )}
          </section>

          <section className={`rounded-2xl border border-ura-border/85 bg-gradient-to-r from-ura-panel-2 via-ura-panel-3 to-ura-panel-2 ${e ? 'p-3' : 'p-4'}`}>
            <h2 className={`font-bold leading-tight ${e ? 'text-base' : 'text-3xl'}`}>Send &amp; Receive Pearls</h2>

            <div className={`rounded-2xl border border-ura-border/85 bg-ura-panel-2 p-1 grid grid-cols-4 gap-1 ${e ? 'mt-3' : 'mt-4'}`}>
              {transferTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    triggerHapticFeedback(window);
                    setTransferTab(tab.key);
                  }}
                  className={`rounded-xl font-semibold transition-colors ${
                    e ? 'py-2 text-[10px] leading-tight px-0.5' : 'py-2.5 text-sm'
                  } ${
                    transferTab === tab.key
                      ? 'bg-ura-gold text-black'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className={`rounded-2xl border border-ura-border/85 bg-ura-panel-2 ${e ? 'mt-3 p-3' : 'mt-4 p-4'}`}>
              {transferTab === 'send' && (
                <div className={e ? 'space-y-3' : 'space-y-4'}>
                  <div>
                    <p className={`font-semibold text-[#b0b6c2] ${e ? 'text-sm' : 'text-lg'}`}>Recipient Telegram ID</p>
                    <div className={`rounded-2xl border border-ura-border/70 bg-ura-panel/85 ${e ? 'mt-2 px-3 py-2.5' : 'mt-3 px-5 py-4'}`}>
                      <input
                        type="text"
                        value={sendRecipientTelegramId}
                        onChange={(e) => setSendRecipientTelegramId(e.target.value)}
                        className={`w-full bg-transparent font-semibold text-[#c0c6d0] outline-none ${e ? 'text-sm' : 'text-xl'}`}
                        placeholder="e.g. 123456789"
                      />
                    </div>
                  </div>

                  <div>
                    <p className={`font-semibold text-[#b0b6c2] ${e ? 'text-sm' : 'text-lg'}`}>Amount (pearls)</p>
                    <div className={`rounded-2xl border border-ura-border/70 bg-ura-panel/85 ${e ? 'mt-2 px-3 py-2.5' : 'mt-3 px-5 py-4'}`}>
                      <input
                        type="number"
                        min={1}
                        value={sendAmount}
                        onChange={(e) => setSendAmount(e.target.value)}
                        className={`w-full bg-transparent font-semibold text-[#c0c6d0] outline-none ${e ? 'text-sm' : 'text-xl'}`}
                        placeholder="500.00K - 10.00M"
                      />
                    </div>
                    <p className={`text-gray-400 ${e ? 'text-xs mt-1.5' : 'text-sm mt-2'}`}>Min 1 pearl. Send by Telegram ID.</p>
                  </div>

                  <label className={`block rounded-xl border border-ura-line/80 bg-ura-panel/90 ${e ? 'p-2' : 'p-3'}`}>
                    <span className="inline-flex items-center">
                      <Image
                        src={sendPearlType === 'white' ? pearlWhite : pearlGolden}
                        alt="Asset"
                        width={18}
                        height={18}
                        className="h-[18px] w-[18px] object-contain"
                      />
                    </span>
                    <select
                      value={sendPearlType}
                      onChange={(e) => setSendPearlType(e.target.value as PearlType)}
                      className={`mt-1 w-full bg-transparent outline-none ${e ? 'text-sm' : 'text-lg'}`}
                    >
                      <option value="white" className="bg-ura-panel/90">White Pearl</option>
                      <option value="goldish" className="bg-ura-panel/90">Golden Pearl</option>
                    </select>
                  </label>

                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={sending}
                    className={`w-full rounded-2xl bg-ura-gold text-black font-semibold disabled:opacity-60 ${e ? 'py-2.5 text-sm' : 'py-3 text-lg'}`}
                  >
                    {sending ? 'Sending...' : 'Send Now'}
                  </button>
                </div>
              )}

              {transferTab === 'receive' && (
                <div className="space-y-3">
                  <p className={`text-gray-300 ${e ? 'text-sm' : 'text-xl'}`}>Receive using your Telegram ID.</p>
                  <div className={`rounded-2xl border border-ura-border/70 bg-ura-panel/85 ${e ? 'px-3 py-3' : 'px-5 py-4'}`}>
                    <p className={`text-gray-400 ${e ? 'text-xs' : 'text-sm'}`}>Your Telegram ID</p>
                    <p className={`font-semibold mt-1 tabular-nums break-all ${e ? 'text-lg' : 'text-3xl'}`}>
                      {myTelegramId || 'Not detected yet'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onCopyReceiveId}
                    className={`w-full rounded-2xl border border-[#5fa8ff] font-semibold text-[#9fc9ff] ${e ? 'py-2.5 text-sm' : 'py-3 text-lg'}`}
                  >
                    Copy Telegram ID
                  </button>
                </div>
              )}

              {transferTab === 'history' && (
                <div className="space-y-2">
                  {history.map((h) => (
                    <div key={h.id} className="text-sm rounded-lg border border-ura-line/80 bg-ura-panel/90 px-3 py-2 flex items-center justify-between gap-2">
                      <span className="text-gray-300 truncate">{h.eventType || 'EVENT'}</span>
                      <span className="text-white tabular-nums">{Math.floor(h.amount || 0)}</span>
                    </div>
                  ))}
                  {history.length === 0 && <p className="text-sm text-gray-400">No history yet.</p>}
                </div>
              )}

              {transferTab === 'recent' && (
                <div className="space-y-2">
                  {history.slice(0, 5).map((h) => (
                    <div key={h.id} className="text-sm rounded-lg border border-ura-line/80 bg-ura-panel/90 px-3 py-2 flex items-center justify-between gap-2">
                      <span className="text-gray-300 truncate">{h.eventType || 'EVENT'}</span>
                      <span className="text-white tabular-nums">{Math.floor(h.amount || 0)}</span>
                    </div>
                  ))}
                  {history.length === 0 && <p className="text-sm text-gray-400">No recent records.</p>}
                </div>
              )}
            </div>
          </section>

          <section className={`rounded-2xl border border-ura-border/85 bg-gradient-to-r from-ura-panel-2 via-ura-panel-3 to-ura-panel-2 ${e ? 'p-2.5' : 'p-3'}`}>
            <div className="flex items-center justify-between">
              <h2 className={`font-bold ${e ? 'text-sm' : 'text-base'}`}>History</h2>
              {loading ? <span className={`text-gray-400 ${e ? 'text-[10px]' : 'text-xs'}`}>Loading...</span> : null}
            </div>
            <div className="mt-2 space-y-1.5">
              {history.slice(0, 6).map((h) => (
                <div key={h.id} className="text-xs rounded-lg border border-ura-line/80 bg-ura-panel/90 px-2 py-1.5 flex items-center justify-between gap-2">
                  <span className="text-gray-300 truncate">{h.eventType || 'EVENT'}</span>
                  <span className="text-white tabular-nums">{Math.floor(h.amount || 0)}</span>
                </div>
              ))}
              {!loading && history.length === 0 ? (
                <p className="text-xs text-gray-400">No transactions yet.</p>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
