const config = require('./config');
const stripe = require('stripe')(config.stripe.secretKey);

const stripeHandler = {
  // Criar sessão de checkout para pagamento único
  async createOneTimeCheckout(product, telegramUserId, telegramUsername) {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      // PIX é habilitado automaticamente para BRL se configurado na conta Stripe
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: product.name,
              description: product.description,
            },
            unit_amount: product.price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${config.server.baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.server.baseUrl}/cancel`,
      metadata: {
        telegram_user_id: telegramUserId.toString(),
        telegram_username: telegramUsername || '',
        product_id: product.id,
        type: 'one_time',
      },
      payment_intent_data: {
        metadata: {
          telegram_user_id: telegramUserId.toString(),
          telegram_username: telegramUsername || '',
          product_id: product.id,
        },
      },
    });
    return session;
  },

  // Criar sessão de checkout para assinatura
  async createSubscriptionCheckout(product, telegramUserId, telegramUsername) {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: product.name,
              description: product.description,
            },
            unit_amount: product.price,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${config.server.baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.server.baseUrl}/cancel`,
      metadata: {
        telegram_user_id: telegramUserId.toString(),
        telegram_username: telegramUsername || '',
        product_id: product.id,
        type: 'subscription',
      },
      subscription_data: {
        metadata: {
          telegram_user_id: telegramUserId.toString(),
          telegram_username: telegramUsername || '',
          product_id: product.id,
        },
      },
    });
    return session;
  },

  // Verificar assinatura do webhook
  verifyWebhook(payload, signature) {
    return stripe.webhooks.constructEvent(
      payload,
      signature,
      config.stripe.webhookSecret
    );
  },
};

module.exports = stripeHandler;
