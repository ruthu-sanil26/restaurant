const MenuItem = require('../models/MenuItem');
const Category = require('../models/Category');
const Order = require('../models/Order');
const Table = require('../models/Table');
const { emitOrderUpdate } = require('../config/socket');

// Helper for typo tolerance
function levenshtein(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // insertion
        matrix[j - 1][i] + 1, // deletion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  return matrix[b.length][a.length];
}

function fuzzyMatch(text, keywords) {
  const lowerText = text.toLowerCase();
  for (const kw of keywords) {
    if (lowerText.includes(kw)) return true;
  }
  
  const words = lowerText.replace(/[^a-z0-9\s]/g, '').split(/\s+/);
  const stopWords = new Set(['this', 'that', 'there', 'these', 'those', 'what', 'where', 'when', 'which', 'who', 'how', 'why', 'can', 'could', 'would', 'should', 'will', 'with', 'from', 'have', 'make', 'made', 'some', 'any', 'all', 'food', 'good', 'very', 'much']);

  for (const word of words) {
    if (word.length < 3) continue; // Allow matching short words like "pay", "pay"
    if (stopWords.has(word)) continue;

    for (const kw of keywords) {
      if (kw.includes(' ')) continue;
      // For very short keywords (3-4 chars), only allow distance of 1
      // For longer keywords (5+), allow distance of 2
      const maxDist = kw.length <= 4 ? 1 : (kw.length <= 6 ? 1 : 2);
      if (Math.abs(word.length - kw.length) > maxDist) continue;
      if (levenshtein(word, kw) <= maxDist) return true;
    }
  }
  return false;
}

let aiClient = null;
if (process.env.GEMINI_API_KEY) {
  const { GoogleGenAI } = require('@google/genai');
  aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

const callGemini = async (message) => {
  if (!aiClient) return null;
  try {
    const systemPrompt = "You are a helpful and polite AI assistant for 'Royal Rasoi'. You should help customers with any general or specific questions they have. Keep your answers concise, friendly, and suitable for a dining context.";

    const aiRes = await aiClient.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `${systemPrompt}\n\nCustomer asks: ${message}`
    });

    return {
      reply: aiRes.text,
      type: 'default',
    };
  } catch (err) {
    console.error("Gemini API Error:", err);
    return null;
  }
};

