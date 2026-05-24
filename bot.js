const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');
const db = require('./database');
const stripeHandler = require('./stripe-handler');

const bot = new TelegramBot(config.telegram.token, { polling: true });

// Mensagem de boas-vindas
const WELCOME_MESSAGE = `🔞 *Bem-vindo(a) ao EloaVIP!*

Aqui você encontra conteúdos exclusivos e premium.

⚠️ *ATENÇÃO: Conteúdo apenas para maiores de 18 anos.*

Ao continuar, você confirma ter 18 anos ou mais.

Escolha seu pack abaixo e tenha acesso imediato após o pagamento! 👇`;

// Menu de produtos
const MENU_MESSAGE = `📦 *NOSSOS PACKS:*

🔥 *Pack Entrada* — R$ 49,90
Conteúdo exclusivo de entrada

💎 *Pack Padrão* — R$ 129,90
Conteúdo premium selecionado

👑 *Pack Premium* — R$ 249,90
Conteúdo premium completo

🖤 *Pack Noir* — R$ 399,90
Conteúdo ultra exclusivo

⭐ *Full VIP* — R$ 699,90
TODOS os conteúdos disponíveis

🔐 *Clube Secreto da Eloa* — R$ 99,90/mês
Conteúdo novo todo mês + acesso ao clube

━━━━━━━━━━━━━━━
💳 Pagamento via PIX ou Cartão
✅ Acesso imediato após confirmação
🔗 Link único e exclusivo para você
⏰ Link expira em 24 horas após geração`;

// Comando /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, WELCOME_MESSAGE, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '✅ Tenho 18+ anos - Ver Packs', callback_data: 'show_menu' }],
      ],
    },
  });
});

// Comando /menu
bot.onText(/\/menu/, (msg) => {
  showMenu(msg.chat.id);
});

// Comando /ajuda
bot.onText(/\/ajuda/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `❓ *Ajuda - EloaVIP Bot*

📌 *Comandos disponíveis:*
/start - Iniciar o bot
/menu - Ver packs disponíveis
/ajuda - Ver esta mensagem
/minhascompras - Ver suas compras

📌 *Como funciona:*
1. Escolha um pack
2. Clique em "Pagar"
3. Faça o pagamento via PIX ou cartão
4. Receba seu link de acesso automaticamente

📌 *Dúvidas?*
Entre em contato com o suporte.`, {
    parse_mode: 'Markdown',
  });
});

// Comando /minhascompras
bot.onText(/\/minhascompras/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const purchases = db.getUserPurchases(userId);

  if (purchases.length === 0) {
    bot.sendMessage(chatId, '📭 Você ainda não fez nenhuma compra.');
    return;
  }

  let text = '🛒 *Suas compras:*\n\n';
  purchases.forEach((p, i) => {
    const product = config.products.find(prod => prod.id === p.product_id);
    text += `${i + 1}. ${product ? product.name : p.product_id} - R$ ${(p.amount / 100).toFixed(2)} - ${p.paid_at}\n`;
  });

  bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
});

// Mostrar menu
function showMenu(chatId) {
  const keyboard = config.products.map((product) => {
    return [{ text: `${product.name} - ${product.priceDisplay}`, callback_data: `buy_${product.id}` }];
  });

  bot.sendMessage(chatId, MENU_MESSAGE, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: keyboard,
    },
  });
}

