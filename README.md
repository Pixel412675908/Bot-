# EloaVIP Bot - Sistema de Vendas Automatizado

Bot do Telegram para vendas de conteúdo digital com pagamento via Stripe (PIX e Cartão).

## Funcionalidades

- Menu interativo com todos os packs e preços
- Pagamento via Stripe (PIX e Cartão de Crédito)
- Geração automática de link de convite único após pagamento
- Links expiram em 24h e funcionam apenas 1 vez
- Sistema de assinatura mensal com renovação automática
- Remoção automática de membros inadimplentes
- Proteção de conteúdo nos canais
- Banco de dados SQLite para registro de compras

## Produtos

| Pack | Preço | Tipo |
|------|-------|------|
| Pack Entrada | R$ 49,90 | Único |
| Pack Padrão | R$ 129,90 | Único |
| Pack Premium | R$ 249,90 | Único |
| Pack Noir | R$ 399,90 | Único |
| Full VIP | R$ 699,90 | Único |
| Clube Secreto | R$ 99,90/mês | Assinatura |

## Pré-requisitos

1. Node.js 18+
2. Conta no Stripe com PIX habilitado
3. Bot do Telegram criado via @BotFather
4. Bot adicionado como administrador em todos os canais

## Instalação Local

```bash
# Clonar/copiar o projeto
cd eloavip-bot

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env .env.local
# Edite o .env com suas credenciais

# Rodar
npm start
```

## Configuração do .env

```env
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN
STRIPE_PUBLIC_KEY=YOUR_STRIPE_PUBLIC_KEY
STRIPE_SECRET_KEY=YOUR_STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET
PORT=3000
BASE_URL=https://your-domain.com
```

## Configuração do Stripe Webhook

1. Acesse https://dashboard.stripe.com/webhooks
2. Clique em "Adicionar endpoint"
3. URL: `https://seu-dominio.com/webhook`
4. Eventos para escutar:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
5. Copie o "Signing Secret" (YOUR_WEBHOOK_SECRET) e coloque no .env como STRIPE_WEBHOOK_SECRET

## Configuração do Bot como Admin nos Canais

O bot precisa ser administrador em todos os canais com as seguintes permissões:
- Gerenciar canal
- Convidar usuários via link
- Banir usuários

### Passos:
1. Abra cada canal no Telegram
2. Vá em Administradores > Adicionar Administrador
3. Busque @EloaVIP_bot
4. Ative as permissões necessárias

## Proteção de Conteúdo

Após configurar o bot como admin, execute:

```bash
node protect-channels.js
```

Além disso, em cada canal:
1. Configurações > Tipo de Canal
2. Ative "Restringir salvamento de conteúdo"

## Deploy Gratuito/Barato

### Opção 1: Railway (Recomendado)

1. Crie conta em https://railway.app
2. Conecte seu GitHub ou faça upload do projeto
3. Adicione as variáveis de ambiente
4. Railway gera um domínio automático (use como BASE_URL)
5. Plano gratuito: $5/mês de crédito grátis

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Criar projeto
railway init

# Deploy
railway up
```

### Opção 2: Render

1. Crie conta em https://render.com
2. Novo > Web Service
3. Conecte o repositório ou faça upload
4. Configure:
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Adicione variáveis de ambiente
6. Plano gratuito disponível (pode ter cold starts)

### Opção 3: VPS Barata (Oracle Cloud Free Tier)

1. Crie conta em https://cloud.oracle.com (VPS gratuita para sempre)
2. Crie uma instância ARM (4 CPUs, 24GB RAM grátis)
3. Instale Node.js
4. Use PM2 para manter o bot rodando:

```bash
npm install -g pm2
pm2 start index.js --name eloavip-bot
pm2 save
pm2 startup
```

5. Configure Nginx como proxy reverso para o webhook

### Opção 4: Fly.io

```bash
# Instalar flyctl
curl -L https://fly.io/install.sh | sh

# Login e deploy
fly auth login
fly launch
fly secrets set TELEGRAM_BOT_TOKEN=YOUR_TOKEN STRIPE_SECRET_KEY=YOUR_SECRET
fly deploy
```

## Habilitar PIX no Stripe

1. Acesse https://dashboard.stripe.com/settings/payment_methods
2. Ative "Pix" nos métodos de pagamento
3. O PIX aparecerá automaticamente no checkout para pagamentos em BRL

## Estrutura do Projeto

```
eloavip-bot/
├── index.js              # Servidor Express + Webhooks
├── bot.js                # Lógica do bot Telegram
├── config.js             # Configuração de produtos
├── database.js           # Banco de dados SQLite
├── stripe-handler.js     # Integração com Stripe
├── protect-channels.js   # Script de proteção dos canais
├── package.json          # Dependências
├── Dockerfile            # Para deploy com Docker
├── .env                  # Variáveis de ambiente (NÃO commitar)
└── README.md             # Este arquivo
```

## Fluxo de Funcionamento

1. Cliente envia /start no @EloaVIP_bot
2. Bot mostra menu com packs e preços
3. Cliente escolhe um pack e confirma
4. Bot gera link de pagamento Stripe
5. Cliente paga via PIX ou cartão
6. Stripe envia webhook confirmando pagamento
7. Bot gera link de convite único (1 uso, expira em 24h)
8. Bot envia link ao cliente automaticamente

## Suporte

Para problemas técnicos, verifique:
- Logs do servidor (`pm2 logs` ou painel do Railway/Render)
- Se o bot é admin em todos os canais
- Se o webhook está configurado corretamente no Stripe
- Se as variáveis de ambiente estão corretos
