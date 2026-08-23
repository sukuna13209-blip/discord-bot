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

// Çekiliş ve Partner Veritabanı
const cekilisler = {};
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
  { isim: 'One Piece', tur: 'Macera / Shounen', desc: 'Korsanlar Kralı olmak isteyen Luffy ve tayfasının devasa macerası.' },
  { isim: 'Bleach', tur: 'Aksiyon / Doğaüstü', desc: 'Ölüm Meleği güçleri kazanan Ichigo Kurosaki’nin savaşı.' },
  { isim: 'Bungou Stray Dogs', tur: 'Gizem / Doğaüstü', desc: 'Özel doğaüstü güçlere sahip dedektiflerin ve mafyanın çatışması.' }
];

// --- AÇILIR MENÜ (DROPDOWN) TASARIMI ---
function getYardimMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('yardim_menu')
      .setPlaceholder('Kategori seç... (Moderasyon, Eğlence, Bilgi)')
      .addOptions(
        { label: '🛡️ Moderasyon Komutları', description: 'Sunucu yönetim ve koruma komutları', value: 'mod' },
        { label: '🎉 Eğlence Komutları', description: 'Anime, oyun ve etkileşim komutları', value: 'eglence' },
        { label: '📚 Bilgi Komutları', description: 'Sunucu, kullanıcı ve bot bilgi komutları', value: 'bilgi' }
      )
  );
}

client.once('ready', async () => {
  console.log(`[✓] ${client.user.tag} aktif ve komutlar yüklendi!`);
  client.user.setActivity('Kastuhino // Anime & Manga', { type: 3 });

  // Tüm Slash Komutları Kaydı
  const commands = [
    new SlashCommandBuilder().setName('yardim').setDescription('Açılır menülü detaylı yardım menüsünü açar.'),
    new SlashCommandBuilder().setName('partner-durum').setDescription('Partnerlik istatistiklerinizi gösterir.'),
    new SlashCommandBuilder().setName('sil').setDescription('Mesaj siler').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).addIntegerOption(o => o.setName('miktar').setDescription('Sayı').setRequired(true)),
    new SlashCommandBuilder().setName('ban').setDescription('Kullanıcıyı banlar').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).addUserOption(o => o.setName('kullanici').setDescription('Üye').setRequired(true)),
    new SlashCommandBuilder().setName('kick').setDescription('Kullanıcıyı atar').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).addUserOption(o => o.setName('kullanici').setDescription('Üye').setRequired(true)),
    new SlashCommandBuilder().setName('sustur').setDescription('Susturur').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).addUserOption(o => o.setName('kullanici').setDescription('Üye').setRequired(true)),
    new SlashCommandBuilder().setName('saril').setDescription('Sarıl').addUserOption(o => o.setName('kullanici').setDescription('Üye').setRequired(true)),
    new SlashCommandBuilder().setName('tokat').setDescription('Tokat at').addUserOption(o => o.setName('kullanici').setDescription('Üye').setRequired(true)),
    new SlashCommandBuilder().setName('pat-pat').setDescription('Kafa okşa').addUserOption(o => o.setName('kullanici').setDescription('Üye').setRequired(true)),
    new SlashCommandBuilder().setName('yumruk').setDescription('Yumruk at').addUserOption(o => o.setName('kullanici').setDescription('Üye').setRequired(true)),
    new SlashCommandBuilder().setName('bak').setDescription('Bakış at').addUserOption(o => o.setName('kullanici').setDescription('Üye').setRequired(true)),
    new SlashCommandBuilder().setName('ship').setDescription('Uyum ölç').addUserOption(o => o.setName('birinci').setDescription('1. Üye').setRequired(true)).addUserOption(o => o.setName('ikinci').setDescription('2. Üye').setRequired(false)),
    new SlashCommandBuilder().setName('waifu-puanla').setDescription('Waifu puanla').addUserOption(o => o.setName('kullanici').setDescription('Üye').setRequired(false)),
    new SlashCommandBuilder().setName('anime-oner').setDescription('Rastgele anime önerir.'),
    new SlashCommandBuilder().setName('1000-7').setDescription('Tokyo Ghoul göndermesi.'),
    new SlashCommandBuilder().setName('avatar').setDescription('Avatar gösterir').addUserOption(o => o.setName('kullanici').setDescription('Üye').setRequired(false))
  ];
  await client.application.commands.set(commands).catch(console.error);
});

