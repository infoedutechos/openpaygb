'use client';

import React from 'react';
import { triggerHapticFeedback } from '@/utils/ui';

interface LeaguesGuidePopupProps {
  onClose: () => void;
}

export default function LeaguesGuidePopup({ onClose }: LeaguesGuidePopupProps) {
  const handleClose = () => {
    triggerHapticFeedback(window);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ura-navy/80 p-0 sm:items-center sm:p-4">
      <div
        className="flex h-[100dvh] max-h-[100dvh] w-full max-w-xl flex-col rounded-t-2xl bg-ura-panel shadow-xl sm:h-full sm:max-h-[90vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-ura-border/75 shrink-0">
          <h2 className="text-lg font-bold text-white">Leagues – User guide</h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4">
          <section className="mb-6">
            <h3 className="text-[#f3ba2f] font-bold text-base mb-1.5">1) What are Leagues?</h3>
            <p className="text-gray-300 text-sm leading-relaxed mb-2">
              Leagues are weekly competitions where you earn <strong className="text-white">League Points (LP)</strong> by doing activities in the app. Your LP decides your rank in your tier and can move you up or down between leagues. You can also create your own league, name it, and invite friends to compete together.
            </p>
            <p className="text-gray-400 text-xs leading-relaxed">
              In the Leagues tab everyone can see: <strong className="text-white">Current league</strong> (your tier &amp; rank), <strong className="text-white">Championship</strong>, <strong className="text-white">League levels</strong> (all tiers), <strong className="text-white">Team levels</strong> (how teams work), <strong className="text-white">Team / League management</strong> (if you own a team or league), <strong className="text-white">Team dashboard</strong> (if you joined a team as member), <strong className="text-white">Create team</strong> / <strong className="text-white">Join team</strong>, <strong className="text-white">Create league</strong> / <strong className="text-white">Join league</strong>, <strong className="text-white">Browse teams</strong>, <strong className="text-white">Browse leagues</strong>, <strong className="text-white">Joinable tasks</strong> (global competitions), <strong className="text-white">Team vs Team</strong>, <strong className="text-white">League Competition</strong>, <strong className="text-white">How to earn LP</strong> (points table), and this guide.
            </p>
          </section>

          <section className="mb-6">
            <h3 className="text-[#f3ba2f] font-bold text-base mb-1.5">2) League tiers &amp; League levels</h3>
            <p className="text-gray-300 text-sm leading-relaxed mb-2">
              There are six tiers, from entry to elite. Tap <strong className="text-white">League levels</strong> in the Leagues grid to see them all in one place:
            </p>
            <ul className="list-disc pl-5 text-gray-300 text-sm space-y-1 mb-2">
              <li><strong className="text-amber-200">Bronze</strong> – Entry level; everyone starts here.</li>
              <li><strong className="text-gray-300">Silver</strong> – Promoted from Bronze; better rewards.</li>
              <li><strong className="text-amber-400">Gold</strong> – Competitive; higher LP rewards.</li>
              <li><strong className="text-cyan-300">Platinum</strong> – Advanced; reward multipliers.</li>
              <li><strong className="text-blue-300">Diamond</strong> – Elite; limited slots; special rewards.</li>
              <li><strong className="text-[#f3ba2f]">Legend</strong> – Top players; biggest rewards and recognition.</li>
            </ul>
            <p className="text-gray-300 text-sm leading-relaxed">
              Each week, the top performers in a tier get promoted; the bottom get demoted. The middle stay in the same tier. You only compete on the leaderboard with others in your current tier.
            </p>
          </section>

          <section className="mb-6">
            <h3 className="text-[#f3ba2f] font-bold text-base mb-1.5">3) Team Points (TP) and League Points (LP) – Activities table</h3>
            <p className="text-gray-300 text-sm leading-relaxed mb-2">
              <strong className="text-white">Team is lower than league in ranks.</strong> Users in a <strong className="text-sky-300">team</strong> earn <strong className="text-sky-300">TP</strong>. Users in a <strong className="text-white">league</strong> (your team has joined a league) earn the same <strong className="text-sky-300">TP</strong> plus <strong className="text-[#f3ba2f]">LP</strong> (2× the base). So users in teams under leagues get extra benefits. <strong className="text-white">No single user joins a league—only teams.</strong> Tap <strong className="text-white">How to earn LP</strong> in the Leagues tab to open the full tables.
            </p>
            <p className="text-gray-400 text-xs mb-2 font-semibold">Team activities (TP only) – if you are only in a team:</p>
            <div className="rounded-lg border border-ura-border/75 overflow-hidden mb-3">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-ura-panel-2 border-b border-ura-border/75">
                    <th className="py-2 px-3 font-semibold text-white">Activity</th>
                    <th className="py-2 px-3 font-semibold text-right text-sky-300">TP</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  <tr className="border-b border-ura-border/85"><td className="py-2 px-3">Daily Login</td><td className="py-2 px-3 text-right text-sky-300 font-medium">+10</td></tr>
                  <tr className="border-b border-ura-border/85"><td className="py-2 px-3">Complete Task</td><td className="py-2 px-3 text-right text-sky-300 font-medium">+20</td></tr>
                  <tr className="border-b border-ura-border/85"><td className="py-2 px-3">Attend X-Space</td><td className="py-2 px-3 text-right text-sky-300 font-medium">+50</td></tr>
                  <tr className="border-b border-ura-border/85"><td className="py-2 px-3">Referral</td><td className="py-2 px-3 text-right text-sky-300 font-medium">+100</td></tr>
                  <tr className="border-b border-ura-border/85"><td className="py-2 px-3">Win Challenge</td><td className="py-2 px-3 text-right text-sky-300 font-medium">+200</td></tr>
                  <tr className="border-b-0"><td className="py-2 px-3">Streak Bonus</td><td className="py-2 px-3 text-right text-sky-300 font-medium">+5/day</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-gray-400 text-xs mb-2 font-semibold">League activities (TP + LP) – if you are in a league (team under a league):</p>
            <div className="rounded-lg border border-ura-border/75 overflow-hidden mb-2">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-ura-panel-2 border-b border-ura-border/75">
                    <th className="py-2 px-3 font-semibold text-white">Activity</th>
                    <th className="py-2 px-3 font-semibold text-right text-[#f3ba2f]">TP + LP</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  <tr className="border-b border-ura-border/85"><td className="py-2 px-3">Daily Login</td><td className="py-2 px-3 text-right text-[#f3ba2f] font-medium">+10 TP + 20 LP</td></tr>
                  <tr className="border-b border-ura-border/85"><td className="py-2 px-3">Complete Task</td><td className="py-2 px-3 text-right text-[#f3ba2f] font-medium">+20 TP + 40 LP</td></tr>
                  <tr className="border-b border-ura-border/85"><td className="py-2 px-3">Attend X-Space</td><td className="py-2 px-3 text-right text-[#f3ba2f] font-medium">+50 TP + 100 LP</td></tr>
                  <tr className="border-b border-ura-border/85"><td className="py-2 px-3">Referral</td><td className="py-2 px-3 text-right text-[#f3ba2f] font-medium">+100 TP + 200 LP</td></tr>
                  <tr className="border-b border-ura-border/85"><td className="py-2 px-3">Win Challenge</td><td className="py-2 px-3 text-right text-[#f3ba2f] font-medium">+200 TP + 400 LP</td></tr>
                  <tr className="border-b-0"><td className="py-2 px-3">Streak Bonus</td><td className="py-2 px-3 text-right text-[#f3ba2f] font-medium">+5 TP + 10 LP/day</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              LP is tracked per week and used for tier rank and promotions. TP is also tracked. Only users in a league accumulate LP; users in a team only accumulate TP until their team joins a league.
            </p>
          </section>

          <section className="mb-6">
            <h3 className="text-[#f3ba2f] font-bold text-base mb-1.5">4) Weekly cycle</h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              Leagues run in <strong className="text-white">7-day cycles</strong>. When the week ends, the system ranks everyone in each tier by that week’s LP, then moves the top % up, the bottom % down, and the rest stay. After that, weekly LP is reset and a new round starts. Check the &quot;Current league&quot; card to see your tier, this week’s LP, and your rank in your tier.
            </p>
          </section>

          <section className="mb-6">
            <h3 className="text-[#f3ba2f] font-bold text-base mb-1.5">5) URAPearls Championship</h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              Every <strong className="text-white">8 weeks</strong>, the <strong className="text-[#f3ba2f]">URAPearls Championship</strong> runs. The <strong className="text-white">top 100</strong> players from the Diamond and Legend tiers qualify. The Championship has a larger prize pool, NFT trophy, and public leaderboard. Tap the Championship card in Leagues to see the next event date and whether you’re on track to qualify.
            </p>
          </section>

          <section className="mb-6">
            <h3 className="text-[#f3ba2f] font-bold text-base mb-1.5">6) Browse teams &amp; request to join · One team per user</h3>
            <p className="text-gray-300 text-sm leading-relaxed mb-2">
              Tap <strong className="text-white">Browse teams</strong> to see all teams. You can <strong className="text-white">Request to join</strong> a team (the owner approves or denies), or use <strong className="text-white">Join team</strong> with an invite code. <strong className="text-white">You can only be in one team.</strong> If you join a new team (by code or approved request), you automatically leave any other team you were in. The team you joined first (or the one you just joined) is the one you stay in.
            </p>
          </section>

          <section className="mb-6">
            <h3 className="text-[#f3ba2f] font-bold text-base mb-1.5">7) Team member dashboard (when you joined a team)</h3>
            <p className="text-gray-300 text-sm leading-relaxed mb-2">
              If you <strong className="text-white">joined a team as a member</strong> (you are not the creator), a <strong className="text-white">Team dashboard</strong> card appears in the Leagues tab. Tap it to open your <strong className="text-sky-300">member dashboard</strong>. There you can track everything:
            </p>
            <ul className="list-disc pl-5 text-gray-300 text-sm space-y-1 mb-2">
              <li><strong className="text-white">Overview:</strong> Team progress at a glance – member count, total TP/LP, number of announcements, opinions, and tasks (active and completed).</li>
              <li><strong className="text-white">Announcements:</strong> Messages from the team owner to all members.</li>
              <li><strong className="text-white">Communications:</strong> Opinions and proposals raised by teammates (with For/Against votes).</li>
              <li><strong className="text-white">Members:</strong> All team members with their total TP/LP and this week’s TP/LP.</li>
              <li><strong className="text-white">Tasks:</strong> Team vs Team challenges – available (pending/active) and completed. See target PEARLS, prize pool, and status.</li>
            </ul>
            <p className="text-gray-300 text-sm leading-relaxed">
              Use the member dashboard to stay updated on communication, progress, and tasks. Only the team creator has the full management dashboard (invite code, remove/mute/ban, post announcements, create opinions).
            </p>
          </section>

          <section className="mb-6">
            <h3 className="text-[#f3ba2f] font-bold text-base mb-1.5">8) Browse leagues &amp; request to join</h3>
            <p className="text-gray-300 text-sm leading-relaxed mb-2">
              Tap <strong className="text-white">Browse leagues</strong> to see a list of all leagues for the current week. Each league shows:
            </p>
            <ul className="list-disc pl-5 text-gray-300 text-sm space-y-1 mb-2">
              <li><strong className="text-white">Name</strong>, <strong className="text-white">performance</strong> (total LP this week), and <strong className="text-white">members</strong> (current / max).</li>
              <li>If you’re not in the league, a <strong className="text-white">Request to join</strong> button lets you send a join request to the creator.</li>
              <li>Your <strong className="text-white">My requests</strong> section at the top shows each request’s status: <strong className="text-amber-300">Pending</strong>, <strong className="text-emerald-300">Approved</strong>, or <strong className="text-rose-300">Denied</strong>. If denied, the creator’s reason is shown.</li>
            </ul>
            <p className="text-gray-300 text-sm leading-relaxed">
              Creators see join requests when they open their league and can <strong className="text-white">Approve</strong> or <strong className="text-white">Deny</strong> (with an optional reason). Approved users are added to the league; denied users see the reason in Browse leagues → My requests.
            </p>
          </section>

          <section className="mb-6">
            <h3 className="text-[#f3ba2f] font-bold text-base mb-1.5">9) Create team, Create league, Join team, Join league</h3>
            <p className="text-gray-300 text-sm leading-relaxed mb-2">
              <strong className="text-white">Requirements:</strong> Only <strong className="text-white">teams</strong> can create leagues; single users cannot. You can create a team, join a team, create a league (with your team), or join a league. Here’s how each works:
            </p>
            <ul className="list-disc pl-5 text-gray-300 text-sm space-y-1 mb-2">
              <li><strong className="text-white">Create team:</strong> Tap <strong className="text-white">Create team</strong>, enter a team name, and pay the <strong className="text-white">1,000,000 PEARLS</strong> commitment (team is lower rank than league). You get a team invite code; share it so others can join your team.</li>
              <li><strong className="text-white">Join team:</strong> Tap <strong className="text-white">Join team</strong>, enter the team invite code. No fee. You become a member and can earn TP from activities.</li>
              <li><strong className="text-white">Create league:</strong> Only <strong className="text-white">teams</strong> can create leagues (10,000,000 PEARLS). Tap <strong className="text-white">Create league</strong>, pick your team, enter a league name, and pay. Your team is the first team in the league. You get a league code to share so <strong className="text-white">other teams</strong> can join.</li>
              <li><strong className="text-white">Join league:</strong> <strong className="text-white">Only teams can join a league—no single user.</strong> Your team creator (or you if you created the team) uses the league invite code to join the league as a team (e.g. via league creator or &quot;Join league as team&quot;). Once your team is in a league, you earn TP + LP from activities.</li>
            </ul>
            <p className="text-gray-300 text-sm leading-relaxed mb-2">
              A league can <strong className="text-white">create tasks</strong> only when it has <strong className="text-white">2 or more teams</strong>. League detail shows team count and whether it can create tasks. Inside a league you’ll see <strong className="text-white">Activities to participate in</strong> and <strong className="text-white">Everyone’s contribution</strong> (leaderboard by this week’s LP).
            </p>
          </section>

          <section className="mb-6">
            <h3 className="text-[#f3ba2f] font-bold text-base mb-1.5">10) Team / League management</h3>
            <p className="text-gray-300 text-sm leading-relaxed mb-2">
              If you <strong className="text-white">created a team or a league</strong>, a <strong className="text-white">Team / League management</strong> card appears in the Leagues tab. Tap it to open the <strong className="text-violet-300">Leadership</strong> dashboard, then choose a team or league to open its <strong className="text-white">management dashboard</strong> (full-screen).
            </p>
            <p className="text-gray-300 text-sm leading-relaxed mb-2">
              In the management dashboard you have three areas:
            </p>
            <ul className="list-disc pl-5 text-gray-300 text-sm space-y-1 mb-2">
              <li><strong className="text-white">Members:</strong> See the invite code (share it to <strong className="text-white">add</strong> members). For each member (except yourself as owner) you can <strong className="text-white">Remove</strong>, <strong className="text-white">Mute 24h</strong>, <strong className="text-white">Ban</strong> or <strong className="text-white">Unban</strong>, and add a <strong className="text-white">Note</strong> (reason or punishment note). Banned members are removed from the team/league.</li>
              <li><strong className="text-white">Communicate:</strong> Post <strong className="text-white">announcements</strong> to all members. Everyone can see recent announcements in the dashboard.</li>
              <li><strong className="text-white">Opinions:</strong> <strong className="text-white">Raise an opinion</strong> (a proposal for the team or league). Add a title and optional description. Members can vote <strong className="text-emerald-300">For</strong> or <strong className="text-rose-300">Against</strong>; the counts are shown so you can see what the group thinks and take the team or league forward.</li>
            </ul>
            <p className="text-gray-300 text-sm leading-relaxed">
              Use the management dashboard to keep order, communicate with all members, and gather opinions before making decisions.
            </p>
          </section>

          <section className="mb-6">
            <h3 className="text-[#f3ba2f] font-bold text-base mb-1.5">9) Join a league (only teams)</h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              <strong className="text-white">No single user joins a league—only teams.</strong> If your team should join a league, the team creator (or you if you created the team) enters the league invite code so your <strong className="text-white">team</strong> joins that league. Once your team is in a league, all team members earn TP + LP from activities. Leagues can also have join requests (e.g. from Browse leagues); the league creator approves teams or users as per game design.
            </p>
          </section>

          <section className="mb-6">
            <h3 className="text-[#f3ba2f] font-bold text-base mb-1.5">13) League Competition</h3>
            <p className="text-gray-300 text-sm leading-relaxed mb-2">
              Two leagues can <strong className="text-white">challenge each other</strong>. Only the <strong className="text-white">creator</strong> of a league can create or accept a challenge.
            </p>
            <ul className="list-disc pl-5 text-gray-300 text-sm space-y-1 mb-2">
              <li><strong className="text-white">Create a challenge:</strong> Choose your league, enter the opponent league’s invite code, set a target (e.g. 100M PEARLS), duration (e.g. 7 days), and stake (e.g. 30M PEARLS). You pay the stake from <strong className="text-white">your own balance</strong> when creating; it’s locked into the <strong className="text-white">prize pool</strong>.</li>
              <li><strong className="text-white">Accept:</strong> The opponent league’s creator sees the challenge as pending. If they accept, <strong className="text-white">they pay the same stake from their own balance</strong> (not collected from league members). The challenge then <strong className="text-white">starts</strong>. Progress is the total <strong className="text-white">net PEARLS growth</strong> of all league members during the challenge (from start to end).</li>
              <li><strong className="text-white">Reward distribution (stake-payers benefit first):</strong> The <strong className="text-white">creator who paid the stake</strong> for the winning league gets their stake back from the prize pool first. The <strong className="text-white">remainder</strong> is then shared so everyone gets a fair share: each <strong className="text-white">participating member</strong> (members whose PEARLS grew) receives a share in proportion to their PEARLS growth. If no one had growth, the remainder is split equally among the winning league’s members. So the stake-payer is rewarded (stake returned) and the rest of the team shares the rest of the prize.</li>
              <li><strong className="text-white">After the challenge has started:</strong> The system has already taken a <strong className="text-white">snapshot</strong> of all members’ balances. <strong className="text-white">No new users can join</strong> the league (or team) for that challenge—they weren’t in the snapshot. <strong className="text-white">Anyone</strong> (including people not in either league) can still <strong className="text-white">donate any amount</strong> to the prize pool during the active challenge to make the reward bigger for the winner.</li>
              <li><strong className="text-white">Contribute:</strong> During an active challenge, anyone can add PEARLS to the prize pool; minimum contribution applies.</li>
            </ul>
            <p className="text-gray-300 text-sm leading-relaxed">
              Under <strong className="text-white">League Competition</strong> you see <strong className="text-white">teams that are competing</strong> with each other. Leagues can compete with more than one league as long as they meet the requirements they set for each challenge (target, stake, duration). Tap <strong className="text-white">League Competition</strong> in the Leagues tab to see active and pending competitions, create or accept a challenge, and contribute to prize pools.
            </p>
          </section>

          <section className="mb-6">
            <h3 className="text-[#f3ba2f] font-bold text-base mb-1.5">14) Team vs Team</h3>
            <p className="text-gray-300 text-sm leading-relaxed mb-2">
              Two <strong className="text-white">teams</strong> can challenge each other. Same rules as League Competition:
            </p>
            <ul className="list-disc pl-5 text-gray-300 text-sm space-y-1 mb-2">
              <li>Only the <strong className="text-white">team creator</strong> can create or accept a challenge. When accepting, the creator pays the stake <strong className="text-white">from their own balance</strong> (not collected from team members).</li>
              <li><strong className="text-white">Reward distribution:</strong> The <strong className="text-white">creator who paid the stake</strong> for the winning team gets their stake back from the prize pool first. The remainder is shared in proportion to each member’s PEARLS growth (or equally if no one had growth)—so the stake-payer is rewarded and the rest of the team shares the rest.</li>
              <li><strong className="text-white">After the challenge has started:</strong> No new members can join (snapshot already taken). Anyone can still <strong className="text-white">donate</strong> any amount to the prize pool.</li>
            </ul>
            <p className="text-gray-300 text-sm leading-relaxed">
              Tap <strong className="text-white">Team vs Team</strong> in the Leagues tab to see active and pending team challenges, create or accept, and contribute to prize pools.
            </p>
          </section>

          <section className="mb-6">
            <h3 className="text-[#f3ba2f] font-bold text-base mb-1.5">15) Rewards</h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              Higher tiers unlock better rewards (PEARLS, badges, and later things like whitelist access or exclusive airdrops). Legend tier gets the biggest rewards and public recognition. Rewards are distributed at the end of each week and at Championship events. Stay active, earn LP, and climb the tiers to get the best rewards.
            </p>
          </section>

          <section className="mb-6">
            <h3 className="text-[#f3ba2f] font-bold text-base mb-1.5">16) Quick tips</h3>
            <ul className="list-disc pl-5 text-gray-300 text-sm space-y-1">
              <li>Open <strong className="text-white">How to earn LP</strong> for the full Activity → Points table; use <strong className="text-white">League levels</strong> to see all tiers; use <strong className="text-white">Browse leagues</strong> to discover leagues and request to join.</li>
              <li>Claim your daily reward every day to earn LP and keep streaks.</li>
              <li>Complete as many tasks as you can; each completion adds LP.</li>
              <li>Invite friends – you earn LP when they join and complete actions.</li>
              <li>Play Umeme Run and Lucky Spin when you can; a win gives a big LP boost.</li>
              <li><strong className="text-white">Team</strong> = 1M PEARLS (lower rank), <strong className="text-white">League</strong> = 10M PEARLS. Only teams create and join leagues; no single user joins a league. Earn <strong className="text-sky-300">TP</strong> in a team, <strong className="text-[#f3ba2f]">TP + LP</strong> in a league (2× LP).</li>
              <li>Use <strong className="text-white">League Competition</strong> to see teams competing and challenge another league: stake PEARLS, first to target (or highest at the end) wins; leagues can be in multiple challenges if they meet each challenge’s requirements; anyone can contribute to the prize pool.</li>
              <li><strong className="text-white">Keep the app URL private:</strong> Share only the league <strong className="text-white">invite code</strong> in the community (e.g. &quot;Join my league: ABC12XYZ&quot;). For referrals, use the in-app <strong className="text-white">Invite</strong> button so the Telegram link is sent in a private share, not posted in the group.</li>
              <li>If you own a team or league, use <strong className="text-white">Team / League management</strong> to manage members (add via invite code, remove, mute, ban, note), post announcements, and raise opinions so members can vote and help take the team or league forward. If you <strong className="text-white">joined a team</strong> as a member, use <strong className="text-white">Team dashboard</strong> to see overview, announcements, communications (opinions), members’ TP/LP, and tasks.</li>
              <li><strong className="text-white">Joinable tasks</strong>: browse global competitions (team or league), invite an opponent, stake PEARLS; when they accept the competition starts (snapshots, time limit). First to reach target wins; management adds 30% to the prize pool.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
