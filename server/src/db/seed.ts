import { v4 as uuid } from 'uuid';
import { initDb, execute, queryOne, saveDb } from './index.js';

// ─── Helpers ──────────────────────────────────────────────────

function randomDate(daysBack: number): string {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
  d.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
  return d.toISOString();
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

// ─── Source Types ─────────────────────────────────────────────

const SOURCES = ['appstore', 'playstore', 'reddit', 'forum', 'twitter', 'reviews', 'quickcommerce'] as const;

const SOURCE_PRODUCTS: Record<string, string[]> = {
  appstore: ['BigBasket', 'Blinkit', 'Zepto', 'Swiggy Instamart', 'JioMart', 'Amazon Fresh'],
  playstore: ['BigBasket', 'Blinkit', 'Zepto', 'Swiggy Instamart', 'JioMart', 'Amazon Fresh', 'Dunzo'],
  reddit: ['Blinkit', 'Zepto', 'Swiggy Instamart', 'BigBasket', 'Amazon Fresh'],
  forum: ['BigBasket', 'Blinkit', 'Zepto', 'Swiggy Instamart'],
  twitter: ['Blinkit', 'Zepto', 'Swiggy Instamart', 'BigBasket'],
  reviews: ['BigBasket', 'Blinkit', 'Zepto', 'Swiggy Instamart', 'JioMart'],
  quickcommerce: ['Blinkit', 'Zepto', 'Swiggy Instamart', 'Dunzo', 'BigBasket'],
};

const CATEGORIES = ['Groceries', 'Fruits & Vegetables', 'Dairy', 'Snacks', 'Beverages', 'Personal Care', 'Household', 'Baby Care', 'Pet Care', 'Electronics', 'Meat & Seafood', 'Bakery', 'Frozen Foods', 'Organic', 'Gourmet'];
const PLATFORMS = ['iOS', 'Android', 'Web'];

// ─── Theme Definitions ────────────────────────────────────────

interface ThemeDef {
  name: string;
  description: string;
  topics: { label: string; keywords: string[] }[];
  templates: { content: string; sentiment: 'positive' | 'negative' | 'neutral' | 'mixed'; aspects: { name: string; sentiment: string; snippet: string }[] }[];
  strategicQuestion: string;
}

const THEMES: ThemeDef[] = [
  {
    name: 'Habitual Reordering',
    description: 'Users develop strong reorder patterns within weeks, relying on past purchases and one-tap reorder flows.',
    topics: [
      { label: 'Reorder button dependency', keywords: ['reorder', 'repeat', 'same items', 'weekly list', 'auto-add'] },
      { label: 'Grocery routine lock-in', keywords: ['routine', 'habit', 'every week', 'same groceries', 'always buy'] },
      { label: 'Comfort with familiar brands', keywords: ['trusted brand', 'same brand', 'loyal', 'familiar'] },
    ],
    templates: [
      { content: 'I literally just hit reorder every week. Same milk, same bread, same eggs. Haven\'t changed my cart in months.', sentiment: 'positive', aspects: [{ name: 'reordering', sentiment: 'positive', snippet: 'just hit reorder every week' }, { name: 'habit formation', sentiment: 'neutral', snippet: 'haven\'t changed my cart in months' }] },
      { content: 'My weekly grocery list has been the same for 6 months. I know what I need, the app remembers it. Why would I browse?', sentiment: 'positive', aspects: [{ name: 'reordering', sentiment: 'positive', snippet: 'app remembers it' }] },
      { content: 'The reorder feature is a lifesaver for busy parents. But I do feel like I\'m missing out on new products.', sentiment: 'mixed', aspects: [{ name: 'reordering', sentiment: 'positive', snippet: 'lifesaver for busy parents' }, { name: 'discovery', sentiment: 'negative', snippet: 'missing out on new products' }] },
      { content: 'Every Sunday morning I open the app, hit reorder. It\'s become part of my weekend routine. Super convenient.', sentiment: 'positive', aspects: [{ name: 'reordering', sentiment: 'positive', snippet: 'part of my weekend routine' }] },
      { content: 'Been using the same cart template for 3 months. The algorithm should push me to try new things.', sentiment: 'mixed', aspects: [{ name: 'reordering', sentiment: 'positive', snippet: 'same cart template' }, { name: 'discovery', sentiment: 'negative', snippet: 'too lazy to browse' }] },
      { content: 'I always buy Amul butter, Britannia bread, Mother Dairy milk. Never looked at alternatives.', sentiment: 'positive', aspects: [{ name: 'brand loyalty', sentiment: 'positive', snippet: 'never looked at alternatives' }] },
      { content: 'Wish the app would show me what\'s new. Same 15 items for months. Feels like groundhog day.', sentiment: 'negative', aspects: [{ name: 'discovery', sentiment: 'negative', snippet: 'same 15 items for months' }] },
      { content: 'Quick reorder is the ONLY reason I use this app. One tap and done. Shopping takes 30 seconds.', sentiment: 'positive', aspects: [{ name: 'reordering', sentiment: 'positive', snippet: 'one tap and done' }] },
    ],
    strategicQuestion: 'Why do users repeatedly buy from the same categories?',
  },
  {
    name: 'Category Discovery Friction',
    description: 'Users face barriers exploring new categories — poor navigation, irrelevant recommendations, and lack of contextual information.',
    topics: [
      { label: 'Poor category navigation', keywords: ['hard to find', 'buried', 'too many clicks', 'navigation'] },
      { label: 'Irrelevant recommendations', keywords: ['wrong suggestions', 'not relevant', 'algorithm broken'] },
      { label: 'Information overload', keywords: ['too many options', 'overwhelming', 'confused'] },
    ],
    templates: [
      { content: 'Tried to find organic snacks. Had to scroll through 200 products with no filters. Gave up.', sentiment: 'negative', aspects: [{ name: 'navigation', sentiment: 'negative', snippet: '200 products with no filters' }] },
      { content: 'Recommendations are useless. I buy baby products and it shows me pet food. Not related at all.', sentiment: 'negative', aspects: [{ name: 'recommendations', sentiment: 'negative', snippet: 'shows me pet food' }] },
      { content: 'Wanted to explore gourmet section but 500 products with no categorization. No ratings, no reviews.', sentiment: 'negative', aspects: [{ name: 'navigation', sentiment: 'negative', snippet: 'no categorization' }] },
      { content: 'Search results are garbage. I type "healthy breakfast" and get random noodles. Fix your search!', sentiment: 'negative', aspects: [{ name: 'search', sentiment: 'negative', snippet: 'search results are garbage' }] },
      { content: 'The app only shows me what I already buy. Stuck in an echo chamber. Show me something different!', sentiment: 'negative', aspects: [{ name: 'recommendations', sentiment: 'negative', snippet: 'echo chamber' }] },
      { content: 'Category page is a nightmare. Took 5 minutes to find spices. Even a simple A-Z would help.', sentiment: 'negative', aspects: [{ name: 'navigation', sentiment: 'negative', snippet: 'category page is a nightmare' }] },
    ],
    strategicQuestion: 'What prevents users from exploring new categories?',
  },
  {
    name: 'Product Discovery Channels',
    description: 'Users discover new products primarily through social media, word-of-mouth, and in-store — rarely through app recommendations.',
    topics: [
      { label: 'Social media food trends', keywords: ['Instagram', 'reels', 'food blogger', 'viral', 'trending'] },
      { label: 'Word of mouth influence', keywords: ['friend recommended', 'family uses', 'colleague told me'] },
      { label: 'In-store vs app discovery', keywords: ['saw in store', 'physical shopping', 'supermarket'] },
    ],
    templates: [
      { content: 'Saw a recipe reel on Instagram using truffle oil. Found it on the app! But I would NEVER have discovered it through the app alone.', sentiment: 'mixed', aspects: [{ name: 'discovery channel', sentiment: 'positive', snippet: 'Instagram reel' }, { name: 'app discovery', sentiment: 'negative', snippet: 'never through the app alone' }] },
      { content: 'My friend recommended makhana chips. Amazing! App never showed me this in months of using it.', sentiment: 'mixed', aspects: [{ name: 'word of mouth', sentiment: 'positive', snippet: 'friend recommended' }] },
      { content: 'I discover new products in physical stores. The browsing experience there is much better than apps.', sentiment: 'neutral', aspects: [{ name: 'in-store discovery', sentiment: 'positive', snippet: 'browsing experience is better' }] },
      { content: 'YouTube food channels are my main discovery source. The app is just a purchase tool, not discovery.', sentiment: 'neutral', aspects: [{ name: 'discovery channel', sentiment: 'positive', snippet: 'YouTube food channels' }] },
    ],
    strategicQuestion: 'How do users discover products today?',
  },
  {
    name: 'Routine & Convenience',
    description: 'Shopping habits are deeply tied to routine and convenience. Users value speed and predictability over variety.',
    topics: [
      { label: 'Speed as priority', keywords: ['fast', 'quick', '10 minutes', 'instant', 'delivery time'] },
      { label: 'Routine integration', keywords: ['morning routine', 'weekly habit', 'Sunday shopping'] },
      { label: 'Cognitive load reduction', keywords: ['don\'t have to think', 'automatic', 'easy', 'mindless'] },
    ],
    templates: [
      { content: 'My morning routine depends on Blinkit. Coffee, milk, eggs — delivered in 15 minutes. I don\'t think about what to order.', sentiment: 'positive', aspects: [{ name: 'delivery speed', sentiment: 'positive', snippet: 'delivered in 15 minutes' }] },
      { content: 'I can do weekly shopping in under 2 minutes. Past orders → reorder → done. Zero friction.', sentiment: 'positive', aspects: [{ name: 'convenience', sentiment: 'positive', snippet: 'under 2 minutes' }] },
      { content: 'Sunday evening is grocery time. Same time, same items. The predictability is comforting.', sentiment: 'positive', aspects: [{ name: 'routine', sentiment: 'positive', snippet: 'predictability is comforting' }] },
      { content: 'Best thing is I don\'t have to make decisions. Cart is pre-filled, prices expected. Decision fatigue is real.', sentiment: 'positive', aspects: [{ name: 'cognitive load', sentiment: 'positive', snippet: 'don\'t have to make decisions' }] },
    ],
    strategicQuestion: 'What role do habits play in shopping behavior?',
  },
  {
    name: 'Trust & Information Gaps',
    description: 'Users need reviews, nutritional data, and social proof before trying new categories. Most apps fail to provide this.',
    topics: [
      { label: 'Need for reviews', keywords: ['reviews needed', 'no reviews', 'ratings missing', 'trust'] },
      { label: 'Nutritional information demand', keywords: ['nutrition info', 'ingredients', 'calories', 'allergen'] },
      { label: 'Price comparison anxiety', keywords: ['is it worth it', 'too expensive', 'value for money'] },
    ],
    templates: [
      { content: 'Wanted to try plant-based meat but zero reviews on the app. How do I spend ₹500 on something nobody reviewed?', sentiment: 'negative', aspects: [{ name: 'reviews', sentiment: 'negative', snippet: 'zero reviews' }] },
      { content: 'I need nutritional info before buying health foods. Just a tiny image and price. No ingredients list.', sentiment: 'negative', aspects: [{ name: 'product information', sentiment: 'negative', snippet: 'no ingredients list' }] },
      { content: 'If the app showed user satisfaction rates and photos, I\'d try new products. Right now it\'s a blind gamble.', sentiment: 'negative', aspects: [{ name: 'social proof', sentiment: 'negative', snippet: 'blind gamble' }] },
      { content: 'Organic section is expensive but can\'t tell if it\'s actually organic. No certifications shown.', sentiment: 'negative', aspects: [{ name: 'trust', sentiment: 'negative', snippet: 'can\'t tell if it\'s organic' }] },
    ],
    strategicQuestion: 'What information do users need before trying a new category?',
  },
  {
    name: 'Delivery & Freshness Frustrations',
    description: 'Delivery delays, substitutions, and quality issues are the top frustrations, eroding trust.',
    topics: [
      { label: 'Delivery time complaints', keywords: ['late delivery', 'delayed', 'took too long', 'ETA wrong'] },
      { label: 'Product quality issues', keywords: ['not fresh', 'expired', 'damaged', 'wrong item'] },
      { label: 'Substitution problems', keywords: ['substituted', 'replaced', 'out of stock'] },
    ],
    templates: [
      { content: 'Ordered fresh vegetables, received wilted spinach and brown bananas. Third time this month.', sentiment: 'negative', aspects: [{ name: 'product quality', sentiment: 'negative', snippet: 'wilted spinach' }] },
      { content: 'Promised 10-minute delivery, took 45 minutes. Can\'t deliver on basics.', sentiment: 'negative', aspects: [{ name: 'delivery speed', sentiment: 'negative', snippet: 'took 45 minutes' }] },
      { content: 'Order missing 3 items, substituted my brand with generic without asking. Frustrating.', sentiment: 'negative', aspects: [{ name: 'substitution', sentiment: 'negative', snippet: 'without asking' }] },
      { content: 'Milk was 2 days from expiry. Makes me not want to try dairy section again.', sentiment: 'negative', aspects: [{ name: 'freshness', sentiment: 'negative', snippet: '2 days from expiry' }] },
      { content: 'Delivery was fast and packed well. Fresh fruits, cold dairy. When they get it right, it\'s amazing.', sentiment: 'positive', aspects: [{ name: 'delivery', sentiment: 'positive', snippet: 'fast and packed well' }] },
      { content: 'Got someone else\'s order. Called support, waited 20 minutes. No re-delivery.', sentiment: 'negative', aspects: [{ name: 'accuracy', sentiment: 'negative', snippet: 'someone else\'s order' }] },
      { content: 'Fruits quality has improved. Mangoes are ripe, apples crisp. They\'re getting better.', sentiment: 'positive', aspects: [{ name: 'product quality', sentiment: 'positive', snippet: 'quality has improved' }] },
      { content: 'Frozen items arrived thawed. Ice cream was soup. Food safety issue.', sentiment: 'negative', aspects: [{ name: 'cold chain', sentiment: 'negative', snippet: 'arrived thawed' }] },
    ],
    strategicQuestion: 'What frustrations emerge repeatedly?',
  },
  {
    name: 'Power User Exploration',
    description: 'A small segment actively seeks new products — they respond to deals, curated collections, and trending products.',
    topics: [
      { label: 'Deal-driven exploration', keywords: ['discount', 'offer', 'deal', 'sale', 'cashback'] },
      { label: 'Adventurous food explorers', keywords: ['trying new', 'experiment', 'foodie', 'exotic'] },
      { label: 'Curated collection fans', keywords: ['curated', 'editor picks', 'seasonal', 'collection'] },
    ],
    templates: [
      { content: 'I actively look for new products weekly. Found Korean ramen, Turkish coffee, artisan cheese. Gourmet section is a goldmine.', sentiment: 'positive', aspects: [{ name: 'exploration', sentiment: 'positive', snippet: 'actively look for new products' }] },
      { content: '50% off on first-time category purchases is genius. That\'s how I tried organic. Discounts lower the risk.', sentiment: 'positive', aspects: [{ name: 'deals', sentiment: 'positive', snippet: '50% off' }] },
      { content: 'Loved the "Summer Coolers" curated collection. Discovered craft beverages. More of these please!', sentiment: 'positive', aspects: [{ name: 'curation', sentiment: 'positive', snippet: 'curated collection' }] },
      { content: 'I\'m a foodie and love international snacks. The app could do more with "world cuisine" categories.', sentiment: 'mixed', aspects: [{ name: 'exploration', sentiment: 'positive', snippet: 'love international snacks' }] },
      { content: 'Trial-size packs would be amazing. Don\'t want to commit to full-size untried products.', sentiment: 'neutral', aspects: [{ name: 'trial sizes', sentiment: 'positive', snippet: 'trial-size packs' }] },
    ],
    strategicQuestion: 'Which user segments are more likely to experiment?',
  },
  {
    name: 'Unmet Feature Requests',
    description: 'Users consistently request wishlists, shared carts, meal planning, recipe integration, and better search.',
    topics: [
      { label: 'Meal planning integration', keywords: ['meal plan', 'recipe', 'weekly menu', 'ingredients list'] },
      { label: 'Social shopping features', keywords: ['share cart', 'family list', 'wishlist', 'group order'] },
      { label: 'Smart list management', keywords: ['shopping list', 'auto-suggest', 'running low', 'reminders'] },
    ],
    templates: [
      { content: 'If the app integrated with recipes — pick recipe, auto-add ingredients — it would revolutionize shopping.', sentiment: 'neutral', aspects: [{ name: 'recipe integration', sentiment: 'positive', snippet: 'integrate with recipes' }] },
      { content: 'Need a shared family shopping list. Using WhatsApp groups and manually adding items. Inefficient.', sentiment: 'negative', aspects: [{ name: 'shared lists', sentiment: 'negative', snippet: 'using WhatsApp groups' }] },
      { content: 'A "running low" reminder based on purchase frequency would be killer. Buy milk every 5 days? Remind on day 4.', sentiment: 'neutral', aspects: [{ name: 'smart reminders', sentiment: 'positive', snippet: 'running low reminder' }] },
      { content: 'Wish there was meal planning. Plan week → auto-generate shopping list → order in one tap.', sentiment: 'neutral', aspects: [{ name: 'meal planning', sentiment: 'positive', snippet: 'plan your week' }] },
      { content: 'App needs a wishlist. Sometimes I see interesting products but not ready to buy. Can\'t find them later.', sentiment: 'negative', aspects: [{ name: 'wishlist', sentiment: 'negative', snippet: 'needs a wishlist' }] },
      { content: 'Why can\'t I filter by dietary preferences? Vegan, gluten-free, keto — should be one-tap filters.', sentiment: 'negative', aspects: [{ name: 'dietary filters', sentiment: 'negative', snippet: 'can\'t filter by dietary' }] },
    ],
    strategicQuestion: 'What unmet needs emerge consistently across discussions?',
  },
  {
    name: 'Pricing & Value Perception',
    description: 'Price sensitivity is major — users compare across platforms and are reluctant to try premium categories without value justification.',
    topics: [
      { label: 'Platform price comparison', keywords: ['cheaper on Amazon', 'overpriced', 'expensive', 'markup'] },
      { label: 'Delivery fee complaints', keywords: ['delivery charge', 'free delivery', 'minimum order'] },
      { label: 'Value for premium products', keywords: ['not worth it', 'organic expensive', 'premium pricing'] },
    ],
    templates: [
      { content: 'Same product is ₹30 cheaper on Amazon. Why pay more for quick delivery? Convenience premium is too high.', sentiment: 'negative', aspects: [{ name: 'pricing', sentiment: 'negative', snippet: '₹30 cheaper on Amazon' }] },
      { content: 'Delivery fee of ₹35 on ₹200 order is ridiculous. 17.5% surcharge! Waive it for regulars.', sentiment: 'negative', aspects: [{ name: 'delivery fee', sentiment: 'negative', snippet: '17.5% surcharge' }] },
      { content: 'Organic is 2x the price of regular. Without certification proof, can\'t justify cost to family.', sentiment: 'negative', aspects: [{ name: 'pricing', sentiment: 'negative', snippet: '2x the price' }] },
      { content: 'Membership pass is actually worth it if you order frequently. Save on delivery, exclusive deals.', sentiment: 'mixed', aspects: [{ name: 'membership', sentiment: 'positive', snippet: 'worth it' }] },
    ],
    strategicQuestion: 'Why do users repeatedly buy from the same categories?',
  },
];

// ─── Seed Function ────────────────────────────────────────────

export async function seed() {
  console.log('🌱 Seeding database...');

  const db = await initDb();

  // Clear existing data
  const tables = ['evidence', 'insights', 'entities', 'aspects', 'chat_history', 'pipeline_runs', 'documents', 'topics', 'themes'];
  for (const t of tables) {
    db.run(`DELETE FROM ${t}`);
  }

  // Insert themes
  const themeIds: number[] = [];
  for (const theme of THEMES) {
    const avgSent = theme.templates.reduce((acc, t) => {
      const val = t.sentiment === 'positive' ? 0.7 : t.sentiment === 'negative' ? -0.6 : t.sentiment === 'mixed' ? 0.1 : 0;
      return acc + val;
    }, 0) / theme.templates.length;
    db.run('INSERT INTO themes (name, description, avg_sentiment) VALUES (?, ?, ?)', [theme.name, theme.description, avgSent]);
    const id = (db.exec('SELECT last_insert_rowid() as id')[0].values[0][0]) as number;
    themeIds.push(id);
  }
  console.log(`  ✅ ${themeIds.length} themes`);

  // Insert topics
  const topicMap: { themeIdx: number; topicId: number }[] = [];
  THEMES.forEach((theme, ti) => {
    for (const topic of theme.topics) {
      db.run('INSERT INTO topics (label, keywords, theme_id) VALUES (?, ?, ?)', [topic.label, JSON.stringify(topic.keywords), themeIds[ti]]);
      const id = (db.exec('SELECT last_insert_rowid() as id')[0].values[0][0]) as number;
      topicMap.push({ themeIdx: ti, topicId: id });
    }
  });
  console.log(`  ✅ ${topicMap.length} topics`);

  // Insert documents
  let docCount = 0;
  let aspectCount = 0;
  const allDocIds: string[] = [];
  const targetDocsPerTheme = [300, 250, 200, 180, 170, 300, 150, 200, 150];
  const docContents: Map<string, { content: string; source: string }> = new Map();

  THEMES.forEach((theme, ti) => {
    const targetDocs = targetDocsPerTheme[ti] || 200;
    const themeTopics = topicMap.filter(t => t.themeIdx === ti);

    for (let i = 0; i < targetDocs; i++) {
      const template = pick(theme.templates);
      const docId = uuid();
      allDocIds.push(docId);
      const source = pick([...SOURCES]);
      const product = pick(SOURCE_PRODUCTS[source]);
      const category = pick(CATEGORIES);
      const platform = pick(PLATFORMS);
      const topic = pick(themeTopics);

      const variations = ['', ' Really annoying.', ' Just my experience.', ' Anyone else?',
        ' 🤷‍♂️', ' Thoughts?', ' This needs to change.', ' Otherwise decent app.',
        ' Hoping for improvements.', ' Would recommend fixing.', ' Not a deal breaker though.',
      ];
      const content = template.content + pick(variations);

      const sentimentMap: Record<string, { label: string; valence: number }> = {
        positive: { label: 'positive', valence: rand(0.3, 0.95) },
        negative: { label: 'negative', valence: rand(-0.95, -0.3) },
        neutral: { label: 'neutral', valence: rand(-0.15, 0.15) },
        mixed: { label: 'mixed', valence: rand(-0.3, 0.3) },
      };
      const sent = sentimentMap[template.sentiment];

      const rating = template.sentiment === 'positive' ? pick([4, 5]) :
        template.sentiment === 'negative' ? pick([1, 2]) :
        template.sentiment === 'mixed' ? pick([2, 3, 4]) : pick([3, 4]);
      const ratingValue = source === 'reddit' || source === 'twitter' || source === 'forum' ? null : rating;

      const title = source === 'reddit' ? `${pick(['Discussion:', 'Rant:', 'Question:', 'Review:', 'PSA:'])} ${theme.name}` : null;

      db.run(
        `INSERT INTO documents (id, source, source_id, content, title, rating, author, author_meta, language, category, product, platform, sentiment_valence, sentiment_label, sentiment_confidence, topic_id, theme_id, created_at, ingested_at, fingerprint)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [docId, source, `${source}_${uuid().slice(0, 8)}`, content, title, ratingValue,
         `user_${Math.floor(Math.random() * 5000)}`,
         JSON.stringify({ accountAge: Math.floor(rand(1, 365)), postCount: Math.floor(rand(1, 200)) }),
         'en', category, product, platform, sent.valence, sent.label, rand(0.65, 0.98),
         topic.topicId, themeIds[ti], randomDate(60), randomDate(3), `fp_${uuid().slice(0, 12)}`]
      );
      docContents.set(docId, { content, source });
      docCount++;

      // Insert aspects
      for (const aspect of template.aspects) {
        db.run('INSERT INTO aspects (id, document_id, aspect_name, sentiment, snippet, confidence) VALUES (?, ?, ?, ?, ?, ?)',
          [uuid(), docId, aspect.name, aspect.sentiment, aspect.snippet, rand(0.7, 0.95)]);
        aspectCount++;
      }
    }
  });

  console.log(`  ✅ ${docCount} documents`);
  console.log(`  ✅ ${aspectCount} aspects`);

  // Update counts
  db.run('UPDATE topics SET document_count = (SELECT COUNT(*) FROM documents WHERE documents.topic_id = topics.id)');
  db.run('UPDATE themes SET document_count = (SELECT COUNT(*) FROM documents WHERE documents.theme_id = themes.id), topic_count = (SELECT COUNT(*) FROM topics WHERE topics.theme_id = themes.id)');

  // Insert insights
  const insightDefs = [
    { themeIdx: 0, insight: 'Users develop habitual reorder patterns within 2-3 weeks. 73% of repeat users have static carts with <15% item variation week-over-week. This creates strong retention but limits cross-category exploration.', recommendation: 'Introduce "Discovery Drops" — curated product suggestions inserted into the reorder flow with social proof.', confidence: 0.92, actionability: 'high', segments: ['Weekly Grocery Buyers', 'Working Professionals'], question: 'Why do users repeatedly buy from the same categories?' },
    { themeIdx: 1, insight: 'Category exploration is blocked by: (1) poor navigation requiring 4+ taps, (2) zero social proof on unfamiliar products, (3) irrelevant algorithmic recommendations. Users describe the experience as an "echo chamber."', recommendation: 'Build a dedicated "Explore" tab with interest-based browsing. Show trending items by social proof metrics.', confidence: 0.89, actionability: 'high', segments: ['All Users'], question: 'What prevents users from exploring new categories?' },
    { themeIdx: 2, insight: '68% of new product trials originate from Instagram Reels, YouTube food content, or friend recommendations. The app functions as a "purchasing tool" not a "discovery platform."', recommendation: 'Create an in-app "Trending Now" feed powered by social media trend detection. Add "Seen on Social" badge.', confidence: 0.85, actionability: 'high', segments: ['Millennials', 'Foodie Explorers'], question: 'How do users discover products today?' },
    { themeIdx: 3, insight: '82% of orders are placed at consistent time slots. Users value "not having to think" about purchases. This cognitive load reduction is the primary value proposition but suppresses exploration.', recommendation: 'Leverage routine touchpoints for gentle nudges. During reorder confirmation, show "3 new arrivals in your categories."', confidence: 0.88, actionability: 'medium', segments: ['Working Professionals', 'Busy Parents'], question: 'What role do habits play in shopping behavior?' },
    { themeIdx: 4, insight: 'Before trying new categories, users need: (1) 10+ peer reviews, (2) detailed nutritional info, (3) price comparison context, (4) return/refund assurance. Most apps provide none of these.', recommendation: 'Implement "Trust Badges": verified review count, nutritional score, price-match guarantee, easy-return policy.', confidence: 0.91, actionability: 'high', segments: ['Health-Conscious Buyers', 'Premium Segment'], question: 'What information do users need before trying a new category?' },
    { themeIdx: 5, insight: 'Three frustrations dominate: (1) freshness/quality inconsistency (38% of negative reviews), (2) delivery promise violations (29%), (3) unwanted substitutions (18%). These suppress willingness to try new categories.', recommendation: 'Implement "Freshness Guarantee" with photo verification. Show honest ETAs. Require opt-in for substitutions.', confidence: 0.94, actionability: 'high', segments: ['All Users'], question: 'What frustrations emerge repeatedly?' },
    { themeIdx: 6, insight: '12-15% are "Power Explorers" who respond to: (1) category-specific discounts, (2) curated collections, (3) trial-size options. They are 4x more likely to try new categories with these triggers.', recommendation: 'Create "Discovery Rewards" program for Power Explorers with category-first-purchase discounts and trial bundles.', confidence: 0.86, actionability: 'high', segments: ['Power Explorers', 'Deal Hunters'], question: 'Which user segments are more likely to experiment?' },
    { themeIdx: 7, insight: 'Four unmet needs: (1) Recipe-to-cart integration, (2) Shared family lists, (3) Smart replenishment reminders, (4) Dietary preference filters as first-class navigation.', recommendation: 'Prioritize recipe-to-cart as it drives category exploration. Partner with recipe platforms or build in-app.', confidence: 0.90, actionability: 'high', segments: ['Home Cooks', 'Families'], question: 'What unmet needs emerge consistently across discussions?' },
    { themeIdx: 8, insight: 'Price sensitivity is the hidden barrier. Users compare across 2-3 platforms for non-routine items. The "convenience premium" is accepted for habits but rejected for exploration.', recommendation: 'Transparent pricing: show MRP vs app price. "Try it for less" first-purchase discount for new categories.', confidence: 0.83, actionability: 'medium', segments: ['Price-Sensitive Buyers'], question: 'Why do users repeatedly buy from the same categories?' },
  ];

  let insightCount = 0;
  for (const ins of insightDefs) {
    const insightId = uuid();
    const themeDocs = allDocIds.filter((_, i) => {
      const themeStart = targetDocsPerTheme.slice(0, ins.themeIdx).reduce((a, b) => a + b, 0);
      return i >= themeStart && i < themeStart + targetDocsPerTheme[ins.themeIdx];
    });
    const evidenceDocs = pickN(themeDocs, Math.min(5, themeDocs.length));

    db.run(
      `INSERT INTO insights (id, theme_id, insight_text, recommendation, confidence, actionability, user_segments, strategic_question, validation_status, source_types, evidence_count, generated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [insightId, themeIds[ins.themeIdx], ins.insight, ins.recommendation, ins.confidence, ins.actionability,
       JSON.stringify(ins.segments), ins.question, 'validated', JSON.stringify(pickN([...SOURCES], 4)), evidenceDocs.length, randomDate(7)]
    );

    for (const docId of evidenceDocs) {
      const doc = docContents.get(docId);
      if (doc) {
        db.run('INSERT INTO evidence (id, insight_id, document_id, quote, source) VALUES (?, ?, ?, ?, ?)',
          [uuid(), insightId, docId, doc.content.slice(0, 200), doc.source]);
      }
    }
    insightCount++;
  }
  console.log(`  ✅ ${insightCount} insights with evidence`);

  // Pipeline runs
  for (const source of SOURCES) {
    const fetched = Math.floor(rand(50, 300));
    db.run('INSERT INTO pipeline_runs (id, source, status, documents_fetched, documents_processed, errors, started_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [uuid(), source, 'completed', fetched, fetched - Math.floor(rand(0, 5)), Math.floor(rand(0, 3)), randomDate(1), randomDate(0)]);
  }
  console.log(`  ✅ ${SOURCES.length} pipeline runs`);

  saveDb();
  console.log('🎉 Database seeded successfully!');
}

// Run if executed directly
if (process.argv[1] && (process.argv[1].endsWith('seed.ts') || process.argv[1].endsWith('seed.js'))) {
  seed().catch(console.error);
}