// --- ETKİLEŞİMLER (SLASH VE MENÜLER) ---
client.on('interactionCreate', async (interaction) => {
  if (interaction.isStringSelectMenu() && interaction.customId === 'yardim_menu') {
    const secim = interaction.values[0];
    let embed = new EmbedBuilder().setColor('#6b21ff');

    if (secim === 'mod') {
      embed.setTitle('🛡️ Moderasyon Komutları')
           .setDescription('İster `k!` isterseniz `/` ön ekiyle kullanabilirsiniz:\n\n`k!ban` • Kullanıcıyı yasaklar\n`k!unban` • Yasağı kaldırır\n`k!kick` • Kullanıcıyı atar\n`k!sustur` • Zaman aşımı uygular\n`k!sil` • Toplu mesaj siler\n`k!kanal-kilitle` • Kanalı kapatır\n`k!kanal-ac` • Kanalı açar\n`k!uyar` • Kullanıcıya uyarı verir\n`k!temizle` • Mesaj temizler\n`k!yavas-mod` • Yavaş mod ayarlar');
    } else if (secim === 'eglence') {
      embed.setTitle('🎉 Eğlence Komutları')
           .setDescription('İster `k!` isterseniz `/` ön ekiyle kullanabilirsiniz:\n\n`k!saril` • Sarılma GIFi\n`k!tokat` • Tokat atma GIFi\n`k!pat-pat` • Kafayı okşama\n`k!yumruk` • Yumruk atma\n`k!bak` • Şüpheci bakış\n`k!ship` • Aşk uyumu ölçer\n`k!waifu-puanla` • Waifu skoru hesaplar\n`k!anime-oner` • Kaliteli anime önerir\n`k!1000-7` • Tokyo Ghoul repliği\n`k!oyun` • Mini oyunlar\n`k!zar` • Zar atma');
    } else if (secim === 'bilgi') {
      embed.setTitle('📚 Bilgi Komutları')
           .setDescription('İster `k!` isterseniz `/` ön ekiyle kullanabilirsiniz:\n\n`k!yardim` • Bu yardım menüsü\n`k!partner-durum` • Partner istatistikleri\n`k!avatar` • Profil resmini gösterir\n`k!sunucu` • Sunucu bilgileri\n`k!sahip` • Bot yapımcısı bilgisi\n`k!bot-bilgisi` • Bot istatistikleri\n`k!ping` • Gecikme süresi\n`k!kanal` • Kanal detayları');
    }

    return interaction.update({ embeds: [embed], components: [getYardimMenu()] });
  }

  if (!interaction.isChatInputCommand()) return;
  const { commandName } = interaction;

  if (commandName === 'yardim') {
    const embed = new EmbedBuilder()
      .setColor('#6b21ff')
      .setTitle('✨ Kastuhino Komut Merkezi')
      .setDescription('Aşağıdaki açılır menüden kategorileri seçerek tüm komutlara ulaşabilirsiniz.');
    return interaction.reply({ embeds: [embed], components: [getYardimMenu()] });
  }

  if (commandName === 'partner-durum') {
    if (!partners[interaction.user.id]) partners[interaction.user.id] = { bugun: 0, hafta: 0, ay: 0, toplam: 0 };
    return interaction.reply({ embeds: [createPartnerEmbed(interaction.guild, interaction.user, partners[interaction.user.id])] });
  }

  if (commandName === 'saril') {
    const hedef = interaction.options.getUser('kullanici');
    return interaction.reply({ embeds: [new EmbedBuilder().setColor('#ff79c6').setDescription(`🤗 <@${interaction.user.id}>, <@${hedef.id}> kişisine sarıldı!`).setImage(GIFS.saril)] });
  }
  
  if (commandName === 'tokat') {
    const hedef = interaction.options.getUser('kullanici');
    return interaction.reply({ embeds: [new EmbedBuilder().setColor('#ff5555').setDescription(`🖐️ <@${interaction.user.id}>, <@${hedef.id}> kişisini tokatladı!`).setImage(GIFS.tokat)] });
  }

  if (commandName === 'sil') {
    const miktar = interaction.options.getInteger('miktar');
    await interaction.channel.bulkDelete(miktar, true).catch(() => {});
    return interaction.reply({ content: `✅ ${miktar} mesaj silindi!`, ephemeral: true });
  }
});

