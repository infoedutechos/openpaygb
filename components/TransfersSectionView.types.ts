export interface TransferItem {
  id: string;
  type: 'sent' | 'received';
  amount: number;
  feeAmount?: number;
  otherName: string;
  otherTelegramId: string;
  createdAt: string;
  isDonation?: boolean;
}

export interface RecentTransfer {
  id: string;
  amount: number;
  feeAmount?: number;
  senderName: string;
  senderTelegramId: string;
  recipientName: string;
  recipientTelegramId: string;
  createdAt: string;
  isDonation?: boolean;
}

export interface TransfersSectionViewProps {
  activeTab: 'send' | 'receive' | 'my' | 'recent';
  setActiveTab: (tab: 'send' | 'receive' | 'my' | 'recent') => void;
  recipientTelegramId: string;
  setRecipientTelegramId: (v: string) => void;
  amount: string;
  setAmount: (v: string) => void;
  isSending: boolean;
  myTransfers: TransferItem[];
  recentTransfers: RecentTransfer[];
  isLoadingMe: boolean;
  isLoadingRecent: boolean;
  recentError: string | null;
  copied: boolean;
  myTelegramId: string | null;
  onSend: () => void;
  onCopyTelegramId: () => void;
  onTabClick: (tab: 'send' | 'receive' | 'my' | 'recent') => void;
}
