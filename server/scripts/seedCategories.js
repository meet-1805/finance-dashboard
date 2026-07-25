/**
 * seedCategories.js
 *
 * One-shot seeding of the V2 Category taxonomy.
 *
 * Usage:
 *   node server/scripts/seedCategories.js
 *
 * Safe to run multiple times: uses upsert on (name, userId=null) so it
 * never creates duplicates or overwrites user-created customisations.
 *
 * This script is NEVER called automatically by the server on startup.
 * It must be invoked explicitly by an operator or via the admin API endpoint.
 */

'use strict';

const mongoose = require('mongoose');
const config   = require('../config');
const Category = require('../models/Category');

// ── Full Enterprise Financial Taxonomy ───────────────────────────────────────
//
// Each entry: { name, parentName?, categoryType, icon, colour, keywords, aliases, displayOrder, isSystem }
//
// parentName is resolved to parentId after the parent rows are inserted.

const TAXONOMY = [

  // ── EXPENSE PARENTS ────────────────────────────────────────────────────────
  {
    name: "Food & Dining", categoryType: "Expense", icon: "🍽️", colour: "#F97316",
    keywords: ["food", "dining", "eat", "restaurant", "cafe"],
    aliases: ["Food", "Dining"], displayOrder: 10, isSystem: true
  },
  {
    name: "Transportation", categoryType: "Expense", icon: "🚗", colour: "#3B82F6",
    keywords: ["transport", "travel", "commute", "transit"],
    aliases: ["Transport", "Travel"], displayOrder: 20, isSystem: true
  },
  {
    name: "Housing", categoryType: "Expense", icon: "🏠", colour: "#8B5CF6",
    keywords: ["rent", "mortgage", "housing", "home"],
    aliases: ["Home", "Rent"], displayOrder: 30, isSystem: true
  },
  {
    name: "Utilities", categoryType: "Expense", icon: "💡", colour: "#F59E0B",
    keywords: ["utility", "bill", "electric", "water", "gas", "internet", "wifi", "telecom", "power"],
    aliases: ["Bills"], displayOrder: 40, isSystem: true
  },
  {
    name: "Healthcare", categoryType: "Expense", icon: "🏥", colour: "#EF4444",
    keywords: ["health", "medical", "doctor", "hospital", "pharmacy", "medicine", "clinic"],
    aliases: ["Medical", "Health"], displayOrder: 50, isSystem: true
  },
  {
    name: "Education", categoryType: "Expense", icon: "📚", colour: "#10B981",
    keywords: ["education", "school", "college", "tuition", "course", "books", "training"],
    aliases: ["School", "Learning"], displayOrder: 60, isSystem: true
  },
  {
    name: "Shopping", categoryType: "Expense", icon: "🛍️", colour: "#EC4899",
    keywords: ["shopping", "store", "retail", "purchase", "buy", "mall"],
    aliases: [], displayOrder: 70, isSystem: true
  },
  {
    name: "Entertainment", categoryType: "Expense", icon: "🎬", colour: "#6366F1",
    keywords: ["entertainment", "movie", "cinema", "game", "stream", "netflix", "spotify", "hulu"],
    aliases: ["Leisure", "Fun"], displayOrder: 80, isSystem: true
  },
  {
    name: "Personal Care", categoryType: "Expense", icon: "💅", colour: "#F472B6",
    keywords: ["salon", "spa", "barber", "haircut", "personal", "grooming", "beauty"],
    aliases: ["Beauty", "Grooming"], displayOrder: 90, isSystem: true
  },
  {
    name: "Financial Charges", categoryType: "Expense", icon: "🏦", colour: "#6B7280",
    keywords: ["fee", "charge", "interest", "bank", "loan", "emi", "penalty"],
    aliases: ["Bank Fees", "Charges"], displayOrder: 100, isSystem: true
  },
  {
    name: "Travel", categoryType: "Expense", icon: "✈️", colour: "#0EA5E9",
    keywords: ["flight", "hotel", "airbnb", "vacation", "trip", "booking"],
    aliases: ["Vacation", "Holiday"], displayOrder: 110, isSystem: true
  },
  {
    name: "Gifts & Donations", categoryType: "Expense", icon: "🎁", colour: "#A855F7",
    keywords: ["gift", "donation", "charity", "present"],
    aliases: ["Charity", "Donations"], displayOrder: 120, isSystem: true
  },
  {
    name: "Other Expenses", categoryType: "Expense", icon: "📦", colour: "#D1D5DB",
    keywords: ["misc", "miscellaneous", "other"],
    aliases: ["Miscellaneous", "Other"], displayOrder: 999, isSystem: true
  },

  // ── INCOME PARENTS ─────────────────────────────────────────────────────────
  {
    name: "Employment Income", categoryType: "Income", icon: "💼", colour: "#22C55E",
    keywords: ["salary", "wage", "paycheck", "payroll", "employment", "bonus", "hike"],
    aliases: ["Salary", "Wages"], displayOrder: 10, isSystem: true
  },
  {
    name: "Business Income", categoryType: "Income", icon: "📈", colour: "#16A34A",
    keywords: ["business", "freelance", "consulting", "contract", "invoice", "revenue"],
    aliases: ["Freelance", "Self-Employment"], displayOrder: 20, isSystem: true
  },
  {
    name: "Investment Returns", categoryType: "Income", icon: "💹", colour: "#15803D",
    keywords: ["dividend", "interest", "return", "profit", "investment", "capital gain", "mutual fund"],
    aliases: ["Investment", "Dividends"], displayOrder: 30, isSystem: true
  },
  {
    name: "Rental Income", categoryType: "Income", icon: "🏘️", colour: "#4ADE80",
    keywords: ["rent received", "rental", "lease received"],
    aliases: ["Rent Received"], displayOrder: 40, isSystem: true
  },
  {
    name: "Other Income", categoryType: "Income", icon: "💰", colour: "#86EFAC",
    keywords: ["refund", "reimbursement", "cashback", "reward", "bonus"],
    aliases: ["Miscellaneous Income"], displayOrder: 999, isSystem: true
  },

  // ── TRANSFER ───────────────────────────────────────────────────────────────
  {
    name: "Transfers", categoryType: "Transfer", icon: "🔄", colour: "#94A3B8",
    keywords: ["transfer", "move", "internal", "between accounts"],
    aliases: ["Internal Transfer"], displayOrder: 10, isSystem: true
  },
  {
    name: "Savings", categoryType: "Transfer", icon: "🏧", colour: "#64748B",
    keywords: ["savings", "save", "deposit", "piggy bank"],
    aliases: ["Savings Transfer"], displayOrder: 20, isSystem: true
  },

  // ── CHILDREN: Food & Dining ────────────────────────────────────────────────
  { name: "Groceries",    parentName: "Food & Dining", categoryType: "Expense", icon: "🛒", colour: "#F97316", keywords: ["grocery", "supermarket", "walmart", "mart", "vegetables", "fruit"], aliases: ["Food Shopping"], displayOrder: 1, isSystem: true },
  { name: "Restaurants",  parentName: "Food & Dining", categoryType: "Expense", icon: "🍴", colour: "#F97316", keywords: ["restaurant", "dine", "dining", "eat out"], aliases: ["Dining Out"], displayOrder: 2, isSystem: true },
  { name: "Cafes",        parentName: "Food & Dining", categoryType: "Expense", icon: "☕", colour: "#F97316", keywords: ["cafe", "coffee", "starbucks", "barista"], aliases: ["Coffee"], displayOrder: 3, isSystem: true },
  { name: "Fast Food",    parentName: "Food & Dining", categoryType: "Expense", icon: "🍔", colour: "#F97316", keywords: ["fast food", "mcdonalds", "kfc", "subway", "pizza", "burger", "takeaway"], aliases: ["Takeaway"], displayOrder: 4, isSystem: true },
  { name: "Food Delivery", parentName: "Food & Dining", categoryType: "Expense", icon: "🛵", colour: "#F97316", keywords: ["swiggy", "zomato", "delivery", "doordash", "uber eats", "food delivery"], aliases: ["Delivery"], displayOrder: 5, isSystem: true },
  { name: "Alcohol",      parentName: "Food & Dining", categoryType: "Expense", icon: "🍺", colour: "#F97316", keywords: ["bar", "pub", "alcohol", "wine", "beer", "liquor"], aliases: ["Drinks"], displayOrder: 6, isSystem: true },

  // ── CHILDREN: Transportation ───────────────────────────────────────────────
  { name: "Fuel",             parentName: "Transportation", categoryType: "Expense", icon: "⛽", colour: "#3B82F6", keywords: ["petrol", "fuel", "diesel", "gas station", "filling station"], aliases: ["Petrol", "Gas"], displayOrder: 1, isSystem: true },
  { name: "Taxi & Ride Share", parentName: "Transportation", categoryType: "Expense", icon: "🚕", colour: "#3B82F6", keywords: ["uber", "lyft", "ola", "rapido", "taxi", "cab", "rideshare"], aliases: ["Cab", "Ride"], displayOrder: 2, isSystem: true },
  { name: "Public Transport", parentName: "Transportation", categoryType: "Expense", icon: "🚌", colour: "#3B82F6", keywords: ["bus", "metro", "train", "subway", "transit", "tram", "rail"], aliases: ["Transit", "Bus", "Metro"], displayOrder: 3, isSystem: true },
  { name: "Parking",          parentName: "Transportation", categoryType: "Expense", icon: "🅿️", colour: "#3B82F6", keywords: ["parking", "park fee"], aliases: [], displayOrder: 4, isSystem: true },
  { name: "Tolls",            parentName: "Transportation", categoryType: "Expense", icon: "🛣️", colour: "#3B82F6", keywords: ["toll", "fastag", "highway"], aliases: ["Highway Toll"], displayOrder: 5, isSystem: true },
  { name: "Vehicle Maintenance", parentName: "Transportation", categoryType: "Expense", icon: "🔧", colour: "#3B82F6", keywords: ["service", "repair", "mechanic", "tyre", "vehicle"], aliases: ["Car Service"], displayOrder: 6, isSystem: true },

  // ── CHILDREN: Housing ──────────────────────────────────────────────────────
  { name: "Rent",           parentName: "Housing", categoryType: "Expense", icon: "🏡", colour: "#8B5CF6", keywords: ["rent", "monthly rent", "house rent"], aliases: [], displayOrder: 1, isSystem: true },
  { name: "Mortgage",       parentName: "Housing", categoryType: "Expense", icon: "🏦", colour: "#8B5CF6", keywords: ["mortgage", "emi", "home loan"], aliases: ["Home Loan"], displayOrder: 2, isSystem: true },
  { name: "Home Repairs",   parentName: "Housing", categoryType: "Expense", icon: "🛠️", colour: "#8B5CF6", keywords: ["repair", "plumber", "electrician", "maintenance", "fix"], aliases: ["Maintenance"], displayOrder: 3, isSystem: true },
  { name: "Home Supplies",  parentName: "Housing", categoryType: "Expense", icon: "🧹", colour: "#8B5CF6", keywords: ["cleaning", "supplies", "household", "detergent"], aliases: ["Household"], displayOrder: 4, isSystem: true },

  // ── CHILDREN: Utilities ────────────────────────────────────────────────────
  { name: "Electricity",  parentName: "Utilities", categoryType: "Expense", icon: "⚡", colour: "#F59E0B", keywords: ["electricity", "electric bill", "power bill", "bescom", "tpddl"], aliases: ["Power"], displayOrder: 1, isSystem: true },
  { name: "Water Bill",   parentName: "Utilities", categoryType: "Expense", icon: "💧", colour: "#F59E0B", keywords: ["water", "water bill", "sewage"], aliases: ["Water"], displayOrder: 2, isSystem: true },
  { name: "Internet",     parentName: "Utilities", categoryType: "Expense", icon: "📶", colour: "#F59E0B", keywords: ["internet", "broadband", "wifi", "jio", "airtel", "act"], aliases: ["Broadband", "WiFi"], displayOrder: 3, isSystem: true },
  { name: "Phone Bill",   parentName: "Utilities", categoryType: "Expense", icon: "📱", colour: "#F59E0B", keywords: ["phone", "mobile", "recharge", "postpaid", "prepaid", "bsnl", "vodafone"], aliases: ["Mobile Bill", "Recharge"], displayOrder: 4, isSystem: true },
  { name: "Gas Bill",     parentName: "Utilities", categoryType: "Expense", icon: "🔥", colour: "#F59E0B", keywords: ["gas", "lpg", "cylinder", "pipeline gas"], aliases: ["LPG"], displayOrder: 5, isSystem: true },
  { name: "Cable & OTT",  parentName: "Utilities", categoryType: "Expense", icon: "📺", colour: "#F59E0B", keywords: ["cable", "dth", "hotstar", "prime", "zee5", "subscription"], aliases: ["Streaming", "OTT"], displayOrder: 6, isSystem: true },

  // ── CHILDREN: Healthcare ───────────────────────────────────────────────────
  { name: "Doctor Visits",  parentName: "Healthcare", categoryType: "Expense", icon: "👨‍⚕️", colour: "#EF4444", keywords: ["doctor", "consultation", "appointment", "physician", "specialist"], aliases: ["Consultation"], displayOrder: 1, isSystem: true },
  { name: "Medicines",      parentName: "Healthcare", categoryType: "Expense", icon: "💊", colour: "#EF4444", keywords: ["medicine", "pharmacy", "drug", "tablet", "prescription", "apollo pharmacy", "medplus"], aliases: ["Pharmacy", "Drugs"], displayOrder: 2, isSystem: true },
  { name: "Lab Tests",      parentName: "Healthcare", categoryType: "Expense", icon: "🧪", colour: "#EF4444", keywords: ["lab", "test", "pathology", "blood test", "scan", "mri", "xray"], aliases: ["Diagnostics", "Tests"], displayOrder: 3, isSystem: true },
  { name: "Insurance",      parentName: "Healthcare", categoryType: "Expense", icon: "🛡️", colour: "#EF4444", keywords: ["insurance", "health premium", "mediclaim"], aliases: ["Health Insurance"], displayOrder: 4, isSystem: true },
  { name: "Fitness",        parentName: "Healthcare", categoryType: "Expense", icon: "🏋️", colour: "#EF4444", keywords: ["gym", "fitness", "yoga", "sports", "workout"], aliases: ["Gym"], displayOrder: 5, isSystem: true },

  // ── CHILDREN: Education ────────────────────────────────────────────────────
  { name: "Tuition & Fees",   parentName: "Education", categoryType: "Expense", icon: "🎓", colour: "#10B981", keywords: ["tuition", "fees", "school fee", "college fee", "admission"], aliases: ["School Fees"], displayOrder: 1, isSystem: true },
  { name: "Books & Stationery", parentName: "Education", categoryType: "Expense", icon: "📖", colour: "#10B981", keywords: ["book", "stationery", "notebook", "pen", "pencil"], aliases: ["Stationery"], displayOrder: 2, isSystem: true },
  { name: "Online Courses",    parentName: "Education", categoryType: "Expense", icon: "💻", colour: "#10B981", keywords: ["udemy", "coursera", "online course", "e-learning", "skill", "certification"], aliases: ["e-Learning", "MOOC"], displayOrder: 3, isSystem: true },
  { name: "Coaching",          parentName: "Education", categoryType: "Expense", icon: "📝", colour: "#10B981", keywords: ["coaching", "tutor", "tutorial", "class"], aliases: ["Tutoring"], displayOrder: 4, isSystem: true },

  // ── CHILDREN: Shopping ─────────────────────────────────────────────────────
  { name: "Clothing",     parentName: "Shopping", categoryType: "Expense", icon: "👕", colour: "#EC4899", keywords: ["cloth", "clothing", "dress", "shirt", "zara", "h&m", "myntra", "fashion"], aliases: ["Fashion", "Apparel"], displayOrder: 1, isSystem: true },
  { name: "Electronics",  parentName: "Shopping", categoryType: "Expense", icon: "📱", colour: "#EC4899", keywords: ["electronics", "mobile", "laptop", "gadget", "tech", "apple", "samsung", "croma"], aliases: ["Gadgets"], displayOrder: 2, isSystem: true },
  { name: "Home Decor",   parentName: "Shopping", categoryType: "Expense", icon: "🪴", colour: "#EC4899", keywords: ["decor", "furniture", "ikea", "home decor", "lamp", "curtain"], aliases: ["Furniture", "Decor"], displayOrder: 3, isSystem: true },
  { name: "Online Shopping", parentName: "Shopping", categoryType: "Expense", icon: "🛒", colour: "#EC4899", keywords: ["amazon", "flipkart", "meesho", "online", "e-commerce"], aliases: ["E-commerce"], displayOrder: 4, isSystem: true },

  // ── CHILDREN: Entertainment ────────────────────────────────────────────────
  { name: "Movies & Cinema", parentName: "Entertainment", categoryType: "Expense", icon: "🎞️", colour: "#6366F1", keywords: ["movie", "cinema", "pvr", "inox", "theatre"], aliases: ["Cinema"], displayOrder: 1, isSystem: true },
  { name: "Music",           parentName: "Entertainment", categoryType: "Expense", icon: "🎵", colour: "#6366F1", keywords: ["music", "spotify", "apple music", "concert", "gig"], aliases: ["Spotify"], displayOrder: 2, isSystem: true },
  { name: "Gaming",          parentName: "Entertainment", categoryType: "Expense", icon: "🎮", colour: "#6366F1", keywords: ["gaming", "steam", "playstation", "xbox", "game", "psn"], aliases: ["Games"], displayOrder: 3, isSystem: true },
  { name: "Events",          parentName: "Entertainment", categoryType: "Expense", icon: "🎟️", colour: "#6366F1", keywords: ["event", "party", "concert", "show", "ticket", "bookmyshow"], aliases: ["Tickets", "Shows"], displayOrder: 4, isSystem: true },

  // ── CHILDREN: Personal Care ────────────────────────────────────────────────
  { name: "Salon & Spa", parentName: "Personal Care", categoryType: "Expense", icon: "💇", colour: "#F472B6", keywords: ["salon", "spa", "massage", "facial", "nail"], aliases: ["Beauty Treatment"], displayOrder: 1, isSystem: true },
  { name: "Grooming",    parentName: "Personal Care", categoryType: "Expense", icon: "🪒", colour: "#F472B6", keywords: ["barber", "shave", "haircut", "grooming"], aliases: ["Haircut", "Barber"], displayOrder: 2, isSystem: true },

  // ── CHILDREN: Travel ───────────────────────────────────────────────────────
  { name: "Flights",       parentName: "Travel", categoryType: "Expense", icon: "✈️", colour: "#0EA5E9", keywords: ["flight", "airline", "air india", "indigo", "airasia", "makemytrip flights"], aliases: ["Air Travel"], displayOrder: 1, isSystem: true },
  { name: "Hotels",        parentName: "Travel", categoryType: "Expense", icon: "🏨", colour: "#0EA5E9", keywords: ["hotel", "resort", "airbnb", "oyo", "booking.com", "makemytrip hotel"], aliases: ["Accommodation", "Resort"], displayOrder: 2, isSystem: true },
  { name: "Local Travel",  parentName: "Travel", categoryType: "Expense", icon: "🗺️", colour: "#0EA5E9", keywords: ["sightseeing", "tour", "excursion", "guide", "attraction"], aliases: ["Sightseeing", "Tourism"], displayOrder: 3, isSystem: true },

  // ── CHILDREN: Gifts & Donations ────────────────────────────────────────────
  { name: "Gifts",     parentName: "Gifts & Donations", categoryType: "Expense", icon: "🎀", colour: "#A855F7", keywords: ["gift", "present", "birthday", "anniversary"], aliases: ["Presents"], displayOrder: 1, isSystem: true },
  { name: "Charity",   parentName: "Gifts & Donations", categoryType: "Expense", icon: "❤️", colour: "#A855F7", keywords: ["charity", "donation", "ngo", "relief fund", "temple", "church", "mosque"], aliases: ["Donation", "NGO"], displayOrder: 2, isSystem: true },

  // ── CHILDREN: Financial Charges ────────────────────────────────────────────
  { name: "Bank Fees",    parentName: "Financial Charges", categoryType: "Expense", icon: "🏧", colour: "#6B7280", keywords: ["bank fee", "service charge", "atm", "annual fee", "processing fee"], aliases: ["Service Charge"], displayOrder: 1, isSystem: true },
  { name: "Loan EMI",     parentName: "Financial Charges", categoryType: "Expense", icon: "💳", colour: "#6B7280", keywords: ["emi", "loan", "installment", "repayment"], aliases: ["Installment"], displayOrder: 2, isSystem: true },
  { name: "Credit Card",  parentName: "Financial Charges", categoryType: "Expense", icon: "💳", colour: "#6B7280", keywords: ["credit card", "card payment", "credit bill"], aliases: ["Card Bill"], displayOrder: 3, isSystem: true },
  { name: "Taxes",        parentName: "Financial Charges", categoryType: "Expense", icon: "📋", colour: "#6B7280", keywords: ["tax", "income tax", "gst", "tds"], aliases: ["Income Tax", "GST"], displayOrder: 4, isSystem: true },

  // ── CHILDREN: Employment Income ────────────────────────────────────────────
  { name: "Salary",           parentName: "Employment Income", categoryType: "Income", icon: "💰", colour: "#22C55E", keywords: ["salary", "monthly salary", "ctc"], aliases: ["Monthly Salary"], displayOrder: 1, isSystem: true },
  { name: "Bonus",            parentName: "Employment Income", categoryType: "Income", icon: "🎉", colour: "#22C55E", keywords: ["bonus", "incentive", "performance bonus", "annual bonus"], aliases: ["Incentive"], displayOrder: 2, isSystem: true },
  { name: "Reimbursements",   parentName: "Employment Income", categoryType: "Income", icon: "🧾", colour: "#22C55E", keywords: ["reimbursement", "expense reimbursement", "refund employer"], aliases: ["Expense Refund"], displayOrder: 3, isSystem: true },

  // ── CHILDREN: Business Income ──────────────────────────────────────────────
  { name: "Freelance",    parentName: "Business Income", categoryType: "Income", icon: "👨‍💻", colour: "#16A34A", keywords: ["freelance", "project payment", "contract income", "gig income"], aliases: ["Contract"], displayOrder: 1, isSystem: true },
  { name: "Consulting",   parentName: "Business Income", categoryType: "Income", icon: "🤝", colour: "#16A34A", keywords: ["consulting", "advisory", "professional fee"], aliases: ["Advisory"], displayOrder: 2, isSystem: true },

  // ── CHILDREN: Investment Returns ───────────────────────────────────────────
  { name: "Dividends",       parentName: "Investment Returns", categoryType: "Income", icon: "📊", colour: "#15803D", keywords: ["dividend", "stock dividend", "share dividend"], aliases: [], displayOrder: 1, isSystem: true },
  { name: "Interest Earned", parentName: "Investment Returns", categoryType: "Income", icon: "🏛️", colour: "#15803D", keywords: ["interest", "fd interest", "savings interest", "bank interest"], aliases: ["Bank Interest", "FD Interest"], displayOrder: 2, isSystem: true },
  { name: "Capital Gains",   parentName: "Investment Returns", categoryType: "Income", icon: "📈", colour: "#15803D", keywords: ["capital gain", "profit on sale", "equity profit"], aliases: ["Investment Profit"], displayOrder: 3, isSystem: true },

  // ── CHILDREN: Other Income ─────────────────────────────────────────────────
  { name: "Cashback & Rewards", parentName: "Other Income", categoryType: "Income", icon: "🎁", colour: "#86EFAC", keywords: ["cashback", "rewards", "points", "referral"], aliases: ["Cashback", "Reward"], displayOrder: 1, isSystem: true },
  { name: "Refunds",            parentName: "Other Income", categoryType: "Income", icon: "↩️", colour: "#86EFAC", keywords: ["refund", "return credit", "reversal"], aliases: ["Return", "Reversal"], displayOrder: 2, isSystem: true }

];