// --- METİN (Yazılı k!) KOMUTLARI ---
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  // Partner Takip
  if (message.channel.id === PARTNER_KANAL_ID) {
    if (message.content.includes('discord.gg/') || message.content.includes('discord.com/invite/')) {
      if (!partners[message.author.id]) partners[message.author.id] = { bugun: 0, hafta: 0, ay: 0, toplam: 0 };
      partners[message.author.id].bugun += 1; partners[message.author.id].hafta += 1; partners[message.author.id].ay += 1; partners[message.author.id].toplam += 1;
      savePartners();
      return message.reply({ content: '✅ Partnerlik sayıldı!', embeds: [createPartnerEmbed(message.guild, message.author, partners[message.author.id])] });
    }
  }

  if (!message.content.toLowerCase().startsWith(PREFIX)) return;
  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // YARDIM
  if (command === 'yardim' || command === 'yardım') {
    const embed = new EmbedBuilder()
      .setColor('#6b21ff')
      .setTitle('✨ Kastuhino Komut Merkezi')
      .setDescription('Aşağıdaki açılır menüden kategori seçerek tüm komutları inceleyebilirsin.');
    return message.reply({ embeds: [embed], components: [getYardimMenu()] });
  }

  // PARTNER DURUM
  if (command === 'partner-durum') {
    if (!partners[message.author.id]) partners[message.author.id] = { bugun: 0, hafta: 0, ay: 0, toplam: 0 };
    return message.reply({ embeds: [createPartnerEmbed(message.guild, message.author, partners[message.author.id])] });
  }

  // EĞLENCE KOMUTLARI
  if (command === 'saril' || command === 'sarıl') {
    const hedef = message.mentions.users.first();
    if (!hedef) return message.reply('Kime sarılacaksın? (`k!saril @üye`)');
    return message.channel.send({ embeds: [new EmbedBuilder().setColor('#ff79c6').setDescription(`🤗 <@${message.author.id}>, <@${hedef.id}> kişisine sarıldı!`).setImage(GIFS.saril)] });
  }

  if (command === 'tokat') {
    const hedef = message.mentions.users.first();
    if (!hedef) return message.reply('Kimi tokatlayacaksın? (`k!tokat @üye`)');
    return message.channel.send({ embeds: [new EmbedBuilder().setColor('#ff5555').setDescription(`🖐️ <@${message.author.id}>, <@${hedef.id}> kişisini tokatladı!`).setImage(GIFS.tokat)] });
  }

  if (command === 'anime-oner') {
    const secilen = ANIME_LISTESI[Math.floor(Math.random() * ANIME_LISTESI.length)];
    return message.channel.send({ embeds: [new EmbedBuilder().setColor('#ff79c6').setTitle(`📺 ${secilen.isim}`).addFields({ name: 'Tür', value: secilen.tur }, { name: 'Özet', value: secilen.desc })] });
  }

  // MODERASYON KOMUTLARI
  if (command === 'sil') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('❌ Yetkin yok!');
    const miktar = parseInt(args[0]);
    if (!miktar || isNaN(miktar)) return message.reply('Lütfen geçerli bir sayı gir! (`k!sil 10`)');
    await message.channel.bulkDelete(miktar + 1, true).catch(() => {});
    return message.channel.send(`✅ ${miktar} mesaj temizlendi!`).then(m => setTimeout(() => m.delete().catch(()=>{}), 3000));
  }
});

client.login(process.env.DISCORD_TOKEN);
