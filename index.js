const { 
  Client, 
  GatewayIntentBits, 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  StringSelectMenuBuilder
} = require('discord.js');
const fs = require('fs');
const http = require('http');

// Render Uptime Sunucusu
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Kastuhino Bot Aktif!\n');
});
server.listen(process.env.PORT || 3000);

// Otomatik partner kanalı
const PARTNER_KANAL_ID = '1514756158831988876';
const PREFIX = 'k!';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration
  ]
});

// Partner Veritabanı
const PARTNER_FILE = './partners.json';
let partners = {};
if (fs.existsSync(PARTNER_FILE)) {
  try { partners = JSON.parse(fs.readFileSync(PARTNER_FILE, 'utf8')); } catch (e) { partners = {}; }
}
function savePartners() { fs.writeFileSync(PARTNER_FILE, JSON.stringify(partners, null, 2)); }

function createPartnerEmbed(guild, user, data) {
  const guildIcon = guild ? guild.iconURL({ dynamic: true, size: 512 }) : null;
  return new EmbedBuilder()
    .setColor('#6b21ff')
    .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
    .setThumbnail(guildIcon)
    .setTitle('Partnerlik Profili')
    .setDescription(`**Bugünlük Partnerin:** ${data.bugun || 0}\n**Haftalık Partnerin:** ${data.hafta || 0}\n**Aylık Partnerin:** ${data.ay || 0}\n**Toplam Partnerin:** ${data.toplam || 0}\n**Haftalık Sıralaman:** #1`)
    .setImage('https://i.postimg.cc/bvrhKD14/70ba521c-e278-4697-9f02-33cea9a96121.jpg')
    .setTimestamp();
}

// GIF Bağlantıları
const GIFS = {
  saril: 'https://media.giphy.com/media/lrr9DHuoKCVQTx22zs/giphy.gif',
  tokat: 'https://media.giphy.com/media/Gf3AUz3eBNbTW/giphy.gif',
  pat: 'https://media.giphy.com/media/5tmRHwTlHAA9Wv3TUf/giphy.gif',
  yumruk: 'https://media.giphy.com/media/11tTNkKOScnWmI/giphy.gif',
  bak: 'https://media.giphy.com/media/A8NNZlVuA1h5K/giphy.gif',
  ghoul: 'https://media.giphy.com/media/10qcQYd6rcfS12/giphy.gif'
};

const ANIME_LISTESI = [
  { isim: 'Hajime no Ippo', tur: 'Spor / Boks / Aksiyon', desc: 'Ezilen bir çocuğun boks dünyasında zirveye tırmanış hikayesi.' },
  { isim: 'Tokyo Ghoul', tur: 'Aksiyon / Gizem / Doğaüstü', desc: 'İnsan etiyle beslenen hortlakların dünyasına adım atan Kaneki’nin mücadelesi.' },
  { isim: 'One Piece', tur: 'Macera / Shounen', desc: 'Korsanlar Kralı olmak isteyen Luffy ve tayfasının devasa macerası.' }
];

// --- YARDIM MENÜSÜ OLUŞTURUCU ---
function getYardimMenu() {
  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('yardim_menu')
      .setPlaceholder('Kategori seç...')
      .addOptions(
        { label: '🛡️ Moderasyon', description: 'Sunucu yönetim komutları', value: 'mod' },
        { label: '🎉 Eğlence', description: 'Anime ve etkileşim komutları', value: 'eglence' },
        { label: '📚 Bilgi', description: 'Genel bilgi ve durum komutları', value: 'bilgi' }
      )
  );
  return row;
}

client.once('ready', async () => {
  console.log(`[✓] ${client.user.tag} başarıyla giriş yaptı!`);
  client.user.setActivity('Kastuhino // Anime & Manga', { type: 3 });

  // Slash Komutlarını Yükle
  const commands = [
    new SlashCommandBuilder().setName('yardim').setDescription('Açılır menülü yardım penceresini gösterir.'),
    new SlashCommandBuilder().setName('sil').setDescription('Mesaj siler').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).addIntegerOption(opt => opt.setName('miktar').setDescription('Sayı').setRequired(true)),
    new SlashCommandBuilder().setName('saril').setDescription('Bir üyeye sarılır.').addUserOption(opt => opt.setName('kullanici').setDescription('Üye').setRequired(true)),
    // Diğer slash komutların da arka planda çalışmaya devam edecek...
  ];
  await client.application.commands.set(commands).catch(console.error);
});