// ─────────────────────────────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(config.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  console.log('[Seed] MongoDB connected');

  // Separate parents from children
  const parents  = TAXONOMY.filter(t => !t.parentName);
  const children = TAXONOMY.filter(t =>  t.parentName);

  // ── 1. Upsert parents ──────────────────────────────────────────────────────
  const nameToId = new Map();

  for (const p of parents) {
    const { parentName: _ignored, ...fields } = p;
    const doc = await Category.findOneAndUpdate(
      { name: p.name, userId: null },
      { $setOnInsert: { userId: null }, $set: { ...fields, parentId: null } },
      { upsert: true, new: true }
    );
    nameToId.set(doc.name, doc._id);
    console.log(`[Seed] Parent upserted: ${doc.name}  (${doc._id})`);
  }

  // ── 2. Upsert children (resolve parentId from map) ────────────────────────
  for (const c of children) {
    const { parentName, ...fields } = c;
    const parentId = nameToId.get(parentName) || null;
    const doc = await Category.findOneAndUpdate(
      { name: c.name, userId: null },
      { $setOnInsert: { userId: null }, $set: { ...fields, parentId } },
      { upsert: true, new: true }
    );
    console.log(`[Seed] Child upserted: ${doc.name}  (parent: ${parentName})`);
  }

  const total = await Category.countDocuments({ isSystem: true, userId: null });
  console.log(`[Seed] Complete. Total system categories: ${total}`);
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('[Seed] Failed:', err.message);
  process.exit(1);
});
