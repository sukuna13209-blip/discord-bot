const { 
  Client, 
  GatewayIntentBits, 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
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
const HOSGELDIN_KANAL_ID = 'BURAYA_HOS_GELDIN_KANAL_ID_YAZ'; // <-- Buraya hoş geldin kanalının ID'sini yaz
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
  bak: 'https://media.giphy.com/media/A8NNZlVuA1h5K/giphy.gif'
};

const ANIME_LISTESI = [
  { isim: 'Hajime no Ippo', tur: 'Spor / Boks / Aksiyon', desc: 'Ezilen bir çocuğun boks dünyasında zirveye tırmanış hikayesi.' },
  { isim: 'Tokyo Ghoul', tur: 'Aksiyon / Gizem / Doğaüstü', desc: 'İnsan etiyle beslenen hortlakların dünyasına adım atan Kaneki’nin mücadelesi.' },
  { isim: 'One Piece', tur: 'Macera / Shounen', desc: 'Korsanlar Kralı olmak isteyen Luffy ve tayfasının devasa macerası.' }
];

const ANIME_SOZLERI = [
  "\"İnsanlar ancak kaybettikleri şeylerin değerini anlarlar.\" — Kaneki Ken (Tokyo Ghoul)",
  "\"Korku zayıflıktır. Kendine karşı dürüst ol.\" — Vegeta (Dragon Ball)",
  "\"Eğer gerçekten güçlü olmak istiyorsan, gülmeyi bırak ve savaşmaya başla!\" — L (Death Note)"
];

const ANIME_KARAKTERLERI = [
  "Kaneki Ken (Tokyo Ghoul) - Efsanevi Hortlak 👑",
  "Monkey D. Luffy (One Piece) - Korsan Kral Adayı 🍖",
  "Levi Ackerman (Attack on Titan) - İnsanlığın En Güçlü Askeri ⚔️",
  "Gojo Satoru (Jujutsu Kaisen) - Sınırsız Güç ✨"
];

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

// Bot açıldığında Discord'a kaydedilecek TÜM Slash komutları
client.once('ready', async () => {
  console.log(`[✓] ${client.user.tag} aktif ve komutlar yüklendi!`);
  client.user.setActivity('Kastuhino // Anime & Manga', { type: 3 });

  const commands = [
    new SlashCommandBuilder().setName('yardim').setDescription('Açılır menülü detaylı yardım menüsünü açar.'),
    new SlashCommandBuilder().setName('partner-durum').setDescription('Partnerlik istatistiklerinizi gösterir.'),
    new SlashCommandBuilder().setName('anime-oner').setDescription('Rastgele kaliteli bir anime önerir.'),
    new SlashCommandBuilder().setName('anime-soz').setDescription('Günün rastgele anime sözünü atar.'),
    new SlashCommandBuilder().setName('gacha').setDescription('Günlük rastgele anime karakteri düşürür.'),
    new SlashCommandBuilder().setName('waifu-puanla').setDescription('Waifu / Husbando skorunuzu hesaplar.'),
    new SlashCommandBuilder()
      .setName('sil')
      .setDescription('Belirtilen miktarda mesaj siler.')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addIntegerOption(o => o.setName('miktar').setDescription('Silinecek mesaj sayısı').setRequired(true)),
    new SlashCommandBuilder()
      .setName('saril')
      .setDescription('Etiketlenen kişiye sarılma GIFi atar.')
      .addUserOption(o => o.setName('kullanici').setDescription('Sarılmak istediğin üye').setRequired(true)),
    new SlashCommandBuilder()
      .setName('tokat')
      .setDescription('Etiketlenen kişiye tokat atma GIFi atar.')
      .addUserOption(o => o.setName('kullanici').setDescription('Tokat atmak istediğin üye').setRequired(true))
  ];
  await client.application.commands.set(commands).catch(console.error);
});

// --- YENİ ÜYE KATILIM (WELCOME) SİSTEMİ ---
client.on('guildMemberAdd', async (member) => {
  const kanal = member.guild.channels.cache.get(HOSGELDIN_KANAL_ID);
  if (!kanal) return;

  const embed = new EmbedBuilder()
    .setColor('#6b21ff')
    .setTitle('✨ Kastuhino // Anime & Manga\'ya Hoş Geldin Gülüm!')
    .setDescription(`Hey <@${member.id}>, aramıza katıldın! 🎉\n\nSeninle beraber **${member.guild.memberCount}** kişi olduk.\nKuralları okumayı ve <#1514756158831988876> kanalına göz atmayı unutma!`)
    .setImage('https://i.ibb.co/6y4G82d/image-b5e8a6.jpg')
    .setTimestamp()
    .setFooter({ text: 'Kastuhino Ailesi' });

  kanal.send({ content: `Gözümüz yollarda kalmıştı, hoş geldin <@${member.id}>! 🌸`, embeds: [embed] });
});

