const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'eloavip.db');

let db;

async function initDatabase() {
  const SQL = await initSqlJs();

  // Carregar banco existente ou criar novo
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Criar tabelas
  db.run(`
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_user_id INTEGER NOT NULL,
      telegram_username TEXT,
      product_id TEXT NOT NULL,
      stripe_session_id TEXT UNIQUE,
      stripe_subscription_id TEXT,
      amount INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      invite_link TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      paid_at DATETIME
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_user_id INTEGER NOT NULL,
      telegram_username TEXT,
      product_id TEXT NOT NULL,
      stripe_subscription_id TEXT UNIQUE,
      stripe_customer_id TEXT,
      status TEXT DEFAULT 'active',
      channel_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      cancelled_at DATETIME
    )
  `);

  saveDatabase();
  console.log('✅ Banco de dados inicializado');
  return db;
}

function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

// Funções do banco
const dbFunctions = {
  init: initDatabase,

  createPurchase(telegramUserId, telegramUsername, productId, stripeSessionId, amount) {
    db.run(
      `INSERT INTO purchases (telegram_user_id, telegram_username, product_id, stripe_session_id, amount, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [telegramUserId, telegramUsername, productId, stripeSessionId, amount]
    );
    saveDatabase();
  },

  markPurchasePaid(stripeSessionId, inviteLink) {
    db.run(
      `UPDATE purchases SET status = 'paid', invite_link = ?, paid_at = datetime('now')
       WHERE stripe_session_id = ?`,
      [inviteLink, stripeSessionId]
    );
    saveDatabase();
  },

  getPurchaseBySession(stripeSessionId) {
    const stmt = db.prepare('SELECT * FROM purchases WHERE stripe_session_id = ?');
    stmt.bind([stripeSessionId]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  },

  createSubscription(telegramUserId, telegramUsername, productId, stripeSubscriptionId, stripeCustomerId, channelId) {
    db.run(
      `INSERT INTO subscriptions (telegram_user_id, telegram_username, product_id, stripe_subscription_id, stripe_customer_id, channel_id, status)
       VALUES (?, ?, ?, ?, ?, ?, 'active')`,
      [telegramUserId, telegramUsername, productId, stripeSubscriptionId, stripeCustomerId, channelId]
    );
    saveDatabase();
  },

  getSubscriptionByStripeId(stripeSubscriptionId) {
    const stmt = db.prepare('SELECT * FROM subscriptions WHERE stripe_subscription_id = ?');
    stmt.bind([stripeSubscriptionId]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  },

  cancelSubscription(stripeSubscriptionId) {
    db.run(
      `UPDATE subscriptions SET status = 'cancelled', cancelled_at = datetime('now')
       WHERE stripe_subscription_id = ?`,
      [stripeSubscriptionId]
    );
    saveDatabase();
  },

  getActiveSubscriptions(telegramUserId) {
    const results = [];
    const stmt = db.prepare('SELECT * FROM subscriptions WHERE telegram_user_id = ? AND status = ?');
    stmt.bind([telegramUserId, 'active']);
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  },

  getUserPurchases(telegramUserId) {
    const results = [];
    const stmt = db.prepare('SELECT * FROM purchases WHERE telegram_user_id = ? AND status = ?');
    stmt.bind([telegramUserId, 'paid']);
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  },
};

module.exports = dbFunctions;
