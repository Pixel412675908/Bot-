require('dotenv').config();

module.exports = {
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN,
  },
  stripe: {
    publicKey: process.env.STRIPE_PUBLIC_KEY,
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },
  server: {
    port: process.env.PORT || 3000,
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  },
  products: [
    {
      id: 'entrada',
      name: '🔥 Pack Entrada',
      description: 'Acesso ao canal Pack Entrada',
      price: 4990, // em centavos (R$49,90)
      priceDisplay: 'R$ 49,90',
      channelId: -1003814122379,
      type: 'one_time',
    },
    {
      id: 'padrao',
      name: '💎 Pack Padrão',
      description: 'Acesso ao canal Pack Padrão',
      price: 12990, // em centavos (R$129,90)
      priceDisplay: 'R$ 129,90',
      channelId: -1003551571186,
      type: 'one_time',
    },
    {
      id: 'premium',
      name: '👑 Pack Premium',
      description: 'Acesso ao canal Pack Premium',
      price: 24990, // em centavos (R$249,90)
      priceDisplay: 'R$ 249,90',
      channelId: -1003818610382,
      type: 'one_time',
    },
    {
      id: 'noir',
      name: '🖤 Pack Noir',
      description: 'Acesso ao canal Pack Noir',
      price: 39990, // em centavos (R$399,90)
      priceDisplay: 'R$ 399,90',
      channelId: -1003876526670,
      type: 'one_time',
    },
    {
      id: 'fullvip',
      name: '⭐ Full VIP',
      description: 'Acesso ao canal Full VIP - Todos os conteúdos',
      price: 69990, // em centavos (R$699,90)
      priceDisplay: 'R$ 699,90',
      channelId: -1003940074002,
      type: 'one_time',
    },
    {
      id: 'clube_secreto',
      name: '🔐 Clube Secreto da Eloa (Mensal)',
      description: 'Assinatura mensal - Clube Secreto da Eloa',
      price: 9990, // em centavos (R$99,90)
      priceDisplay: 'R$ 99,90/mês',
      channelId: -1003885131733,
      type: 'subscription',
    },
  ],
};