// Simulated AI responses (replace with OpenAI/other API for production)
const getAIResponse = async (message, context = {}) => {
  // Truncate to prevent event loop blocking from massive strings
  const lower = (message || '').toLowerCase().trim().substring(0, 200);

  // Feedback Capture
  if (context.orderId) {
    try {
      const order = await Order.findById(context.orderId);
      if (order && order.paymentMethod && order.paymentMethod !== 'pending') {
        const isSystemCommand = ['menu', 'bill', 'hour', 'address'].some(cmd => lower.includes(cmd));
        if (!isSystemCommand) {
          order.feedback = order.feedback ? `${order.feedback} | ${message}` : message;
          await order.save();
        }
      }
    } catch (error) {
      console.error('Error capturing feedback:', error);
    }
  }

  // Explicit Knowledge Question Bypass
  const isKnowledgeQuestion = /(difference between|how is.*?made|how.*?is made|what exactly is|recipe for|recipe of|\brecipe\b|how to make|what are the ingredients|is it healthy|calories in|how many calories|calories are there|calories does|nutrition|nutritional|protein in|fat in|carbs in|who are you|how are you|tell me about|what is the meaning of|what is.*made of|made of|how.*made|what.*ingredients|benefits of|origin of|history of)/i.test(lower);
  if (isKnowledgeQuestion) {
    const geminiRes = await callGemini(message);
    if (geminiRes) return geminiRes;
    // Gemini not available — return a helpful static fallback
    return {
      reply: "That's a great question! For detailed nutritional information, calorie counts, or recipe details, I'd recommend checking a nutrition website or asking our chef directly. Is there anything else I can help you with — like browsing the menu or placing an order? 😊",
      type: 'default',
    };
  }


  // Dietary & Allergen Filtering Assistant
  const isGlutenFree = fuzzyMatch(lower, ['gluten free', 'gluten-free', 'glutenfree', 'no gluten', 'without gluten', 'wheat free']);
  const isNutFree = fuzzyMatch(lower, ['nut free', 'nut-free', 'peanut free', 'without nuts', 'no nuts', 'allergy', 'allergies']);
  const isDairyFree = fuzzyMatch(lower, ['dairy free', 'dairy-free', 'lactose free', 'no dairy', 'lactose-free']);
  const isSpicy = fuzzyMatch(lower, ['spicy', 'hot', 'chilli', 'chili', 'spiciest']);
  const isHealthy = fuzzyMatch(lower, ['healthy', 'low calorie', 'low-calorie', 'diet', 'light food', 'fitness', 'salad']);
  const isSugarFree = fuzzyMatch(lower, ['sugar free', 'sugar-free', 'no sugar', 'keto', 'sugarless']);

  if (isGlutenFree || isNutFree || isDairyFree || isSpicy || isHealthy || isSugarFree) {
    let categoryFilter = null;
    if (fuzzyMatch(lower, ['dessert', 'desserts', 'sweet', 'sweets', 'cake', 'ice cream'])) {
      const categories = await Category.find({ name: { $regex: /dessert|sweet|pastry/i } }).lean();
      categoryFilter = categories.map(c => c._id);
    } else if (fuzzyMatch(lower, ['starter', 'starters', 'appetizer', 'appetizers'])) {
      const categories = await Category.find({ name: { $regex: /starter|appetizer/i } }).lean();
      categoryFilter = categories.map(c => c._id);
    } else if (fuzzyMatch(lower, ['main', 'mains', 'main course'])) {
      const categories = await Category.find({ name: { $regex: /main/i } }).lean();
      categoryFilter = categories.map(c => c._id);
    } else if (fuzzyMatch(lower, ['drink', 'drinks', 'beverage', 'beverages'])) {
      const categories = await Category.find({ name: { $regex: /drink|beverage/i } }).lean();
      categoryFilter = categories.map(c => c._id);
    }

    let labelStr = '';
    let regexPattern = null;

    if (isGlutenFree) {
      labelStr = 'Gluten-Free';
      regexPattern = /gluten-free|gluten free|glutenfree|no gluten|wheat-free/i;
    } else if (isNutFree) {
      labelStr = 'Nut-Free';
      regexPattern = /nut-free|nut free|peanut-free|no nuts|without nuts/i;
    } else if (isDairyFree) {
      labelStr = 'Dairy-Free';
      regexPattern = /dairy-free|dairy free|lactose-free|lactose free|no dairy|vegan/i;
    } else if (isSpicy) {
      labelStr = 'Spicy';
      regexPattern = /spicy|hot|chilli|chili|tikka|schezwan/i;
    } else if (isHealthy) {
      labelStr = 'Healthy / Low-Calorie';
      regexPattern = /healthy|low calorie|diet|salad|sprouts|soup|steamed|grilled/i;
    } else if (isSugarFree) {
      labelStr = 'Sugar-Free';
      regexPattern = /sugar-free|sugar free|no sugar|keto|sugarless/i;
    }

    const baseQuery = { available: true };
    if (categoryFilter && categoryFilter.length > 0) {
      baseQuery.category = { $in: categoryFilter };
    }

    baseQuery.$or = [
      { tags: { $regex: regexPattern } },
      { name: { $regex: regexPattern } },
      { description: { $regex: regexPattern } }
    ];

    let items = await MenuItem.find(baseQuery).lean();

    if (items.length === 0) {
      const allItems = await MenuItem.find(categoryFilter && categoryFilter.length > 0 ? { available: true, category: { $in: categoryFilter } } : { available: true }).lean();
      if (isNutFree) {
        items = allItems.filter(i => !/nut|peanut|cashew|almond|walnut/i.test(`${i.name} ${i.description} ${(i.tags||[]).join(' ')}`));
      } else if (isSpicy) {
        items = allItems.filter(i => /spicy|chilli|chili|tikka|masala|curry|hot|pepper|schezwan/i.test(`${i.name} ${i.description} ${(i.tags||[]).join(' ')}`));
      } else if (isHealthy) {
        items = allItems.filter(i => /salad|soup|veg|grilled|steamed|sprouts|fruit|dal/i.test(`${i.name} ${i.description} ${(i.tags||[]).join(' ')}`));
      } else if (isGlutenFree || isDairyFree || isSugarFree) {
        items = allItems.filter(i => !/bread|naan|roti|wheat|pasta|pizza|flour|dairy|milk|cheese|paneer|butter|sugar/i.test(`${i.name} ${i.description} ${(i.tags||[]).join(' ')}`));
      }
    }

    if (items.length > 0) {
      return {
        reply: `🌱 Here are our **${labelStr}** options available right now. Please let our server know about any severe allergies!`,
        type: 'menu',
        items: items.map((i) => i._id.toString()),
      };
    } else {
      return {
        reply: `We don't have items explicitly tagged as **${labelStr}** right now, but our chefs can customize many dishes upon request! Please ask your server for assistance.`,
        type: 'menu',
      };
    }
  }

  const isNonVeg = fuzzyMatch(lower, ['non veg', 'non-veg', 'nonvegetarian', 'nonveg', 'meat', 'chicken']);
  const isVeg = !isNonVeg && fuzzyMatch(lower, ['veg', 'vegetarian', 'vegan']);

  if (isNonVeg || isVeg) {
    const query = { available: true };
    if (isNonVeg) {
      query.$or = [
        { tags: { $regex: /non-veg|non veg|meat|chicken|beef|pork|fish|seafood|lamb/i } },
        { name: { $regex: /chicken|beef|pork|fish|lamb|meat|mutton|prawn|seafood/i } }
      ];
    } else {
      query.$and = [
        {
          $or: [
            { tags: { $regex: /(^|\s)veg|vegetarian|vegan/i } },
            { name: { $regex: /(^|\s)veg|paneer|tofu|salad|mushroom|dal|gobi|aloo|chola/i } }
          ]
        },
        { tags: { $not: /non-veg|non veg|meat|chicken|beef|pork|fish|seafood|lamb/i } },
        { name: { $not: /non-veg|non veg|chicken|beef|pork|fish|lamb|meat|mutton|prawn|seafood/i } }
      ];
    }

    const items = await MenuItem.find(query).lean();
    const typeStr = isNonVeg ? 'non-vegetarian' : 'vegetarian';

    if (items.length > 0) {
      return {
        reply: `Here are some ${typeStr} options we have available. Would you like to add any to your order?`,
        type: 'menu',
        items: items.map((i) => i._id.toString()),
      };
    } else {
      return {
        reply: `We couldn't specifically filter ${typeStr} items matching that right now, but please ask our staff or check the main menu!`,
        type: 'menu',
      };
    }
  }

  // Drinks
  if (fuzzyMatch(lower, ['drink', 'drinks', 'beverage', 'beverages'])) {
    const categories = await Category.find({
      name: { $regex: /drink|beverage/i }
    }).lean();

    if (categories.length > 0) {
      const categoryIds = categories.map(c => c._id);
      const items = await MenuItem.find({ available: true, category: { $in: categoryIds } }).lean();

      if (items.length > 0) {
        return {
          reply: `Here are the drinks we have available. Would you like to order any?`,
          type: 'menu',
          items: items.map((i) => i._id.toString()),
        };
      }
    }

    return {
      reply: 'We do not have any specific drinks listed right now, but please ask our staff!',
      type: 'menu',
    };
  }

  // Smart Meal Pairings & Upselling Suggestions
  if (fuzzyMatch(lower, ['pair', 'pairing', 'pairings', 'goes well', 'completes', 'combo', 'side', 'sides', 'with biryani', 'with paneer', 'with chicken', 'what to drink'])) {
    let regexQuery = /naan|roti|lassi|soda|juice|shake|ice cream|gulab jamun|dessert|drink|bread/i;
    let label = 'breads, beverages, and desserts';

    if (fuzzyMatch(lower, ['drink', 'beverage', 'lassi', 'shake', 'soda'])) {
      regexQuery = /lassi|shake|juice|soda|beverage|drink|cold drink/i;
      label = 'refreshing beverages';
    } else if (fuzzyMatch(lower, ['bread', 'naan', 'roti', 'paratha'])) {
      regexQuery = /naan|roti|paratha|bread|kulcha/i;
      label = 'fresh Indian breads';
    } else if (fuzzyMatch(lower, ['dessert', 'sweet', 'ice cream'])) {
      regexQuery = /gulab jamun|ice cream|brownie|kheer|rasgulla|pastry|dessert|cake/i;
      label = 'delicious desserts';
    }

    const items = await MenuItem.find({
      available: true,
      $or: [
        { name: { $regex: regexQuery } },
        { tags: { $regex: regexQuery } }
      ]
    }).limit(4).lean();

    if (items.length > 0) {
      return {
        reply: `🍹 Here are some popular ${label} that pair perfectly with your meal:`,
        type: 'recommendation',
        items: items.map(i => i._id.toString())
      };
    }
  }

  // Starters / Appetizers
  if (fuzzyMatch(lower, ['starter', 'starters', 'appetizer', 'appetizers'])) {
    const categories = await Category.find({
      name: { $regex: /starter|appetizer/i }
    }).lean();

    const categoryIds = categories.map(c => c._id);
    const query = { available: true };
    query.$or = [
      { category: { $in: categoryIds } },
      { tags: { $regex: /starter|appetizer|fries|soup|salad|wings|kebab|tikka|roll/i } },
      { name: { $regex: /starter|appetizer|fries|soup|salad|wings|kebab|tikka|roll/i } }
    ];

    const items = await MenuItem.find(query).lean();
    if (items.length > 0) {
      return {
        reply: `Here are the starters we have available. Would you like to start with any of these?`,
        type: 'menu',
        items: items.map((i) => i._id.toString()),
      };
    } else {
      return {
        reply: 'We do not have any specific starters listed right now. Please ask our staff!',
        type: 'menu',
      };
    }
  }

  // Mains / Main Course
  if (fuzzyMatch(lower, ['main course', 'mains', 'main', 'main items'])) {
    const categories = await Category.find({
      name: { $regex: /main/i }
    }).lean();

    const categoryIds = categories.map(c => c._id);
    const query = { available: true };
    query.$or = [
      { category: { $in: categoryIds } },
      { tags: { $regex: /main|curry|thali|pizza|burger|pasta|biryani|noodle/i } },
      { name: { $regex: /curry|thali|pizza|burger|pasta|biryani|noodle/i } }
    ];

    const items = await MenuItem.find(query).lean();
    if (items.length > 0) {
      return {
        reply: `Here are the main courses we have available. What would you like to have?`,
        type: 'menu',
        items: items.map((i) => i._id.toString()),
      };
    } else {
      return {
        reply: 'We do not have any specific main courses listed right now. Please ask our staff!',
        type: 'menu',
      };
    }
  }

  // Desserts
  if (fuzzyMatch(lower, ['dessert', 'desserts', 'sweet', 'sweets', 'pudding', 'puddings'])) {
    const categories = await Category.find({
      name: { $regex: /dessert|sweet|pastry/i }
    }).lean();

    const categoryIds = categories.map(c => c._id);
    const query = { available: true };
    query.$or = [
      { category: { $in: categoryIds } },
      { tags: { $regex: /dessert|sweet|cake|ice cream|pastry|brownie|pudding|cookie|pie|tart/i } },
      { name: { $regex: /dessert|sweet|cake|ice cream|pastry|brownie|pudding|cookie|pie|tart/i } }
    ];

    const items = await MenuItem.find(query).lean();
    if (items.length > 0) {
      return {
        reply: `Here are the desserts we have available. Would you like to treat yourself?`,
        type: 'menu',
        items: items.map((i) => i._id.toString()),
      };
    } else {
      return {
        reply: 'We do not have any specific desserts listed right now, but please ask our staff!',
        type: 'menu',
      };
    }
  }

  // Specific Item / Ingredient Search
  const searchKeywords = [
    'chicken', 'paneer', 'mushroom', 'fish', 'mutton', 'prawn',
    'pizza', 'burger', 'rice', 'noodle', 'pasta', 'fries',
    'cake', 'ice cream', 'coffee', 'tea', 'biryani', 'thali', 'salad'
  ];
  let foundKeyword = searchKeywords.find(word => lower.includes(word));
  if (!foundKeyword) {
    for (const kw of searchKeywords) {
      if (fuzzyMatch(lower, [kw])) {
        foundKeyword = kw;
        break;
      }
    }
  }

  if (foundKeyword) {
    const items = await MenuItem.find({
      available: true,
      $or: [
        { name: { $regex: new RegExp(foundKeyword, 'i') } },
        { tags: { $regex: new RegExp(foundKeyword, 'i') } }
      ]
    }).lean();

    if (items.length > 0) {
      return {
        reply: `Here are the ${foundKeyword} items we have available. Would you like to add any to your order?`,
        type: 'menu',
        items: items.map((i) => i._id.toString()),
      };
    }
  }

  // Menu / lists
  if (fuzzyMatch(lower, ['menu', 'list', 'what do you have'])) {
    const items = await MenuItem.find({ available: true }).lean();
    return {
      reply: items.length > 0 ? 'Here is our menu:' : 'Our menu is being updated. Please ask staff for the latest menu.',
      type: 'full_menu',
      items: items.map((i) => i._id.toString()),
    };
  }

  // Frequently ordered items
  if (fuzzyMatch(lower, ['frequent', 'frequently', 'often ordered', 'most ordered', 'mostly ordered'])) {
    try {
      const popularAggregation = await Order.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $unwind: '$items' },
        { $group: { _id: '$items.menuItem', count: { $sum: '$items.quantity' } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]);

      let items = [];
      if (popularAggregation.length > 0) {
        const itemIds = popularAggregation.map(item => item._id);
        items = await MenuItem.find({ _id: { $in: itemIds }, available: true }).lean();

        // Sort items in the order of popularity count from the aggregation
        const orderMap = {};
        popularAggregation.forEach((pop, idx) => {
          orderMap[pop._id.toString()] = idx;
        });
        items.sort((a, b) => {
          const indexA = orderMap[a._id.toString()] ?? Infinity;
          const indexB = orderMap[b._id.toString()] ?? Infinity;
          return indexA - indexB;
        });
      }

      // Fallback: if no orders or no popular items found, fallback to chef recommendations or top items
      if (items.length === 0) {
        items = await MenuItem.find({ isChefRecommended: true, available: true }).lean();
        if (items.length === 0) {
          items = await MenuItem.find({ available: true }).limit(5).lean();
        }
      }

      return {
        reply: `🔥 Here are our most frequently ordered items. Would you like to try any of these?`,
        type: 'recommendation',
        items: items.map((i) => i._id.toString()),
      };
    } catch (err) {
      console.error("Error fetching frequently ordered items:", err);
      // Fallback in case of aggregation error
      let items = await MenuItem.find({ isChefRecommended: true, available: true }).lean();
      if (items.length === 0) {
        items = await MenuItem.find({ available: true }).limit(5).lean();
      }
      return {
        reply: `🔥 Here are our most popular recommendations. Would you like to try any of these?`,
        type: 'recommendation',
        items: items.map((i) => i._id.toString()),
      };
    }
  }

  // Popular / bestseller / recommend
  if (fuzzyMatch(lower, ['popular', 'bestseller', 'best', 'recommend', 'recommendation', 'chef'])) {
    // 🌟 Fetch items marked as Chef's Recommendation from the database
    let items = await MenuItem.find({ isChefRecommended: true, available: true }).lean();

    // Fallback: if admin hasn't marked any yet, return top available items
    if (items.length === 0) {
      items = await MenuItem.find({ available: true }).limit(5).lean();
    }

    return {
      reply: `👨‍🍳 Here are the Chef's recommendations. Shall I add any of these to your cart?`,
      type: 'recommendation',
      items: items.map((i) => i._id.toString()),
    };
  }

  // Cancel Order
  if (fuzzyMatch(lower, ['cancel'])) {
    if (context.orderId) {
      try {
        const order = await Order.findById(context.orderId).populate('table');
        if (order) {
          if (order.status === 'pending') {
            order.status = 'cancelled';
            await order.save();

            if (order.table) {
              await Table.findByIdAndUpdate(order.table._id, {
                status: 'available',
                currentOrder: null,
              });
            }

            emitOrderUpdate(order._id.toString(), order.toObject());

            return {
              reply: 'Your order has been successfully canceled.',
              type: 'cancel_success'
            };
          } else if (order.status === 'served') {
            return {
              reply: 'Your order has already been served and cannot be canceled.',
              type: 'cancel_failed'
            };
          } else if (order.status === 'cancelled') {
            return {
              reply: 'Your order is already canceled.',
              type: 'cancel_failed'
            };
          } else {
            return {
              reply: "I'm sorry, but our kitchen has already started preparing your order, so it can no longer be canceled automatically. Please speak to a staff member for assistance.",
              type: 'cancel_failed'
            };
          }
        }
      } catch (err) {
        console.error("Error cancelling order:", err);
      }
    }

    return {
      reply: 'You do not have an active order to cancel, or I could not find it.',
      type: 'cancel_invalid'
    };
  }

  // Order status & Live Progress Tracker
  if (fuzzyMatch(lower, ['how long', 'wait time', 'when will', 'estimate', 'order status', 'where is my food', 'where is my order', 'status', 'progress', 'tracker'])) {
    if (context.orderId) {
      try {
        const order = await Order.findById(context.orderId).populate('items.menuItem', 'name price');
        if (order) {
          const totalItems = order.items ? order.items.reduce((acc, curr) => acc + (curr.quantity || 1), 0) : 0;
          let estimatedMinutes = 5 + (totalItems * 3);
          if (order.status === 'preparing') estimatedMinutes = Math.max(2, estimatedMinutes - 5);
          if (['ready', 'served'].includes(order.status)) estimatedMinutes = 0;

          return {
            reply: `Here is your live order status and progress tracker:`,
            type: 'order_progress_tracker',
            order: order.toObject(),
            estimatedMinutes
          };
        }
      } catch (err) {
        console.error("Error fetching order for wait time:", err);
      }
    }

    return {
      reply: 'I can help with that, but it seems you don\'t have an active order right now or I couldn\'t find it. Have you placed an order yet?',
      type: 'wait_time'
    };
  }

  // Reservation
  if (fuzzyMatch(lower, ['reserve', 'reservation', 'book a table', 'booking', 'reserve a table'])) {
    return {
      reply: 'I can help you reserve a table right here! Please enter your details below to confirm your booking.',
      type: 'reservation_form',
    };
  }

  // Hours / location
  if (fuzzyMatch(lower, ['hour', 'hours', 'open', 'close', 'when'])) {
    return {
      reply: 'We are open 11:00 AM – 10:00 PM daily. For special hours, please call the restaurant.',
      type: 'info',
    };
  }

  if (fuzzyMatch(lower, ['where', 'address', 'location'])) {
    return {
      reply: 'You can find us at our main location. Check the footer of our website for the exact address.',
      type: 'info',
    };
  }

  // Payment / Bill / Checkout — includes typo tolerance for 'bill' (e.g. 'nill', 'bii', 'bil')
  if (fuzzyMatch(lower, ['no', 'nope', 'nothing', 'ready to pay', 'check', 'bill', 'bills', 'checkout', 'pay', 'nill', 'bil', 'bll', 'biil', 'biol', 'billl', 'bill please', 'get bill', 'show bill', 'payment', 'receipt'])) {
    let orderObj = null;
    if (context.orderId) {
      try {
        const order = await Order.findById(context.orderId).populate('table');
        if (order) {
          orderObj = order.toObject();
        }
      } catch (err) {
        console.error('Error fetching orders for bill:', err);
      }
    }

    return {
      reply: `Alright! Here is your bill.\n\nWould you prefer to pay online or with cash?`,
      type: 'payment_prompt',
      order: orderObj
    };
  }

  if (fuzzyMatch(lower, ['cash', 'online', 'card'])) {
    if (context.orderId) {
      const method = lower.includes('cash') ? 'cash' : 'online';
      try {
        await Order.findByIdAndUpdate(context.orderId, { paymentMethod: method });
      } catch (err) {
        console.error("Error saving payment method:", err);
      }
    }

    if (lower.includes('online') || lower.includes('card')) {
      return {
        reply: 'Redirecting you to our secure payment gateway...',
        type: 'dodo_payment_redirect',
      };
    }

    return {
      reply: 'Great! Please notify the staff that you are paying with cash. Your payment has been noted. Thank you!',
      type: 'payment_method_selected',
    };
  }

  // Small talk — "how are you", "good morning", "what's up", etc.
  if (fuzzyMatch(lower, ['how are you', 'how r you', 'hows it going', 'how do you do', 'you doing', 'sup', 'whats up', 'what\'s up'])) {
    return {
      reply: 'I\'m doing great, thank you for asking! 😊 Ready to make your dining experience wonderful. Can I help you with the menu, place an order, or answer any questions?',
      type: 'greeting',
    };
  }

  if (fuzzyMatch(lower, ['good morning', 'good evening', 'good afternoon', 'good night', 'good day'])) {
    const hour = new Date().getHours();
    const timeGreet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    return {
      reply: `${timeGreet}! 🌟 Welcome to Royal Rasoi! I'm here to help you with our menu, reservations, or anything else. What would you like today?`,
      type: 'greeting',
    };
  }

  if (fuzzyMatch(lower, ['what can you do', 'help me', 'how can you help', 'what do you do', 'capabilities', 'features'])) {
    return {
      reply: `Here's what I can help you with:\n\n🍽️ **Menu** — Browse items, categories, or filter by diet\n🛒 **Order** — Add items and place your order directly\n⏳ **Order Status** — Track your live order progress\n🌾 **Dietary Filters** — Gluten-free, vegan, spicy, etc.\n🍹 **Meal Pairings** — Suggest drinks & sides with your meal\n🪑 **Reservations** — Book a table inline right here\n💳 **Bill & Payment** — Request your bill or pay online\n\nJust ask me anything! 😊`,
      type: 'greeting',
    };
  }

  if (fuzzyMatch(lower, ['who are you', 'what are you', 'are you a bot', 'are you ai', 'are you robot', 'are you human'])) {
    return {
      reply: 'I\'m the AI Assistant for **Royal Rasoi** 🤖✨ — here to make your dining experience smooth and delightful! I can help you explore the menu, place orders, check order status, book tables, and more.',
      type: 'greeting',
    };
  }

  // Greetings
  if (fuzzyMatch(lower, ['hello', 'hi', 'hey', 'hii', 'helo', 'helo', 'hiii', 'heyy'])) {
    return {
      reply: 'Hello! 👋 Welcome to Royal Rasoi! I\'m your AI assistant — ask me about the menu, place an order, or anything else I can help with.',
      type: 'greeting',
    };
  }

  // Thanks
  if (fuzzyMatch(lower, ['thank', 'thanks', 'appreciate'])) {
    if (context.orderId) {
      try {
        const order = await Order.findById(context.orderId).populate('table');
        if (order && !order.paymentMethod) {
          return {
            reply: `You are very welcome! Whenever you're ready, here is your bill.\n\nWould you prefer to pay online or with cash?`,
            type: 'payment_prompt',
            order: order.toObject()
          };
        }
      } catch (err) {
        console.error('Error fetching orders for thanks bill:', err);
      }
    }
    return {
      reply: 'You are very welcome! Please let me know if there is anything else I can help you with.',
      type: 'greeting',
    };
  }

  // Default - Use Gemini for all other questions
  const geminiRes = await callGemini(message);
  if (geminiRes) return geminiRes;

  // Fallback if no API key or if API call failed
  return {
    reply: 'I can help with menu, recommendations, and general questions. Try: "What’s on the menu?" or "What do you recommend?"',
    type: 'default',
  };
};

exports.chat = async (req, res) => {
  try {
    const { message, orderId } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ message: 'Message is required' });
    }
    const response = await getAIResponse(message, { orderId });
    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
