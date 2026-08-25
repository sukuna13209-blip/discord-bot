const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const http = require('http');

// Render 7/24 Aktif Tutma Sunucusu
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Kastuhino Bot Aktif!\n');
});
server.listen(process.env.PORT || 3000);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ]
});

const DB_FILE = './partners.json';

function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({}));
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    return {};
  }
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Tarih Kontrolü ve Gün/Hafta/Ay Sıfırlama
function checkResets(userStats) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentWeek = getWeekNumber(now);
  const currentMonth = now.getMonth();

  if (userStats.lastDay !== todayStr) {
    userStats.gunlukPartner = 0;
    userStats.lastDay = todayStr;
  }
  if (userStats.lastWeek !== currentWeek) {
    userStats.haftalikPartner = 0;
    userStats.lastWeek = currentWeek;
  }
  if (userStats.lastMonth !== currentMonth) {
    userStats.aylikPartner = 0;
    userStats.lastMonth = currentMonth;
  }
}

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
  return `${d.getUTCFullYear()}-W${weekNo}`;
}

client.on('ready', () => {
  console.log(`Bot başarıyla giriş yaptı: ${client.user.tag}`);
});

// Partnerlik Yetkili Rolü ID'si (Buraya kendi yetkili rol ID'ni yazabilirsin)
const PARTNER_ROLE_ID = 'BURAYA_YETKILI_ROL_ID_YAZIN'; 

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // 1. KANAL: PARTNER EKLEME (.p @kullanıcı veya .partner @kullanıcı)
  if (message.content.toLowerCase().startsWith('.p ') || message.content.toLowerCase().startsWith('.partner ')) {
    // Yetki kontrolü (İstiyorsan açabilirsin, şimdilik yetkili veya mesaj atan herkes yapabilir)
    const targetUser = message.mentions.users.first();
    if (!targetUser) {
      return message.reply('❌ Lütfen partnerlik yaptığınız kullanıcıyı etiketleyin! Örn: `.p @kullanici`');
    }

    if (targetUser.id === message.author.id) {
      return message.reply('❌ Kendinizle partnerlik yapamazsınız!');
    }

    const db = loadDB();
    const authorId = message.author.id;
    const targetId = targetUser.id;

    if (!db[authorId]) db[authorId] = { gunlukPartner: 0, haftalikPartner: 0, aylikPartner: 0, toplamPartner: 0 };
    if (!db[targetId]) db[targetId] = { gunlukPartner: 0, haftalikPartner: 0, aylikPartner: 0, toplamPartner: 0 };

    checkResets(db[authorId]);
    checkResets(db[targetId]);

    // Her iki kullanıcıya da +1 ekle
    db[authorId].gunlukPartner += 1;
    db[authorId].haftalikPartner += 1;
    db[authorId].aylikPartner += 1;
    db[authorId].toplamPartner += 1;

    db[targetId].gunlukPartner += 1;
    db[targetId].haftalikPartner += 1;
    db[targetId].aylikPartner += 1;
    db[targetId].toplamPartner += 1;

    saveDB(db);

    message.react('✅').catch(() => {});
    return message.channel.send(`✅ Başarılı! **${message.author.username}** ve **${targetUser.username جات}** arasında partnerlik kaydedildi!`);
  }

  // 2. KANAL: PROFİL GÖRÜNTÜLEME (.profil veya .partnerprofil)
  if (message.content.toLowerCase() === '.profil' || message.content.toLowerCase() === '.partnerprofil') {
    const targetUser = message.mentions.users.first() || message.author;
    const db = loadDB();
    const userId = targetUser.id;

    if (!db[userId]) {
      db[userId] = { gunlukPartner: 0, haftalikPartner: 0, aylikPartner: 0, toplamPartner: 0 };
    }

    checkResets(db[userId]);
    saveDB(db);

    // DÜZELTME: Doğru Sıralama Hesaplaması (Haftalık partner sayısına göre büyükten küçüğe)
    const allUsers = Object.entries(db).map(([id, data]) => {
      checkResets(data);
      return { id, haftalikPartner: data.haftalikPartner || 0 };
    });

    allUsers.sort((a, b) => b.haftalikPartner - a.haftalikPartner);

    let rank = allUsers.findIndex(u => u.id === userId) + 1;
    if (rank === 0) rank = allUsers.length + 1;

    const stats = db[userId];

    const embed = new EmbedBuilder()
      .setColor('#2b2d31')
      .setAuthor({ name: targetUser.username, iconURL: targetUser.displayAvatarURL({ dynamic: true }) })
      .setTitle('Partnerlik Profili')
      .addFields(
        { name: 'Günlük Partnerin:', value: `${stats.gunlukPartner}`, inline: false },
        { name: 'Haftalık Partnerin:', value: `${stats.haftalikPartner}`, inline: false },
        { name: 'Aylık Partnerin:', value: `${stats.aylikPartner}`, inline: false },
        { name: 'Toplam Partnerin:', value: `${stats.toplamPartner}`, inline: false },
        { name: 'Haftalık Sıralaman:', value: `#${rank}`, inline: false }
      )
      .setImage('BURAYA_BANNER_VEYA_GIPHY_LINKI_KOYABILIRSIN'); // İsteğe bağlı görsel

    return message.channel.send({ embeds: [embed] });
  }
});

client.login(process.env.DISCORD_TOKEN);
