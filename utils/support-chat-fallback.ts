/**
 * Rule-based replies when OPENAI_API_KEY is not configured or the model call fails.
 */

const GENERIC = `I’m the URAPearls help assistant. I can explain how to open the **Clicker** game, where to find **Tasks**, **Friends**, **Services** (URA tools & Single Window), and general navigation.

If you need account-specific help or something I can’t resolve, tap **talk to an agent** below.`;

export function getSupportChatFallbackReply(userMessage: string): string {
  const q = userMessage.trim().toLowerCase();
  if (!q) {
    return 'Ask me anything about URAPearls or URA services — or use **talk to an agent** for a human.';
  }

  if (/\b(hello|hi|hey|good morning|good afternoon)\b/.test(q)) {
    return 'Hello! How can I help you with URAPearls or URA services today?';
  }

  if (/\b(thank|thanks)\b/.test(q)) {
    return 'You’re welcome! If anything else comes up, ask here or reach an agent anytime.';
  }

  if (/\b(agent|human|person|support|live chat|operator|representative)\b/.test(q)) {
    return 'To reach a person, open **talk to an agent** in this chat — you’ll get Telegram, phone, and other options.';
  }

  if (/\b(clicker|game|play|tap|points|pearls|level)\b/.test(q)) {
    return 'Open **Clicker** from the home page link. Inside the app you’ll find the game, boosts, tasks, and pearl balances. Progress and tasks are tied to your Telegram session when you use the bot.';
  }

  if (/\b(task|tasks|daily|combo|cipher|reward|quiz)\b/.test(q)) {
    return 'Daily tasks (combo, cipher, rewards, quiz, etc.) live under the **Clicker** experience. Open **Clicker**, then use the home dashboard and navigation to reach tasks and earn rewards.';
  }

  if (/\b(friend|referral|invite)\b/.test(q)) {
    return 'Referral and friends features are in **Clicker** under the Friends area. Share your link from there so invites count correctly.';
  }

  if (/\b(service|services|ura|tax|tin|etax|efris|customs|single window|uesw)\b/.test(q)) {
    return 'Official URA tools and the **Uganda Electronic Single Window** are linked from **Services** inside **Clicker**. You’ll find domestic tax, trade, Single Window tiles, and partner links there.';
  }

  if (/\b(home|landing|start|where)\b/.test(q)) {
    return 'This page is the URAPearls landing screen. Tap **Clicker** to enter the full mini-app: home, game, services, and settings.';
  }

  if (/\b(privacy|terms|legal)\b/.test(q)) {
    return 'Privacy and terms for the clicker experience are linked from the app (e.g. Settings / legal pages on the clicker route). For tax law, use official **ura.go.ug** documents.';
  }

  return GENERIC;
}
