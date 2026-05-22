/**
 * This project was developed by Open Innovations Platforms and Technologies.
 *
 * Copyright (c) Open Innovations Platforms and Technologies. All rights reserved.
 * See utils/company-info.ts for official links and the license text returned by /api/license.
 */

import { OPEN_INNOVATIONS } from '@/utils/company-info';

const telegramNewsLink = OPEN_INNOVATIONS.telegramNewsChannelUrl.trim();
const telegramNewsChatId = OPEN_INNOVATIONS.telegramNewsChatId.trim();
const xLink = OPEN_INNOVATIONS.xTwitterUrl.trim();

export const earnData = [
    {
      category: "Special",
      tasks: [
        {
          title: "Set Up Telegram Mini App Clicker Game",
          points: 5000,
          image: "youtube",
          description: "In this guide, I'll show you how to set up a Next.js 14 project as a Telegram Mini App clicker game.",
          callToAction: "Watch video",
          type: "VISIT",
          taskData: {
            link: "https://youtu.be/OYcqPL1HSTo?si=Fc2zb4lS0d7VUHlR"
          },
          isActive: false
        },
        {
          title: "How to Make a Hamster Kombat Clone",
          points: 5000,
          image: "youtube",
          description: "In this video, you'll be guided through the process of creating a clone of the famous Hamster Kombat app.",
          callToAction: "Watch video",
          type: "VISIT",
          taskData: {
            link: "https://youtu.be/luAn3BlI4go?si=nKvs72-7_WVItXZo"
          },
          isActive: false
        },
        {
          title: "How to Make a Notcoin Clone",
          points: 5000,
          image: "youtube",
          description: "In this video, you'll be guided through the process of creating a clone of the famous Notcoin app.",
          callToAction: "Watch video",
          type: "VISIT",
          taskData: {
            link: "https://youtu.be/TxArGoG9YMA?si=iYofFT70PKuAMnrV"
          },
          isActive: false
        },
        {
          title: "Zoom event reward",
          points: 5000,
          image: "zoom",
          description: "Attended our Zoom call? Enter the code shared during the event to claim your reward.",
          callToAction: "Redeem code",
          type: "REDEEM_CODE",
          taskData: {
            validCodes: ["ZOOM2025"],
            link: "https://zoom.us/j/your-meeting-id"
          },
          isActive: true
        },
      ]
    },
    {
      category: "Leagues",
      tasks: [
        {
          title: `Join ${OPEN_INNOVATIONS.legalName} updates`,
          points: 5000,
          image: "telegram",
          description: `Stay updated with news and announcements from ${OPEN_INNOVATIONS.legalName}.`,
          callToAction: "Join channel",
          type: "TELEGRAM",
          taskData: {
            link: telegramNewsLink || "https://t.me/",
            chatId: telegramNewsChatId || "your_channel"
          },
          isActive: Boolean(telegramNewsLink && telegramNewsChatId)
        },
        {
          title: `Follow ${OPEN_INNOVATIONS.legalName} on X`,
          points: 5000,
          image: "twitter",
          description: `Follow ${OPEN_INNOVATIONS.legalName} on X for updates and community news.`,
          callToAction: "Follow on X",
          type: "VISIT",
          taskData: {
            link: xLink || "https://x.com/"
          },
          isActive: Boolean(xLink)
        },
      ]
    },
    {
      category: "Refs",
      tasks: [
        {
          title: "Invite 3 friends",
          points: 25000,
          image: "friends",
          description: "Invite your friends to join the Ice community and earn bonus points for each successful referral.",
          callToAction: "Invite friends",
          type: "REFERRAL",
          taskData: {
            friendsNumber: 3
          },
          isActive: true  
        }
      ]
    },
  ];