// Callback queries (botões)
bot.on('callback_query', async (callbackQuery) => {
  const msg = callbackQuery.message;
  const chatId = msg.chat.id;
  const userId = callbackQuery.from.id;
  const username = callbackQuery.from.username || '';
  const data = callbackQuery.data;

  // Confirmar callback
  bot.answerCallbackQuery(callbackQuery.id);

  if (data === 'show_menu') {
    showMenu(chatId);
    return;
  }

  if (data.startsWith('buy_')) {
    const productId = data.replace('buy_', '');
    const product = config.products.find((p) => p.id === productId);

    if (!product) {
      bot.sendMessage(chatId, '❌ Produto não encontrado.');
      return;
    }

    // Confirmar compra
    bot.sendMessage(chatId, `🛒 *Você escolheu:*\n\n${product.name}\n💰 Valor: ${product.priceDisplay}\n\n${product.type === 'subscription' ? '🔄 Cobrança mensal automática' : '💳 Pagamento único'}\n\nDeseja prosseguir com o pagamento?`, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ Pagar Agora', callback_data: `confirm_${product.id}` }],
          [{ text: '❌ Cancelar', callback_data: 'show_menu' }],
        ],
      },
    });
    return;
  }

  if (data.startsWith('confirm_')) {
    const productId = data.replace('confirm_', '');
    const product = config.products.find((p) => p.id === productId);

    if (!product) {
      bot.sendMessage(chatId, '❌ Produto não encontrado.');
      return;
    }

    try {
      bot.sendMessage(chatId, '⏳ Gerando link de pagamento...');

      let session;
      if (product.type === 'subscription') {
        session = await stripeHandler.createSubscriptionCheckout(product, userId, username);
      } else {
        session = await stripeHandler.createOneTimeCheckout(product, userId, username);
      }

      // Salvar no banco
      db.createPurchase(userId, username, product.id, session.id, product.price);

      // Enviar link de pagamento
      bot.sendMessage(chatId, `💳 *Link de pagamento gerado!*\n\n${product.name}\n💰 ${product.priceDisplay}\n\n👇 Clique no botão abaixo para pagar:\n\n⚠️ Após o pagamento, seu link de acesso será enviado automaticamente aqui neste chat.\n\n⏰ O link de acesso expira em 24 horas após ser gerado.`, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '💳 Pagar Agora', url: session.url }],
            [{ text: '🔙 Voltar ao Menu', callback_data: 'show_menu' }],
          ],
        },
      });
    } catch (error) {
      console.error('Erro ao criar checkout:', error);
      bot.sendMessage(chatId, '❌ Erro ao gerar link de pagamento. Tente novamente mais tarde.');
    }
    return;
  }
});

// Função para gerar link de convite único
async function generateInviteLink(channelId) {
  try {
    const expireDate = Math.floor(Date.now() / 1000) + 86400; // 24 horas
    const inviteLink = await bot.createChatInviteLink(channelId, {
      member_limit: 1,
      expire_date: expireDate,
    });
    return inviteLink.invite_link;
  } catch (error) {
    console.error('Erro ao gerar link de convite:', error);
    throw error;
  }
}

// Função para enviar link de acesso após pagamento
async function sendAccessLink(telegramUserId, productId, stripeSessionId) {
  const product = config.products.find((p) => p.id === productId);
  if (!product) {
    console.error('Produto não encontrado:', productId);
    return;
  }

  try {
    const inviteLink = await generateInviteLink(product.channelId);

    // Atualizar no banco
    db.markPurchasePaid(stripeSessionId, inviteLink);

    // Enviar link ao usuário
    bot.sendMessage(telegramUserId, `✅ *Pagamento confirmado!*\n\n🎉 Seu acesso ao ${product.name} está pronto!\n\n🔗 *Seu link de acesso exclusivo:*\n${inviteLink}\n\n⚠️ *IMPORTANTE:*\n• Este link é único e funciona apenas 1 vez\n• Expira em 24 horas\n• Não compartilhe com ninguém\n\nAproveite! 🔥`, {
      parse_mode: 'Markdown',
    });

    console.log(`✅ Link enviado para user ${telegramUserId} - Produto: ${productId}`);
  } catch (error) {
    console.error('Erro ao enviar link de acesso:', error);
    bot.sendMessage(telegramUserId, '❌ Houve um erro ao gerar seu link. Entre em contato com o suporte.');
  }
}

// Função para remover membro do canal (assinatura cancelada)
async function removeMemberFromChannel(telegramUserId, channelId) {
  try {
    await bot.banChatMember(channelId, telegramUserId);
    // Desbanir para permitir reentrada futura se assinar novamente
    await bot.unbanChatMember(channelId, telegramUserId);
    console.log(`🚫 Usuário ${telegramUserId} removido do canal ${channelId}`);
  } catch (error) {
    console.error('Erro ao remover membro:', error);
  }
}

// Exportar funções para uso no webhook
module.exports = {
  bot,
  sendAccessLink,
  removeMemberFromChannel,
  generateInviteLink,
};
