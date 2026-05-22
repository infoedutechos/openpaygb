/**
 * TransfersSectionView – presentational UI for Send/Receive PEARLS
 * Uses React.createElement to avoid SWC JSX parser bug
 */

'use client';

import React from 'react';
import TransfersSectionRoot from '@/components/TransfersSectionRoot';
import IceCube from '@/icons/IceCube';
import Copy from '@/icons/Copy';
import { formatNumber } from '@/utils/ui';
import { TRANSFER_MIN, TRANSFER_MAX, TRANSFER_FEE_PERCENT } from '@/utils/consts';
import type { TransfersSectionViewProps } from './TransfersSectionView.types';

export { type TransferItem, type RecentTransfer } from './TransfersSectionView.types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const TABS = ['send', 'receive', 'my', 'recent'] as const;

const TAB_LABELS: Record<string, string> = { send: 'Send', receive: 'Receive', my: 'My history', recent: 'Recent' };

export default function TransfersSectionView(props: TransfersSectionViewProps) {
  const tabsRow = React.createElement(
    'div',
    { className: 'flex gap-1 p-1 rounded-xl bg-ura-panel-2 border border-ura-border/85 mb-4' },
    ...TABS.map((tab) =>
      React.createElement(
        'button',
        {
          key: tab,
          type: 'button',
          onClick: () => props.onTabClick(tab),
          className: `flex-1 py-2 px-2 rounded-lg text-xs font-semibold capitalize ${props.activeTab === tab ? 'bg-ura-gold text-black' : 'text-gray-400 hover:text-white hover:bg-ura-panel-2'}`,
        },
        TAB_LABELS[tab] ?? tab
      )
    )
  );

  let sendTab = null;
  if (props.activeTab === 'send') {
    const feeBlock =
      props.amount && Number(props.amount) >= TRANSFER_MIN
        ? React.createElement(
            'div',
            { className: 'rounded-lg bg-ura-panel border border-ura-border/75 px-3 py-2 text-sm' },
            React.createElement('p', { className: 'text-gray-400' }, 'Fee ', TRANSFER_FEE_PERCENT, '%: ', React.createElement('span', { className: 'text-[#f3ba2f]' }, formatNumber(Math.floor((Number(props.amount) * TRANSFER_FEE_PERCENT) / 100)), ' PEARLS')),
            React.createElement('p', { className: 'text-gray-300 mt-0.5' }, 'Recipient gets: ', React.createElement('span', { className: 'text-emerald-400' }, formatNumber(Math.floor(Number(props.amount) - (Number(props.amount) * TRANSFER_FEE_PERCENT) / 100)), ' PEARLS'))
          )
        : null;
    sendTab = React.createElement(
      'div',
      { className: 'bg-ura-panel-2 rounded-xl p-4 space-y-4' },
      React.createElement(
        'div',
        null,
        React.createElement('label', { className: 'block text-gray-400 text-sm mb-2' }, 'Recipient Telegram ID'),
        React.createElement('input', {
          type: 'text',
          value: props.recipientTelegramId,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => props.setRecipientTelegramId(e.target.value.replace(/\D/g, '')),
          placeholder: 'e.g. 123456789',
          className: 'w-full bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white',
        })
      ),
      React.createElement(
        'div',
        null,
        React.createElement('label', { className: 'block text-gray-400 text-sm mb-2' }, 'Amount (PEARLS)'),
        React.createElement('input', {
          type: 'number',
          value: props.amount,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => props.setAmount(e.target.value),
          placeholder: `${formatNumber(TRANSFER_MIN)} - ${formatNumber(TRANSFER_MAX)}`,
          min: TRANSFER_MIN,
          max: TRANSFER_MAX,
          className: 'w-full bg-ura-panel border border-ura-border/75 rounded-lg px-3 py-2 text-white',
        })
      ),
      feeBlock,
      React.createElement('p', { className: 'text-gray-400 text-xs' }, 'Min ', formatNumber(TRANSFER_MIN), ' PEARLS, max ', formatNumber(TRANSFER_MAX), ' PEARLS. Daily limit: 50M PEARLS.'),
      React.createElement('button', {
        onClick: props.onSend,
        disabled: props.isSending || !props.recipientTelegramId.trim() || !props.amount,
        className: 'w-full py-3 rounded-xl bg-ura-gold text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed',
      }, props.isSending ? 'Sending...' : 'Send PEARLS')
    );
  }

  let receiveTab = null;
  if (props.activeTab === 'receive') {
    receiveTab = React.createElement(
      'div',
      { className: 'bg-ura-panel-2 rounded-xl p-4' },
      React.createElement('p', { className: 'text-gray-400 text-sm mb-3' }, 'Share your Telegram ID so others can send you PEARLS.'),
      React.createElement(
        'button',
        { onClick: props.onCopyTelegramId, className: 'w-full flex items-center justify-between py-3 px-4 bg-ura-panel rounded-lg border border-ura-border/75' },
        React.createElement('span', { className: 'font-mono text-white' }, props.myTelegramId ?? '-'),
        React.createElement(Copy, { className: props.copied ? 'text-emerald-500' : 'text-[#8b8e93]' })
      )
    );
  }

  let myTab = null;
  if (props.activeTab === 'my') {
    if (props.isLoadingMe) {
      myTab = React.createElement('div', { className: 'bg-ura-panel-2 rounded-xl p-4' }, React.createElement('p', { className: 'text-gray-400 text-center py-4' }, 'Loading...'));
    } else if (props.myTransfers.length === 0) {
      myTab = React.createElement('div', { className: 'bg-ura-panel-2 rounded-xl p-4' }, React.createElement('p', { className: 'text-gray-400 text-center py-4' }, 'No transfers yet'));
    } else {
      myTab = React.createElement(
        'div',
        { className: 'bg-ura-panel-2 rounded-xl p-4' },
        React.createElement(
          'div',
          { className: 'space-y-2 max-h-48 overflow-y-auto' },
          ...props.myTransfers.map((t) =>
            React.createElement(
              'div',
              { key: t.id, className: 'py-2 px-3 rounded-lg bg-ura-panel' },
              React.createElement(
                'div',
                { className: 'flex justify-between items-center' },
                React.createElement(
                  'div',
                  null,
                  React.createElement('span', { className: t.type === 'sent' ? 'text-rose-400' : 'text-emerald-400' }, t.type === 'sent' ? '-' : '+', formatNumber(t.amount), ' PEARLS'),
                  React.createElement('span', { className: 'text-gray-400 text-sm ml-2' }, t.isDonation ? (t.type === 'sent' ? 'Donation to Treasury' : 'Donation from ' + t.otherName) : (t.type === 'sent' ? 'to' : 'from') + ' ' + t.otherName)
                ),
                React.createElement('span', { className: 'text-gray-500 text-xs' }, formatDate(t.createdAt))
              ),
              t.isDonation
                ? React.createElement('p', { className: 'text-amber-400/80 text-xs mt-1 ml-0' }, 'Charity donation')
                : React.createElement('p', { className: 'text-gray-500 text-xs mt-1 ml-0' }, 'Fee ', TRANSFER_FEE_PERCENT, '%: ', formatNumber(t.feeAmount ?? 0), ' PEARLS')
            )
          )
        )
      );
    }
  }

  let recentTab = null;
  if (props.activeTab === 'recent') {
    if (props.isLoadingRecent) {
      recentTab = React.createElement('div', { className: 'bg-ura-panel-2 rounded-xl p-4' }, React.createElement('p', { className: 'text-gray-400 text-center py-4' }, 'Loading...'));
    } else if (props.recentError) {
      recentTab = React.createElement('div', { className: 'bg-ura-panel-2 rounded-xl p-4' }, React.createElement('p', { className: 'text-amber-400 text-center py-4 text-sm' }, props.recentError));
    } else if (props.recentTransfers.length === 0) {
      recentTab = React.createElement('div', { className: 'bg-ura-panel-2 rounded-xl p-4' }, React.createElement('p', { className: 'text-gray-400 text-center py-4' }, 'No recent transactions'));
    } else {
      recentTab = React.createElement(
        'div',
        { className: 'bg-ura-panel-2 rounded-xl p-4' },
        React.createElement(
          'div',
          { className: 'space-y-2 max-h-64 overflow-y-auto' },
          ...props.recentTransfers.map((t) =>
            React.createElement(
              'div',
              { key: t.id, className: 'py-2 px-3 rounded-lg bg-ura-panel' },
              React.createElement(
                'div',
                { className: 'flex justify-between items-center' },
                React.createElement(
                  'div',
                  { className: 'flex items-center gap-2' },
                  React.createElement(IceCube, { className: 'w-5 h-5 text-[#f3ba2f] flex-shrink-0' }),
                  React.createElement('span', { className: 'text-white font-medium' }, formatNumber(t.amount), ' PEARLS'),
                  React.createElement('span', { className: 'text-gray-400 text-sm truncate' }, t.isDonation ? `${t.senderName} donated to Treasury` : `${t.senderName} → ${t.recipientName}`)
                ),
                React.createElement('span', { className: 'text-gray-500 text-xs flex-shrink-0' }, formatDate(t.createdAt))
              ),
              t.isDonation
                ? React.createElement('p', { className: 'text-amber-400/80 text-xs mt-1 ml-0' }, 'Charity donation')
                : React.createElement('p', { className: 'text-gray-500 text-xs mt-1 ml-0' }, 'Fee ', TRANSFER_FEE_PERCENT, '%: ', formatNumber(t.feeAmount ?? 0), ' PEARLS')
            )
          )
        )
      );
    }
  }

  return React.createElement(
    TransfersSectionRoot,
    { className: 'mb-6' },
    React.createElement('h2', { className: 'text-base mt-8 mb-4' }, 'Send & Receive PEARLS'),
    tabsRow,
    sendTab,
    receiveTab,
    myTab,
    recentTab
  );
}
