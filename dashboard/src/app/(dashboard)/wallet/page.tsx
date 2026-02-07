'use client';

import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useState, useEffect, useCallback } from 'react';
import { 
  Wallet, 
  Gift, 
  Copy, 
  Check, 
  ExternalLink, 
  RefreshCw,
  Clock,
  Coins,
  LogOut,
  Loader2
} from 'lucide-react';

interface Transaction {
  id: string;
  type: 'claim' | 'reward' | 'transfer';
  amount: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
  txHash?: string;
}

interface WalletBalance {
  balance: string;
  pendingRewards: string;
}

export default function WalletPage() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets } = useWallets();
  
  const [balance, setBalance] = useState<WalletBalance>({ balance: '0', pendingRewards: '0' });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);

  const embeddedWallet = wallets.find(w => w.walletClientType === 'privy');
  const walletAddress = embeddedWallet?.address || user?.wallet?.address;
  const shortAddress = walletAddress 
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : '';

  const fetchWalletData = useCallback(async () => {
    if (!walletAddress) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch balance
      const balanceRes = await fetch(`/api/wallet/balance?address=${walletAddress}`);
      if (balanceRes.ok) {
        const balanceData = await balanceRes.json();
        setBalance(balanceData);
      }

      // Fetch transaction history
      const historyRes = await fetch(`/api/wallet/history?address=${walletAddress}`);
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setTransactions(historyData.transactions || []);
      }
    } catch (err) {
      console.error('Failed to fetch wallet data:', err);
      setError('Failed to load wallet data');
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    if (authenticated && walletAddress) {
      fetchWalletData();
    }
  }, [authenticated, walletAddress, fetchWalletData]);

  const handleCopy = async () => {
    if (!walletAddress) return;
    await navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClaim = async () => {
    if (!walletAddress) return;
    
    setIsClaiming(true);
    setError(null);
    setClaimSuccess(null);
    
    try {
      const res = await fetch('/api/wallet/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: walletAddress }),
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        setClaimSuccess(`Successfully claimed ${data.amount} $NUDGE!`);
        await fetchWalletData();
      } else {
        setError(data.error || 'Failed to claim rewards');
      }
    } catch (err) {
      console.error('Claim error:', err);
      setError('Failed to claim rewards');
    } finally {
      setIsClaiming(false);
    }
  };

  const formatBalance = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return num.toLocaleString(undefined, { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 2 
    });
  };

  const hasPendingRewards = parseFloat(balance.pendingRewards) > 0;

  // Show loading for max 3 seconds, then show connect button anyway
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setLoadingTimeout(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!ready && !loadingTimeout) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  // Not connected state
  if (!authenticated) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Wallet</h1>
        
        <div className="card text-center py-12">
          <div className="p-4 bg-accent/20 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <Wallet className="w-10 h-10 text-accent" />
          </div>
          
          <h2 className="text-2xl font-bold mb-3">Connect Your Wallet</h2>
          <p className="text-text-muted mb-8 max-w-md mx-auto">
            Connect to earn $NUDGE tokens for your check-ins and streaks
          </p>

          <div className="space-y-4 max-w-sm mx-auto mb-8">
            <FeatureItem icon={Gift} text="Earn tokens for daily check-ins" />
            <FeatureItem icon={Coins} text="Bonus rewards for streaks" />
            <FeatureItem icon={Wallet} text="Secure embedded wallet" />
          </div>

          <button
            onClick={login}
            className="btn btn-primary inline-flex items-center gap-2 px-6 py-3"
          >
            <Wallet className="w-5 h-5" />
            Connect Wallet
          </button>

          <p className="text-xs text-text-muted mt-6">
            Powered by Privy • Monad
          </p>
        </div>
      </div>
    );
  }

  // Connected state
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Wallet</h1>
        <button
          onClick={fetchWalletData}
          disabled={isLoading}
          className="btn btn-secondary inline-flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-danger/20 border border-danger/30 text-danger rounded-lg p-4 mb-6">
          {error}
        </div>
      )}

      {claimSuccess && (
        <div className="bg-success/20 border border-success/30 text-success rounded-lg p-4 mb-6">
          {claimSuccess}
        </div>
      )}

      <div className="grid gap-6">
        {/* Connected Wallet Card */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted mb-1">Connected Wallet</p>
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 bg-success rounded-full"></span>
                <code className="text-lg font-mono">{shortAddress}</code>
                <button
                  onClick={handleCopy}
                  className="text-text-muted hover:text-text transition-colors"
                  title="Copy address"
                >
                  {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                </button>
                <a
                  href={`https://monadexplorer.com/address/${walletAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-muted hover:text-accent transition-colors"
                  title="View on Explorer"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
            <button
              onClick={logout}
              className="btn btn-secondary inline-flex items-center gap-2 text-sm"
            >
              <LogOut className="w-4 h-4" />
              Disconnect
            </button>
          </div>
        </div>

        {/* Balance Card */}
        <div className="card text-center">
          <p className="text-sm text-text-muted mb-2">$NUDGE Balance</p>
          <div className="flex items-baseline justify-center gap-2">
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
            ) : (
              <>
                <span className="text-5xl font-bold">{formatBalance(balance.balance)}</span>
                <span className="text-xl text-text-muted">NUDGE</span>
              </>
            )}
          </div>
          
          <div className="flex justify-center gap-8 mt-6 pt-6 border-t border-surface-light">
            <div>
              <p className="text-sm text-text-muted">Network</p>
              <p className="font-medium">Monad</p>
            </div>
            <div>
              <p className="text-sm text-text-muted">Token</p>
              <p className="font-medium">$NUDGE</p>
            </div>
          </div>
        </div>

        {/* Pending Rewards Card */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-text-muted mb-1">Pending Rewards</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-accent">
                  {formatBalance(balance.pendingRewards)}
                </span>
                <span className="text-text-muted">NUDGE</span>
              </div>
            </div>
            <Gift className="w-8 h-8 text-accent/50" />
          </div>

          <button
            onClick={handleClaim}
            disabled={!hasPendingRewards || isClaiming}
            className={`w-full btn ${hasPendingRewards ? 'btn-primary' : 'bg-surface-light text-text-muted cursor-not-allowed'} py-3 inline-flex items-center justify-center gap-2`}
          >
            {isClaiming ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Claiming...
              </>
            ) : (
              <>
                <Gift className="w-5 h-5" />
                Claim Rewards
              </>
            )}
          </button>

          <div className="mt-6 pt-4 border-t border-surface-light">
            <p className="text-sm text-text-muted font-medium mb-3">How to earn $NUDGE</p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <EarningItem icon="✓" label="Daily Check-in" amount="+10" />
              <EarningItem icon="🔥" label="7-Day Streak" amount="+50" />
              <EarningItem icon="🎯" label="Goal Complete" amount="+25" />
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-10 h-10 text-text-muted/30 mx-auto mb-3" />
              <p className="text-text-muted">No transactions yet</p>
              <p className="text-sm text-text-muted/60">Complete check-ins to earn rewards</p>
            </div>
          ) : (
            <div className="divide-y divide-surface-light">
              {transactions.map((tx) => (
                <TransactionRow key={tx.id} transaction={tx} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string }>, text: string }) {
  return (
    <div className="flex items-center gap-3 text-left">
      <Icon className="w-5 h-5 text-accent" />
      <span className="text-text-muted">{text}</span>
    </div>
  );
}

function EarningItem({ icon, label, amount }: { icon: string, label: string, amount: string }) {
  return (
    <div>
      <span className="text-2xl">{icon}</span>
      <p className="text-xs text-text-muted mt-1">{label}</p>
      <p className="text-sm font-bold text-success">{amount}</p>
    </div>
  );
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const typeLabels = {
    claim: 'Claim',
    reward: 'Reward',
    transfer: 'Transfer',
  };

  const statusColors = {
    completed: 'text-success',
    pending: 'text-warning',
    failed: 'text-danger',
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full ${statusColors[transaction.status].replace('text-', 'bg-')}/20 flex items-center justify-center`}>
          {transaction.type === 'claim' ? (
            <Gift className={`w-4 h-4 ${statusColors[transaction.status]}`} />
          ) : (
            <Coins className={`w-4 h-4 ${statusColors[transaction.status]}`} />
          )}
        </div>
        <div>
          <p className="font-medium">{typeLabels[transaction.type]}</p>
          <p className="text-sm text-text-muted">{formatDate(transaction.timestamp)}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-semibold text-success">+{transaction.amount}</p>
        <p className={`text-xs ${statusColors[transaction.status]}`}>
          {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
        </p>
      </div>
    </div>
  );
}