// --- SLASH (/) KOMUTLARI VE MENÜLER ---
client.on('interactionCreate', async (interaction) => {
  if (interaction.isStringSelectMenu() && interaction.customId === 'yardim_menu') {
    const secim = interaction.values[0];
    let embed = new EmbedBuilder().setColor('#6b21ff');

    if (secim === 'mod') {
      embed.setTitle('🛡️ Moderasyon Komutları')
           .setDescription('İster `k!` isterseniz `/` ön ekiyle kullanabilirsiniz:\n\n`/sil` • Toplu mesaj siler');
    } else if (secim === 'eglence') {
      embed.setTitle('🎉 Eğlence Komutları')
           .setDescription('İster `k!` isterseniz `/` ön ekiyle kullanabilirsiniz:\n\n`/saril` • Sarılma GIFi\n`/tokat` • Tokat atma GIFi\n`/anime-oner` • Kaliteli anime önerir\n`/anime-soz` • Rastgele anime sözü\n`/gacha` • Karakter düşür\n`/waifu-puanla` • Waifu puanı hesapla');
    } else if (secim === 'bilgi') {
      embed.setTitle('📚 Bilgi Komutları')
           .setDescription('İster `k!` isterseniz `/` ön ekiyle kullanabilirsiniz:\n\n`/yardim` • Bu yardım menüsü\n`/partner-durum` • Partner istatistikleri');
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

  if (commandName === 'anime-oner') {
    const secilen = ANIME_LISTESI[Math.floor(Math.random() * ANIME_LISTESI.length)];
    return interaction.reply({ embeds: [new EmbedBuilder().setColor('#ff79c6').setTitle(`📺 ${secilen.isim}`).addFields({ name: 'Tür', value: secilen.tur }, { name: 'Özet', value: secilen.desc })] });
  }

  if (commandName === 'anime-soz') {
    const rastgeleSoz = ANIME_SOZLERI[Math.floor(Math.random() * ANIME_SOZLERI.length)];
    return interaction.reply({ embeds: [new EmbedBuilder().setColor('#ff79c6').setTitle('💬 Günün Anime Sözü').setDescription(rastgeleSoz)] });
  }

  if (commandName === 'gacha') {
    const cikanKarakter = ANIME_KARAKTERLERI[Math.floor(Math.random() * ANIME_KARAKTERLERI.length)];
    return interaction.reply({ embeds: [new EmbedBuilder().setColor('#ffd700').setTitle('📦 Gacha Çekilişi').setDescription(`Tebrikler <@${interaction.user.id}>! Kutudan çıkan karakter:\n\n**${cikanKarakter}**`).setTimestamp()] });
  }

  if (commandName === 'waifu-puanla') {
    const rastgelePuan = Math.floor(Math.random() * 51) + 50;
    return interaction.reply({ embeds: [new EmbedBuilder().setColor('#ff79c6').setTitle('💖 Waifu / Husbando Puanlama').setDescription(`<@${interaction.user.id}> için yapılan analiz sonucunda puanın: **%${rastgelePuan}** ✨`)] });
  }

  if (commandName === 'sil') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Bu komutu kullanmak için yetkin yok!', ephemeral: true });
    }
    const miktar = interaction.options.getInteger('miktar');
    await interaction.channel.bulkDelete(miktar, true).catch(() => {});
    return interaction.reply({ content: `✅ ${miktar} mesaj başarıyla silindi!`, ephemeral: true });
  }
});

// --- METİN (k! ÖNEKİ) KOMUTLARI ---
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

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

  if (command === 'yardim' || command === 'yardım') {
    const embed = new EmbedBuilder()
      .setColor('#6b21ff')
      .setTitle('✨ Kastuhino Komut Merkezi')
      .setDescription('Aşağıdaki açılır menüden kategori seçerek tüm komutları inceleyebilirsin.');
    return message.reply({ embeds: [embed], components: [getYardimMenu()] });
  }

  if (command === 'partner-durum') {
    if (!partners[message.author.id]) partners[message.author.id] = { bugun: 0, hafta: 0, ay: 0, toplam: 0 };
    return message.reply({ embeds: [createPartnerEmbed(message.guild, message.author, partners[message.author.id])] });
  }

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

  if (command === 'anime-soz') {
    const rastgeleSoz = ANIME_SOZLERI[Math.floor(Math.random() * ANIME_SOZLERI.length)];
    return message.channel.send({ embeds: [new EmbedBuilder().setColor('#ff79c6').setTitle('💬 Günün Anime Sözü').setDescription(rastgeleSoz)] });
  }

  if (command === 'gacha') {
    const cikanKarakter = ANIME_KARAKTERLERI[Math.floor(Math.random() * ANIME_KARAKTERLERI.length)];
    return message.channel.send({ embeds: [new EmbedBuilder().setColor('#ffd700').setTitle('📦 Gacha Çekilişi').setDescription(`Tebrikler <@${message.author.id}>! Kutudan çıkan karakter:\n\n**${cikanKarakter}**`).setTimestamp()] });
  }

  if (command === 'waifu-puanla') {
    const rastgelePuan = Math.floor(Math.random() * 51) + 50;
    return message.channel.send({ embeds: [new EmbedBuilder().setColor('#ff79c6').setTitle('💖 Waifu / Husbando Puanlama').setDescription(`<@${message.author.id}> için yapılan analiz sonucunda puanın: **%${rastgelePuan}** ✨`)] });
  }

  if (command === 'sil') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('❌ Yetkin yok!');
    const miktar = parseInt(args[0]);
    if (!miktar || isNaN(miktar)) return message.reply('Lütfen geçerli bir sayı gir! (`k!sil 10`)');
    await message.channel.bulkDelete(miktar + 1, true).catch(() => {});
    return message.channel.send(`✅ ${miktar} mesaj temizlendi!`).then(m => setTimeout(() => m.delete().catch(()=>{}), 3000));
  }
});

client.login(process.env.DISCORD_TOKEN);
