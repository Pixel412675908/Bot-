require('dotenv').config();
const express = require('express');
const config = require('./config');
const db = require('./database');
const stripe = require('stripe')(config.stripe.secretKey);

const app = express();

async function startServer() {
  // Inicializar banco de dados
  await db.init();

  // Inicializar bot (após banco estar pronto)
  const { bot, sendAccessLink, removeMemberFromChannel } = require('./bot');

  // Webhook do Stripe - DEVE usar raw body
  app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, config.stripe.webhookSecret);
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`📩 Webhook recebido: ${event.type}`);

    switch (event.type) {
      // Pagamento único confirmado
      case 'checkout.session.completed': {
        const session = event.data.object;
        const metadata = session.metadata;

        if (!metadata || !metadata.telegram_user_id) {
          console.error('Metadata não encontrada na sessão');
          break;
        }

        const telegramUserId = parseInt(metadata.telegram_user_id);
        const productId = metadata.product_id;
        const type = metadata.type;

        if (type === 'one_time') {
          // Pagamento único - enviar link de acesso
          await sendAccessLink(telegramUserId, productId, session.id);
        } else if (type === 'subscription') {
          // Assinatura - enviar link de acesso e registrar
          const product = config.products.find(p => p.id === productId);
          if (product) {
            await sendAccessLink(telegramUserId, productId, session.id);
            db.createSubscription(
              telegramUserId,
              metadata.telegram_username || '',
              productId,
              session.subscription,
              session.customer,
              product.channelId
            );
          }
        }
        break;
      }

      // Assinatura renovada com sucesso
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        // Ignorar a primeira fatura (já tratada no checkout.session.completed)
        if (invoice.billing_reason === 'subscription_cycle') {
          const subscriptionId = invoice.subscription;
          const sub = db.getSubscriptionByStripeId(subscriptionId);
          if (sub) {
            console.log(`✅ Assinatura renovada: user ${sub.telegram_user_id}`);
            bot.sendMessage(sub.telegram_user_id, '✅ *Sua assinatura do Clube Secreto foi renovada com sucesso!*\n\nSeu acesso continua ativo. Aproveite! 🔥', {
              parse_mode: 'Markdown',
            });
          }
        }
        break;
      }

      // Pagamento da assinatura falhou
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        const sub = db.getSubscriptionByStripeId(subscriptionId);
        if (sub) {
          bot.sendMessage(sub.telegram_user_id, '⚠️ *Atenção!* O pagamento da sua assinatura do Clube Secreto falhou.\n\nAtualize seu método de pagamento para manter o acesso.\n\nSe o pagamento não for regularizado, seu acesso será removido.', {
            parse_mode: 'Markdown',
          });
        }
        break;
      }

      // Assinatura cancelada/expirada
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const sub = db.getSubscriptionByStripeId(subscription.id);
        if (sub) {
          // Remover do canal
          await removeMemberFromChannel(sub.telegram_user_id, sub.channel_id);
          // Atualizar banco
          db.cancelSubscription(subscription.id);
          // Notificar usuário
          bot.sendMessage(sub.telegram_user_id, '🚫 *Sua assinatura do Clube Secreto foi cancelada.*\n\nSeu acesso ao canal foi removido.\n\nPara reassinar, use /menu', {
            parse_mode: 'Markdown',
          });
          console.log(`🚫 Assinatura cancelada: user ${sub.telegram_user_id}`);
        }
        break;
      }

      default:
        console.log(`Evento não tratado: ${event.type}`);
    }

    res.json({ received: true });
  });

  // Middleware para outras rotas
  app.use(express.json());

  // Rota de sucesso (redirecionamento após pagamento)
  app.get('/success', (req, res) => {
    res.send(`
      <html>
        <head><title>Pagamento Confirmado</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px; background: #1a1a2e; color: white;">
          <h1>✅ Pagamento Confirmado!</h1>
          <p>Volte ao Telegram para receber seu link de acesso.</p>
          <p>O link será enviado automaticamente no chat do bot.</p>
          <a href="https://t.me/EloaVIP_bot" style="color: #00d4ff; font-size: 18px;">👉 Voltar ao Bot</a>
        </body>
      </html>
    `);
  });

  // Rota de cancelamento
  app.get('/cancel', (req, res) => {
    res.send(`
      <html>
        <head><title>Pagamento Cancelado</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px; background: #1a1a2e; color: white;">
          <h1>❌ Pagamento Cancelado</h1>
          <p>O pagamento foi cancelado. Nenhuma cobrança foi feita.</p>
          <a href="https://t.me/EloaVIP_bot" style="color: #00d4ff; font-size: 18px;">👉 Voltar ao Bot</a>
        </body>
      </html>
    `);
  });

  // Health check
  app.get('/', (req, res) => {
    res.json({ status: 'EloaVIP Bot running', timestamp: new Date().toISOString() });
  });

  // Iniciar servidor
  app.listen(config.server.port, () => {
    console.log(`🚀 Servidor rodando na porta ${config.server.port}`);
    console.log(`📡 Webhook URL: ${config.server.baseUrl}/webhook`);
    console.log(`🤖 Bot @EloaVIP_bot está online!`);
  });
}

startServer().catch((err) => {
  console.error('Erro ao iniciar servidor:', err);
  process.exit(1);
});