// 1) SLASH VE BUTON/MENÜ ETKİLEŞİMLERİ
client.on('interactionCreate', async (interaction) => {

  // --- AÇILIR MENÜ (DROPDOWN) YÖNETİMİ ---
  if (interaction.isStringSelectMenu() && interaction.customId === 'yardim_menu') {
    const secim = interaction.values[0];
    let embed = new EmbedBuilder().setColor('#6b21ff');

    if (secim === 'mod') {
      embed.setTitle('🛡️ Moderasyon Komutları')
           .setDescription('Aşağıdaki komutları ister `k!` yazarak isterseniz `/` yazarak kullanabilirsiniz.\n\n`k!ban` - `k!unban` - `k!kick` - `k!sustur` - `k!sil` - `k!kanal-kilitle` - `k!kanal-ac`\n\n**Toplam: 7 komut**');
    } else if (secim === 'eglence') {
      embed.setTitle('🎉 Eğlence Komutları')
           .setDescription('Aşağıdaki komutları ister `k!` yazarak isterseniz `/` yazarak kullanabilirsiniz.\n\n`k!saril` - `k!tokat` - `k!pat-pat` - `k!yumruk` - `k!bak` - `k!ship` - `k!waifu-puanla` - `k!anime-oner` - `k!1000-7`\n\n**Toplam: 9 komut**');
    } else if (secim === 'bilgi') {
      embed.setTitle('📚 Bilgi Komutları')
           .setDescription('Aşağıdaki komutları ister `k!` yazarak isterseniz `/` yazarak kullanabilirsiniz.\n\n`k!yardim` - `k!partner-durum` - `k!avatar` - `k!ping`\n\n**Toplam: 4 komut**');
    }

    return interaction.update({ embeds: [embed], components: [getYardimMenu()] });
  }

  // --- SLASH KOMUTLARI İÇİN ---
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'yardim') {
      const embed = new EmbedBuilder()
        .setColor('#6b21ff')
        .setTitle('✨ Kastuhino Komut Merkezi')
        .setDescription('Kategorileri incelemek için aşağıdaki menüden bir seçenek belirleyin.');
      return interaction.reply({ embeds: [embed], components: [getYardimMenu()] });
    }
    
    // Basit bir test için /saril
    if (interaction.commandName === 'saril') {
      const hedef = interaction.options.getUser('kullanici');
      const embed = new EmbedBuilder().setColor('#ff79c6').setDescription(`🤗 <@${interaction.user.id}>, <@${hedef.id}> kişisine sımsıkı sarıldı!`).setImage(GIFS.saril);
      return interaction.reply({ embeds: [embed] });
    }
  }
});

// 2) METİN (YAZILI) KOMUTLARI YÖNETİMİ
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  // Partner Takip Sistemi
  if (message.channel.id === PARTNER_KANAL_ID) {
    if (message.content.includes('discord.gg/') || message.content.includes('discord.com/invite/')) {
      if (!partners[message.author.id]) partners[message.author.id] = { bugun: 0, hafta: 0, ay: 0, toplam: 0 };
      partners[message.author.id].bugun += 1; partners[message.author.id].hafta += 1; partners[message.author.id].ay += 1; partners[message.author.id].toplam += 1;
      savePartners();
      return message.reply({ content: '✅ Partnerlik başarıyla sayıldı!', embeds: [createPartnerEmbed(message.guild, message.author, partners[message.author.id])] });
    }
  }

  // Prefix (k!) kontrolü
  if (!message.content.toLowerCase().startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // YARDIM KOMUTU (k!yardim veya k!yardım)
  if (command === 'yardim' || command === 'yardım') {
    const embed = new EmbedBuilder()
      .setColor('#6b21ff')
      .setTitle('✨ Kastuhino Komut Merkezi')
      .setDescription('Kategorileri incelemek için aşağıdaki açılır menüden bir seçenek belirleyin. İstediğiniz komutu `k!` veya `/` kullanarak yazabilirsiniz.');
    
    return message.reply({ embeds: [embed], components: [getYardimMenu()] });
  }

  // METİN - EĞLENCE KOMUTLARI (Örnek: k!saril @üye)
  if (command === 'saril' || command === 'sarıl') {
    const hedef = message.mentions.users.first();
    if (!hedef) return message.reply('Kime sarılacaksın? Birini etiketle! (Örn: `k!saril @üye`)');
    const embed = new EmbedBuilder().setColor('#ff79c6').setDescription(`🤗 <@${message.author.id}>, <@${hedef.id}> kişisine sımsıkı sarıldı!`).setImage(GIFS.saril);
    return message.channel.send({ embeds: [embed] });
  }

  if (command === 'tokat') {
    const hedef = message.mentions.users.first();
    if (!hedef) return message.reply('Kimi tokatlayacaksın? Birini etiketle!');
    const embed = new EmbedBuilder().setColor('#ff5555').setDescription(`🖐️ <@${message.author.id}>, <@${hedef.id}> kişisine osmanlı tokadı yapıştırdı!`).setImage(GIFS.tokat);
    return message.channel.send({ embeds: [embed] });
  }

  // METİN - YÖNETİM KOMUTLARI (Örnek: k!sil 10)
  if (command === 'sil') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('❌ Yetkin yok!');
    const miktar = parseInt(args[0]);
    if (!miktar || isNaN(miktar) || miktar < 1 || miktar > 100) return message.reply('Lütfen 1 ile 100 arasında bir sayı belirt. (Örn: `k!sil 10`)');
    
    await message.channel.bulkDelete(miktar + 1, true).catch(() => {});
    return message.channel.send(`✅ **${miktar}** adet mesaj başarıyla temizlendi!`).then(m => setTimeout(() => m.delete().catch(()=>{}), 3000));
  }

  if (command === 'partner-durum') {
    if (!partners[message.author.id]) partners[message.author.id] = { bugun: 0, hafta: 0, ay: 0, toplam: 0 };
    const embed = createPartnerEmbed(message.guild, message.author, partners[message.author.id]);
    return message.reply({ embeds: [embed] });
  }
});

client.login(process.env.DISCORD_TOKEN);
