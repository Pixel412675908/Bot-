/**
 * Script para configurar proteção de conteúdo nos canais
 * Ativa has_protected_content via API do Telegram (impede encaminhamento, prints, etc.)
 * 
 * IMPORTANTE: O bot precisa ser administrador em todos os canais antes de rodar este script
 * 
 * Uso: node protect-channels.js
 */

require('dotenv').config();
const https = require('https');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BASE_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

const channels = [
  { id: -1003814122379, name: 'Pack Entrada' },
  { id: -1003551571186, name: 'Pack Padrão' },
  { id: -1003818610382, name: 'Pack Premium' },
  { id: -1003876526670, name: 'Pack Noir' },
  { id: -1003940074002, name: 'Full VIP' },
  { id: -1003885131733, name: 'Clube Secreto' },
];

// Função para fazer requisições à API do Telegram
function telegramRequest(method, params) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(params);
    const url = new URL(`${BASE_URL}/${method}`);

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve(result);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function protectChannels() {
  console.log('🔒 Configurando proteção de conteúdo nos canais...\n');

  for (const channel of channels) {
    console.log(`📌 Processando: ${channel.name} (${channel.id})`);

    // 1. Ativar proteção de conteúdo (impede encaminhamento, salvamento, prints)
    try {
      const protectResult = await telegramRequest('setChatHasProtectedContent', {
        chat_id: channel.id,
        has_protected_content: true,
      });

      if (protectResult.ok) {
        console.log(`   ✅ Proteção de conteúdo ATIVADA (sem encaminhamento/salvamento)`);
      } else {
        console.log(`   ❌ Erro ao ativar proteção: ${protectResult.description}`);
      }
    } catch (error) {
      console.log(`   ❌ Erro: ${error.message}`);
    }

    // 2. Configurar permissões restritivas (membros não podem postar/encaminhar)
    try {
      const permResult = await telegramRequest('setChatPermissions', {
        chat_id: channel.id,
        permissions: {
          can_send_messages: false,
          can_send_audios: false,
          can_send_documents: false,
          can_send_photos: false,
          can_send_videos: false,
          can_send_video_notes: false,
          can_send_voice_notes: false,
          can_send_polls: false,
          can_send_other_messages: false,
          can_add_web_page_previews: false,
          can_change_info: false,
          can_invite_users: false,
          can_pin_messages: false,
          can_manage_topics: false,
        },
      });

      if (permResult.ok) {
        console.log(`   ✅ Permissões restritivas configuradas (membros não podem postar)`);
      } else {
        console.log(`   ❌ Erro nas permissões: ${permResult.description}`);
      }
    } catch (error) {
      console.log(`   ❌ Erro: ${error.message}`);
    }

    // 3. Verificar info do canal
    try {
      const chatInfo = await telegramRequest('getChat', { chat_id: channel.id });
      if (chatInfo.ok) {
        console.log(`   ℹ️  Canal: ${chatInfo.result.title}`);
        console.log(`   ℹ️  Conteúdo protegido: ${chatInfo.result.has_protected_content ? 'SIM ✅' : 'NÃO ❌'}`);
      }
    } catch (error) {
      console.log(`   ❌ Erro ao verificar: ${error.message}`);
    }

    console.log('');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔒 Configuração finalizada!');
  console.log('');
  console.log('O que a proteção faz:');
  console.log('• Impede encaminhamento de mensagens do canal');
  console.log('• Impede salvamento de mídias (fotos/vídeos)');
  console.log('• Impede captura de tela (em dispositivos compatíveis)');
  console.log('• Membros não podem postar nada no canal');
  console.log('• Membros não podem convidar outros');
  console.log('');
  console.log('⚠️  Certifique-se de que o bot é admin em todos os canais!');

  process.exit(0);
}

protectChannels();
