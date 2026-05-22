// images/index.ts

/**
 * This project was developed by Open Innovations Platforms and Technologies.
 *
 * Copyright (c) Open Innovations Platforms and Technologies. All rights reserved.
 * See utils/company-info.ts for official links and the license text returned by /api/license.
 */

import hamsterExchange from "./hamster-exchange.png";
import binanceLogo from "./binance-logo.png";
import dollarCoin from "./dollar-coin.png";
import dailyReward from "./daily-reward.png";
import dailyCipher from "./daily-cipher.png";
import dailyCombo from "./daily-combo.png";
// Version: 3 - AfroLumens branding update - Cache bust
import mainCharacter from "./main-character.png";
import hamsterCoin from "./hamster-coin.png";
import iceToken from "./ice-token.png";
import airdropHero from "./airdrop-hero.png";
import lightning from "./lightning.png";
import battery from "./battery.png";
import multiclick from "./multiclick.png";
import baseGift from "./base-gift.png";
import collection from "./collection.png";
import total from "./Total.png";
import game from "./Game.png";
import taps from "./Taps.png";
import bigGift from "./big-gift.png";
import youtube from "./youtube.png";
import telegram from "./telegram.png";
import twitter from "./twittter.png";
import friends from "./friends.png";
import tonWallet from "./ton-wallet.png";
import blockchain from "./blockchain.png";
import afrolumens from "./afrolumens.png";
import mitroplus from "./mitroplus.png";
import troncoin from "./troncoin.png";
import luminanetwork from "./luminanetwork.png";
import sun from "./sun.png";
import afro from "./afro.png";
import autodex from "./autodex.png";
import jetideas from "./jetideas.png";
import tiktalk from "./tiktalk.png";
import website from "./website.jpg";
import zoom from "./zoom.png";
import crystal1 from "./crystals/crystal1.png";
import crystal2 from "./crystals/crystal2.png";
import crystal3 from "./crystals/crystal3.png";
import crystal4 from "./crystals/crystal4.png";
import crystal5 from "./crystals/crystal5.png";
import crystal6 from "./crystals/crystal6.png";
import crystal7 from "./crystals/crystal7.png";
import crystal8 from "./crystals/crystal8.png";
import crystal9 from "./crystals/crystal9.png";
import crystal10 from "./crystals/crystal10.png";
import paidTrophy1 from "./paid-trophy1.png";
import paidTrophy2 from "./paid-trophy2.png";
import botUrlQr from "./bot-url-qr.png";
import announcements from "./Announcements.png";
import roketicon from "./roketicon.gif";
import uraLanding from "./ura-landing.png";
import defaultProfileAvatar from "./default-profile-avatar.png";
import uraFiscalFunBanner from "./ura-fiscal-fun-banner.png";
import uraFiscalFunHomeBanner from "./ura-fiscal-fun-home-banner.png";
import uraDailyPearlCoins from "./ura-daily-pearl-coins.png";
import uraTreasuryCounter from "./ura-treasury-counter.png";
import pearlWhite from "./pearl-white.png";
import pearlBlue from "./pearl-blue.png";
import pearlGolden from "./pearl-golden.png";
import rankWhite from "./rank-white.png";
import rankSilver from "./rank-silver.png";
import rankBlue from "./rank-blue.png";
import rankGold from "./rank-gold.png";
import navHome from "./nav-home.png";
import navLearn from "./nav-learn.png";
import navServices from "./nav-services.png";
import earnRewardsIcon from "./earn-rewards-icon.png";
import navGuild from "./nav-guild-icon.png";
import uraLogoCircle from "./ura-logo-circle.png";


export {
    hamsterExchange,
    binanceLogo,
    dollarCoin,
    dailyReward,
    dailyCipher,
    dailyCombo,
    mainCharacter,
    hamsterCoin,
    iceToken,
    airdropHero,
    lightning,
    battery,
    multiclick,
    baseGift,
    collection,
    total,
    game,
    taps,
    bigGift,
    youtube,
    telegram,
    twitter,
    friends,
    tonWallet,
    crystal1,
    crystal2,
    crystal3,
    crystal4,
    crystal5,
    crystal6,
    crystal7,
    crystal8,
    crystal9,
    crystal10,
    paidTrophy1,
    paidTrophy2,
    botUrlQr,
    announcements,
    roketicon,
    uraLanding,
    defaultProfileAvatar,
    uraFiscalFunBanner,
    uraFiscalFunHomeBanner,
    uraDailyPearlCoins,
    uraTreasuryCounter,
    pearlWhite,
    pearlBlue,
    pearlGolden,
    rankWhite,
    rankSilver,
    rankBlue,
    rankGold,
    navHome,
    navLearn,
    navServices,
    earnRewardsIcon,
    navGuild,
    uraLogoCircle,
    blockchain,
    afrolumens,
    mitroplus,
    troncoin,
    luminanetwork,
    sun,
    afro,
    autodex,
    jetideas,
    tiktalk,
    website,
    zoom
};

/** Display names for image keys (e.g. in admin task image selector) */
export const imageDisplayNames: Record<string, string> = {
    tiktalk: 'TikTalk',
    website: 'Website',
    zoom: 'Zoom',
    pearlWhite: 'White pearl',
    pearlBlue: 'Blue pearl',
    pearlGolden: 'Golden pearl',
};

export const imageMap: Record<string, any> = {
    youtube,
    telegram,
    twitter,
    friends,
    binanceLogo,
    dollarCoin,
    baseGift,
    dailyCipher,
    dailyCombo,
    pearlWhite,
    pearlBlue,
    pearlGolden,
    blockchain,
    afrolumens,
    mitroplus,
    troncoin,
    luminanetwork,
    sun,
    afro,
    autodex,
    jetideas,
    tiktalk,
    website,
    zoom,
    // Aliases so display names or alternate casing still resolve
    TikTalk: tiktalk,
    Website: website,
};

/** Legacy task keys still stored as AfroLumens branding → show URA white pearl in Earn / task popup */
const TASK_IMAGE_ALIASES: Record<string, string> = {
    afrolumens: 'pearlWhite',
};

/** Resolve task image src (tries key as-is then lowercase so "TikTalk" and "tiktalk" both work). */
export function getTaskImageSrc(imageKey: string | null | undefined) {
    if (!imageKey || typeof imageKey !== 'string') return undefined;
    let key = imageKey.trim();
    const lower = key.toLowerCase();
    const aliased = TASK_IMAGE_ALIASES[key] ?? TASK_IMAGE_ALIASES[lower];
    if (aliased) key = aliased;
    return imageMap[key] ?? imageMap[key.toLowerCase()] ?? undefined;
}