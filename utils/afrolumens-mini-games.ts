/**
 * Afrolumens Tap2Earn mini-games catalog (20 culturally themed games).
 * Tiers: casual (low reward), skill (medium), competitive (high).
 * minLevel: unlock at player level (1 = first 3 games, 5 = 7 games, 10 = all).
 * intro: full details shown as the introductory part when a game is opened.
 */

export type MiniGameTier = 'casual' | 'skill' | 'competitive';

export interface GameIntro {
  type: string;
  concept: string;
  gameplay: string;
  rewardLogic: string;
  nftUtility?: string;
}

export interface AfrolumensGameDef {
  id: string;
  name: string;
  description: string;
  tier: MiniGameTier;
  emoji: string;
  minLevel: number;
  /** If implemented in-app (tap_challenge, lucky_spin, drums_baobab) */
  implemented?: boolean;
  /** Full introductory details shown when the game is opened */
  intro: GameIntro;
}

export const AFROLUMENS_MINI_GAMES: AfrolumensGameDef[] = [
  {
    id: 'tap_challenge',
    name: 'Umeme Run',
    description: 'Tap 18 times in 3 seconds',
    tier: 'skill',
    emoji: '⚡',
    minLevel: 1,
    implemented: true,
    intro: {
      type: 'Reflex Tap Game',
      concept: 'Quick taps in a short window to earn PEARLS.',
      gameplay: 'Tap the target number of times within the time limit. Multiple attempts per day.',
      rewardLogic: 'Success = fixed PEARLS reward. Daily attempt cap applies.',
      nftUtility: 'Future: Speed or time boost cards.',
    },
  },
  {
    id: 'lucky_spin',
    name: 'Lucky Spin',
    description: 'Spin the wheel for a random reward',
    tier: 'casual',
    emoji: '🎡',
    minLevel: 1,
    implemented: true,
    intro: {
      type: 'Luck-Based Spin',
      concept: 'Spin the wheel once per day for a random PEARLS reward.',
      gameplay: 'Tap to spin; reward is determined by the segment where the wheel stops.',
      rewardLogic: 'Random reward from a fixed set of values. One spin per day.',
      nftUtility: 'Future: Rarity cards can unlock bonus segments.',
    },
  },
  {
    id: 'drums_baobab',
    name: 'Drums of the Baobab',
    description: 'Tap to ancestral drum beats; rhythm accuracy wins',
    tier: 'skill',
    emoji: '🔥',
    minLevel: 1,
    implemented: true,
    intro: {
      type: 'Rhythm Tap Game',
      concept: 'Players tap to ancestral drum beats to summon spiritual energy.',
      gameplay: 'Beats appear in a rhythm pattern. Tap in correct timing. Combo meter increases multiplier.',
      rewardLogic: 'Accuracy % determines reward. Higher rarity Spirit cards increase combo duration. Daily cap applied.',
      nftUtility: 'Spirit cards increase rhythm window tolerance. Innovation cards increase combo multiplier.',
    },
  },
  {
    id: 'savanna_hunt',
    name: 'Savanna Hunt',
    description: 'Tap valuable targets, avoid sacred animals',
    tier: 'skill',
    emoji: '🐆',
    minLevel: 1,
    implemented: true,
    intro: {
      type: 'Reflex Tap Game',
      concept: 'Wild animals appear randomly — tap valuable targets, avoid sacred ones.',
      gameplay: 'Tap antelope/golden → +points and combo. Tap sacred → lose all combo streak points and multiplier resets.',
      rewardLogic: 'Randomized spawn. Score tied to skill. Max 5 sessions per day. 80 PEARLS/point, cap 40k.',
      nftUtility: 'Zulu warrior cards increase hunt speed. Kush cards increase rare spawn chance.',
    },
  },
  {
    id: 'empire_builder',
    name: 'Empire Builder Blitz',
    description: 'Allocate resources, avoid corruption, build in time',
    tier: 'skill',
    emoji: '🏛',
    minLevel: 2,
    intro: {
      type: 'Strategic Tap Builder',
      concept: 'Players rapidly allocate resources (gold, stone, knowledge).',
      gameplay: 'Tap resource icons. Avoid corruption events. Build structure within time.',
      rewardLogic: 'Based on efficiency %. Civilization bonus applies.',
      nftUtility: 'High rarity Kingdom cards reduce corruption rate.',
    },
  },
  {
    id: 'ancestral_oracle',
    name: 'Ancestral Oracle',
    description: 'Choose destiny path: reward, neutral, or penalty',
    tier: 'casual',
    emoji: '✨',
    minLevel: 2,
    intro: {
      type: 'Risk & Prediction Game',
      concept: 'Player chooses a destiny path (3 choices).',
      gameplay: 'Each path: +Reward, Neutral, or Minor penalty. Decision-making matters.',
      rewardLogic: 'One choice per session. Balanced risk vs reward.',
      nftUtility: 'High rarity Spirit cards reveal one safe path.',
    },
  },
  {
    id: 'clan_duel',
    name: 'Clan Duel Tap Arena',
    description: 'PvP real-time tap duel',
    tier: 'competitive',
    emoji: '⚔',
    minLevel: 5,
    intro: {
      type: 'PvP Reaction Game',
      concept: 'Two players match in real-time tap duel.',
      gameplay: 'Rapid tap bursts. Timed shield taps. Ability activation window.',
      rewardLogic: 'Winner takes small % pool. Platform takes small burn fee. Prevents inflation — rewards are player-funded.',
      nftUtility: 'Leader cards can unlock special abilities in the arena.',
    },
  },
  {
    id: 'scholar_trial',
    name: "Scholar's Trial",
    description: 'African history & kingdoms quiz',
    tier: 'skill',
    emoji: '📜',
    minLevel: 2,
    intro: {
      type: 'Knowledge Quiz Mini-Game',
      concept: 'African history, kingdoms, and innovations questions.',
      gameplay: 'Answer multiple-choice questions before time runs out. Educational and engaging.',
      rewardLogic: 'Correct answers = PEARLS. Low inflation. Easy retention mechanic.',
      nftUtility: 'Higher tier innovation cards increase time limit and reveal hints.',
    },
  },
  {
    id: 'caravan_rush',
    name: 'Caravan Rush',
    description: 'Endless runner: jump caravans over desert hazards',
    tier: 'casual',
    emoji: '🌊',
    minLevel: 3,
    intro: {
      type: 'Endless Runner Tap',
      concept: 'Tap to jump caravans over desert hazards.',
      gameplay: 'Increasing speed. Combo multiplier. Resource drops.',
      rewardLogic: 'Distance and combos determine reward. Daily session cap.',
      nftUtility: 'Mali cards increase trade bonus. Swahili cards boost caravan speed.',
    },
  },
  {
    id: 'bronze_forge',
    name: 'Bronze Forge',
    description: 'Forge artifacts at perfect temperature (Benin)',
    tier: 'skill',
    emoji: '🎮',
    minLevel: 3,
    intro: {
      type: 'Precision Timing Game',
      concept: 'Forge artifacts from the Kingdom of Benin.',
      gameplay: 'Heat meter rises. Tap at perfect temperature. Too early or late = weaker artifact.',
      rewardLogic: 'Accuracy % = artifact value. Higher rarity cards increase "perfect window".',
      nftUtility: 'Benin Kingdom cards widen the perfect forge window.',
    },
  },
  {
    id: 'granite_guardian',
    name: 'Granite Guardian',
    description: 'Defend walls in waves (Great Zimbabwe)',
    tier: 'skill',
    emoji: '🛡',
    minLevel: 4,
    intro: {
      type: 'Defense Tap Game',
      concept: 'Inspired by Great Zimbabwe. Waves attack your walls.',
      gameplay: 'Tap weak points. Activate shields. Survive as long as you can.',
      rewardLogic: 'Waves survived and accuracy determine reward.',
      nftUtility: 'Kingdom cards increase wall durability.',
    },
  },
  {
    id: 'spear_warrior',
    name: 'Spear of the Warrior',
    description: 'Charge & release at moving target',
    tier: 'skill',
    emoji: '🔱',
    minLevel: 3,
    intro: {
      type: 'Skill Aiming Tap',
      concept: 'Tap & hold to charge, release at moving target.',
      gameplay: 'Time your release. Headshot = bonus. Precision matters.',
      rewardLogic: 'Hit accuracy and headshots scale reward.',
      nftUtility: 'Zulu-type leader cards increase critical chance.',
    },
  },
  {
    id: 'river_nile',
    name: 'River of the Nile',
    description: 'Avoid crocodiles, tap fish for energy',
    tier: 'casual',
    emoji: '🌊',
    minLevel: 2,
    intro: {
      type: 'Reaction Stream Game',
      concept: 'Avoid crocodiles, tap fish for energy.',
      gameplay: 'Objects move along the stream. Tap good targets, avoid dangers.',
      rewardLogic: 'Fish collected and survival time = reward. Daily cap.',
      nftUtility: 'Higher Knowledge cards slow obstacle speed.',
    },
  },
  {
    id: 'market_timbuktu',
    name: 'Market of Timbuktu',
    description: 'Buy low, sell high within timer',
    tier: 'skill',
    emoji: '📜',
    minLevel: 4,
    intro: {
      type: 'Trade Arbitrage Mini-Game',
      concept: 'Inspired by Timbuktu. Prices fluctuate rapidly.',
      gameplay: 'Buy low, sell high within timer. Decision speed = profit %.',
      rewardLogic: 'Profit % from trades determines PEARLS reward. Perfect for economy-based boosts.',
      nftUtility: 'Trade and Kingdom NFTs boost profit multipliers.',
    },
  },
  {
    id: 'mask_ancestors',
    name: 'Mask of the Ancestors',
    description: 'Match tribal masks before timer ends',
    tier: 'casual',
    emoji: '🎭',
    minLevel: 2,
    intro: {
      type: 'Memory Flip Game',
      concept: 'Match tribal masks before the timer ends.',
      gameplay: 'Flip cards to find pairs. Remember positions. Complete before time runs out.',
      rewardLogic: 'Pairs matched and time left = reward.',
      nftUtility: 'Spirit cards increase preview duration.',
    },
  },
  {
    id: 'baobab_climb',
    name: 'Baobab Climb',
    description: 'Tap left/right branches, avoid falling',
    tier: 'casual',
    emoji: '🌳',
    minLevel: 3,
    intro: {
      type: 'Vertical Tap Climber',
      concept: 'Climb the great baobab by choosing branches.',
      gameplay: 'Tap left/right branches. Avoid falling. Speed increases over time.',
      rewardLogic: 'Height reached and combos = reward. Daily cap.',
      nftUtility: 'Rare cards reduce fall penalty.',
    },
  },
  {
    id: 'gadaa_council',
    name: 'Gadaa Council',
    description: 'Strategy: 3 policy options affect the match',
    tier: 'skill',
    emoji: '🏛',
    minLevel: 5,
    intro: {
      type: 'Strategy Decision Game',
      concept: 'Inspired by Oromia. Choose policies that affect the match.',
      gameplay: '3 policy options. Each affects future rounds. Long-term strategy reward.',
      rewardLogic: 'Outcome based on sequence of decisions. Adds governance depth.',
      nftUtility: 'Governance and Council cards unlock extra options.',
    },
  },
  {
    id: 'desert_mirage',
    name: 'Desert Mirage',
    description: 'Identify real treasure among illusions',
    tier: 'skill',
    emoji: '🌵',
    minLevel: 4,
    intro: {
      type: 'Illusion Detection Game',
      concept: 'Identify real treasure among illusions.',
      gameplay: 'Speed + accuracy matter. Spot the real item before time runs out.',
      rewardLogic: 'Correct picks and speed determine reward.',
      nftUtility: 'Spirit rarity increases clue hints.',
    },
  },
  {
    id: 'lionheart_arena',
    name: 'Lionheart Arena',
    description: 'Endurance tap: tap when symbol matches',
    tier: 'competitive',
    emoji: '🦁',
    minLevel: 5,
    intro: {
      type: 'Endurance Tap Survival',
      concept: 'Tap only when the symbol matches. One mistake resets streak.',
      gameplay: 'Increasing speed. Tap only when symbol matches. Mistake resets streak.',
      rewardLogic: 'Streak length and survival time. High leaderboard potential.',
      nftUtility: 'Leader and Spirit cards extend streak forgiveness.',
    },
  },
  {
    id: 'ivory_caravan',
    name: 'Ivory Caravan Defense',
    description: 'Tower defense lite: deploy guards, survive 2 min',
    tier: 'competitive',
    emoji: '🐘',
    minLevel: 5,
    intro: {
      type: 'Tower Defense Lite',
      concept: 'Tap to deploy guards. Limited resource points. Survive 2 minutes.',
      gameplay: 'Waves of threats. Deploy units strategically. Resource management.',
      rewardLogic: 'Waves survived and efficiency. Competitive leaderboards.',
      nftUtility: 'Mali Empire boosts trade defense. Kingdom synergy.',
    },
  },
  {
    id: 'sundial',
    name: 'Sun Dial Challenge',
    description: 'Tap when shadow hits the mark',
    tier: 'skill',
    emoji: '☀️',
    minLevel: 4,
    intro: {
      type: 'Timing Precision Game',
      concept: 'Tap exactly when the shadow hits the mark.',
      gameplay: 'Shadow moves. Perfect timing = multiplier. Best for daily streak bonus.',
      rewardLogic: 'Timing accuracy scales reward. Streak bonus available.',
      nftUtility: 'Precision cards widen the perfect window.',
    },
  },
  {
    id: 'spirit_rift',
    name: 'Spirit Rift',
    description: 'High-risk multiplier: tap to open portal',
    tier: 'competitive',
    emoji: '🌀',
    minLevel: 10,
    intro: {
      type: 'High-Risk Multiplier Game',
      concept: 'Tap to open spiritual portal. Each tap increases multiplier. Wait too long = portal collapses.',
      gameplay: 'Risk vs reward. Tap to build multiplier. Cash out or risk collapse.',
      rewardLogic: 'Multiplier at cash-out = reward. Perfect token sink feature. Burn fee on cash-out.',
      nftUtility: 'Spirit cards can extend portal duration slightly.',
    },
  },
];

export const MINI_GAME_TIER_LABELS: Record<MiniGameTier, string> = {
  casual: 'Casual',
  skill: 'Skill',
  competitive: 'Competitive',
};

export function getGamesByTier(tier: MiniGameTier): AfrolumensGameDef[] {
  return AFROLUMENS_MINI_GAMES.filter((g) => g.tier === tier);
}

export function getGameById(id: string): AfrolumensGameDef | undefined {
  return AFROLUMENS_MINI_GAMES.find((g) => g.id === id);
}
