const { 
  Client, 
  GatewayIntentBits, 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
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

// Bot İstemcisi
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration
  ]
});

// Çekiliş Katılımcı Hafızası
const cekilisler = {};

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
    .setDescription(
      `**Bugünlük Partnerin:** ${data.bugun || 0}\n` +
      `**Haftalık Partnerin:** ${data.hafta || 0}\n` +
      `**Aylık Partnerin:** ${data.ay || 0}\n` +
      `**Toplam Partnerin:** ${data.toplam || 0}\n` +
      `**Haftalık Sıralaman:** #1`
    )
    .setImage('https://i.postimg.cc/bvrhKD14/70ba521c-e278-4697-9f02-33cea9a96121.jpg')
    .setTimestamp();
}

// Doğrudan Çalışan GIF Bağlantıları
const GIFS = {
  saril: 'https://media.giphy.com/media/lrr9DHuoKCVQTx22zs/giphy.gif',
  tokat: 'https://media.giphy.com/media/Gf3AUz3eBNbTW/giphy.gif',
  pat: 'https://media.giphy.com/media/5tmRHwTlHAA9Wv3TUf/giphy.gif',
  yumruk: 'https://media.giphy.com/media/11tTNkKOScnWmI/giphy.gif',
  bak: 'https://media.giphy.com/media/A8NNZlVuA1h5K/giphy.gif',
  ghoul: 'https://media.giphy.com/media/10qcQYd6rcfS12/giphy.gif'
};

// Anime Öneri Veritabanı
const ANIME_LISTESI = [
  { isim: 'Hajime no Ippo', tur: 'Spor / Boks / Aksiyon', desc: 'Ezilen bir çocuğun boks dünyasında zirveye tırmanış hikayesi.' },
  { isim: 'Tokyo Ghoul', tur: 'Aksiyon / Gizem / Doğaüstü', desc: 'İnsan etiyle beslenen hortlakların dünyasına adım atan Kaneki’nin mücadelesi.' },
  { isim: 'One Piece', tur: 'Macera / Shounen', desc: 'Korsanlar Kralı olmak isteyen Luffy ve tayfasının devasa macerası.' },
  { isim: 'Bleach', tur: 'Aksiyon / Doğaüstü', desc: 'Ölüm Meleği (Shinigami) güçleri kazanan Ichigo Kurosaki’nin savaşı.' },
  { isim: 'Bungou Stray Dogs', tur: 'Gizem / Doğaüstü / Polisiye', desc: 'Özel doğaüstü güçlere sahip dedektiflerin ve mafyanın çatışması.' },
  { isim: 'Daily Lives of High School Boys', tur: 'Komedi / Okul / Yaşamdan Kesitler', desc: 'Lise erkeklerinin aşırı komik ve saçma günlük hayatı.' }
];

// Bot Hazır Olduğunda Slash Komutlarını Yükle
client.once('ready', async () => {
  console.log(`[✓] ${client.user.tag} başarıyla giriş yaptı!`);

  // Aktivite Ayarlama
  client.user.setActivity('Kastuhino // Anime & Manga', { type: 3 });

  const commands = [
    new SlashCommandBuilder().setName('partner-durum').setDescription('Partnerlik profili kartınızı gösterir.'),
    
    // YÖNETİM KOMUTLARI
    new SlashCommandBuilder()
      .setName('sil')
      .setDescription('Belirtilen miktarda mesajı temizler.')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addIntegerOption(opt => opt.setName('miktar').setDescription('Silinecek mesaj sayısı').setRequired(true)),

    new SlashCommandBuilder()
      .setName('ban')
      .setDescription('Bir kullanıcıyı sunucudan yasaklar.')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addUserOption(opt => opt.setName('kullanici').setDescription('Yasaklanacak üye').setRequired(true))
      .addStringOption(opt => opt.setName('sebep').setDescription('Yasaklama sebebi').setRequired(false)),

    new SlashCommandBuilder()
      .setName('unban')
      .setDescription('ID\'si girilen kullanıcının yasağını kaldırır.')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addStringOption(opt => opt.setName('kullanici_id').setDescription('Yasağı kaldırılacak kişinin ID numarası').setRequired(true)),

    new SlashCommandBuilder()
      .setName('kick')
      .setDescription('Bir kullanıcıyı sunucudan atar.')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addUserOption(opt => opt.setName('kullanici').setDescription('Atılacak üye').setRequired(true))
      .addStringOption(opt => opt.setName('sebep').setDescription('Atılma sebebi').setRequired(false)),

    new SlashCommandBuilder()
      .setName('sustur')
      .setDescription('Bir kullanıcıyı zamana aşımına uğratır (susturur).')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addUserOption(opt => opt.setName('kullanici').setDescription('Susturulacak üye').setRequired(true))
      .addIntegerOption(opt => opt.setName('dakika').setDescription('Kaç dakika').setRequired(false))
      .addStringOption(opt => opt.setName('sebep').setDescription('Susturma sebebi').setRequired(false)),

    new SlashCommandBuilder()
      .setName('kanal-kilitle')
      .setDescription('Bulunduğunuz kanalı üyelerin mesaj yazmasına kapatır.')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
      .setName('kanal-ac')
      .setDescription('Kilitli olan kanalı tekrar mesaj yazımına açar.')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    // ÇEKİLİŞ
    new SlashCommandBuilder()
      .setName('cekilis')
      .setDescription('Odada saat bazlı çekiliş başlatır.')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addStringOption(opt => opt.setName('odul').setDescription('Çekiliş ödülü nedir?').setRequired(true))
      .addIntegerOption(opt => opt.setName('saat').setDescription('Çekiliş kaç saat sürecek?').setRequired(true))
      .addIntegerOption(opt => opt.setName('kazanan_sayisi').setDescription('Kaç kişi kazanacak?').setRequired(false)),

    // ANIME & EĞLENCE KOMUTLARI
    new SlashCommandBuilder()
      .setName('saril')
      .setDescription('Bir üyeye anime üslubuyla sarılır.')
      .addUserOption(opt => opt.setName('kullanici').setDescription('Sarılmak istediğin üye').setRequired(true)),

    new SlashCommandBuilder()
      .setName('tokat')
      .setDescription('Bir üyeye anime tokadı yapıştırır.')
      .addUserOption(opt => opt.setName('kullanici').setDescription('Tokatlayacağın üye').setRequired(true)),

    new SlashCommandBuilder()
      .setName('pat-pat')
      .setDescription('Bir üyenin kafasını okşar.')
      .addUserOption(opt => opt.setName('kullanici').setDescription('Kafasını okşayacağın üye').setRequired(true)),

    new SlashCommandBuilder()
      .setName('yumruk')
      .setDescription('Bir üyeye boksör yumruğu atar.')
      .addUserOption(opt => opt.setName('kullanici').setDescription('Yumruklayacağın üye').setRequired(true)),

    new SlashCommandBuilder()
      .setName('bak')
      .setDescription('Bir üyeye sert/şüpheci bakış atar.')
      .addUserOption(opt => opt.setName('kullanici').setDescription('Bakış atacağın üye').setRequired(true)),

    new SlashCommandBuilder()
      .setName('ship')
      .setDescription('İki üye arasındaki aşk/uyum yüzdesini ölçer.')
      .addUserOption(opt => opt.setName('birinci').setDescription('İlk üye').setRequired(true))
      .addUserOption(opt => opt.setName('ikinci').setDescription('İkinci üye').setRequired(false)),

    new SlashCommandBuilder()
      .setName('waifu-puanla')
      .setDescription('Bir üyenin Waifu/Husbando skorunu hesaplar.')
      .addUserOption(opt => opt.setName('kullanici').setDescription('Puanlanacak üye').setRequired(false)),

    new SlashCommandBuilder()
      .setName('anime-oner')
      .setDescription('Rastgele kaliteli bir anime önerisi yapar.'),

    new SlashCommandBuilder()
      .setName('1000-7')
      .setDescription('Tokyo Ghoul göndermesi yapar.'),

    new SlashCommandBuilder()
      .setName('avatar')
      .setDescription('Sizin veya etiketlenen üyenin avatarını büyük boyutta gösterir.')
      .addUserOption(opt => opt.setName('kullanici').setDescription('Avatarına bakılacak üye').setRequired(false))
  ];

  try {
    await client.application.commands.set(commands);
    console.log('[✓] Tüm Slash ve Anime komutları yüklendi!');
  } catch (err) {
    console.error('Slash komut yükleme hatası:', err);
  }
});

// Komut ve Etkileşim Dinleyicisi
client.on('interactionCreate', async (interaction) => {

  // 1. BUTON ETKİLEŞİMİ (ÇEKİLİŞ)
  if (interaction.isButton() && interaction.customId === 'cekilis_katil') {
    const msgId = interaction.message.id;
    if (!cekilisler[msgId]) {
      return interaction.reply({ content: 'Bu çekiliş sona ermiş veya geçerliliğini yitirmiş.', ephemeral: true });
    }

    const userId = interaction.user.id;
    const katilimcilar = cekilisler[msgId].katilimcilar;

    if (katilimcilar.includes(userId)) {
      const index = katilimcilar.indexOf(userId);
      katilimcilar.splice(index, 1);
      await interaction.reply({ content: 'Çekilişten ayrıldınız.', ephemeral: true });
    } else {
      katilimcilar.push(userId);
      await interaction.reply({ content: '🎉 Çekilişe başarıyla katıldınız!', ephemeral: true });
    }

    const data = cekilisler[msgId];
    const tarih = new Date().toLocaleDateString('tr-TR');

    const updatedEmbed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle(`🎉 ÇEKİLİŞ: ${data.odul}`)
      .setDescription(`Katılmak için aşağıdaki butona tıklayın!\n\n⏳ **Kalan Süre:** <t:${data.bitisZamani}:R>\n🏆 **Kazanan Sayısı:** ${data.kazananSayisi}\n👤 **Katılımcı:** ${katilimcilar.length}`)
      .setFooter({ text: `Kastuhino Çekiliş Sistemi • ${tarih}` });

    const updatedButton = new ButtonBuilder()
      .setCustomId('cekilis_katil')
      .setLabel(`Katıl (${katilimcilar.length})`)
      .setEmoji('🎉')
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(updatedButton);
    return interaction.message.edit({ embeds: [updatedEmbed], components: [row] });
  }

  // 2. SLASH KOMUTLARI
  if (!interaction.isChatInputCommand()) return;
  const { commandName } = interaction;

  // PARTNER
  if (commandName === 'partner-durum') {
    if (!partners[interaction.user.id]) partners[interaction.user.id] = { bugun: 0, hafta: 0, ay: 0, toplam: 0 };
    const embed = createPartnerEmbed(interaction.guild, interaction.user, partners[interaction.user.id]);
    return interaction.reply({ embeds: [embed] });
  }

  // ANIME & EĞLENCE KOMUTLARI
  if (commandName === 'saril') {
    const hedef = interaction.options.getUser('kullanici');
    const embed = new EmbedBuilder()
      .setColor('#ff79c6')
      .setDescription(`🤗 <@${interaction.user.id}>, <@${hedef.id}> kişisine sımsıkı sarıldı!`)
      .setImage(GIFS.saril);
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'tokat') {
    const hedef = interaction.options.getUser('kullanici');
    const embed = new EmbedBuilder()
      .setColor('#ff5555')
      .setDescription(`🖐️ <@${interaction.user.id}>, <@${hedef.id}> kişisine osmanlı tokadı yapıştırdı!`)
      .setImage(GIFS.tokat);
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'pat-pat') {
    const hedef = interaction.options.getUser('kullanici');
    const embed = new EmbedBuilder()
      .setColor('#ffb86c')
      .setDescription(`🤏 <@${interaction.user.id}>, <@${hedef.id}> kişisinin kafasını şefkatle okşadı.`)
      .setImage(GIFS.pat);
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'yumruk') {
    const hedef = interaction.options.getUser('kullanici');
    const embed = new EmbedBuilder()
      .setColor('#bd93f9')
      .setDescription(`👊 <@${interaction.user.id}>, <@${hedef.id}> kişisine fena bir boksör yumruğu indirdi!`)
      .setImage(GIFS.yumruk);
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'bak') {
    const hedef = interaction.options.getUser('kullanici');
    const embed = new EmbedBuilder()
      .setColor('#8be9fd')
      .setDescription(`👁️ <@${interaction.user.id}>, <@${hedef.id}> kişisine oldukça şüpheci bakıyor...`)
      .setImage(GIFS.bak);
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'ship') {
    const birinci = interaction.options.getUser('birinci');
    const ikinci = interaction.options.getUser('ikinci') || interaction.user;
    
    const uyum = Math.floor(Math.random() * 101);
    const doluluk = Math.round(uyum / 10);
    const bar = '💖'.repeat(doluluk) + '🖤'.repeat(10 - doluluk);

    const embed = new EmbedBuilder()
      .setColor('#ff79c6')
      .setTitle('💕 Uyum Ölçer (Ship)')
      .setDescription(`**${birinci.username}** x **${ikinci.username}**\n\n**Uyum:** %${uyum}\n${bar}`);
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'waifu-puanla') {
    const hedef = interaction.options.getUser('kullanici') || interaction.user;
    const skor = Math.floor(Math.random() * 101);

    const embed = new EmbedBuilder()
      .setColor('#f1fa8c')
      .setTitle('✨ Waifu / Husbando Skor Kartı')
      .setDescription(`<@${hedef.id}> kişisinin çekicilik skoru: **%${skor}** ${skor > 80 ? '👑 (Efsanevi)' : skor > 50 ? '💖 (Aşırı Tatlı)' : '💔 (Sıradan)'}`);
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'anime-oner') {
    const secilen = ANIME_LISTESI[Math.floor(Math.random() * ANIME_LISTESI.length)];
    const embed = new EmbedBuilder()
      .setColor('#ff79c6')
      .setTitle(`📺 Önerilen Anime: ${secilen.isim}`)
      .addFields(
        { name: '🏷️ Tür', value: secilen.tur },
        { name: '📝 Özet', value: secilen.desc }
      )
      .setFooter({ text: 'Kastuhino Anime Öneri Sistemi' });
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === '1000-7') {
    const embed = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('🩸 1000 - 7 kaç eder?')
      .setDescription('`993... 986... 979... 972...`\n\n*"Bu dünyadaki tüm kötülükler, kişinin yetersizliğinden kaynaklanır."*')
      .setImage(GIFS.ghoul);
    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'avatar') {
    const hedef = interaction.options.getUser('kullanici') || interaction.user;
    const avatarURL = hedef.displayAvatarURL({ dynamic: true, size: 1024 });

    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle(`🖼️ ${hedef.tag} Avatarı`)
      .setImage(avatarURL);
    return interaction.reply({ embeds: [embed] });
  }

  // YÖNETİCİ KONTROLÜ
  const isOwnerOrAdmin = interaction.guild.ownerId === interaction.user.id || 
                         interaction.member.permissions.has(PermissionFlagsBits.Administrator);

  if (!isOwnerOrAdmin) {
    return interaction.reply({ content: '❌ Bu komutu sadece **Sunucu Sahibi** ve **Yöneticiler** kullanabilir!', ephemeral: true });
  }

  // ÇEKİLİŞ
  if (commandName === 'cekilis') {
    const odul = interaction.options.getString('odul');
    const saat = interaction.options.getInteger('saat');
    const kazananSayisi = interaction.options.getInteger('kazanan_sayisi') || 1;

    const bitisMilisaniye = Date.now() + (saat * 60 * 60 * 1000);
    const bitisZamani = Math.floor(bitisMilisaniye / 1000);
    const tarih = new Date().toLocaleDateString('tr-TR');

    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle(`🎉 ÇEKİLİŞ: ${odul}`)
      .setDescription(`Katılmak için aşağıdaki butona tıklayın!\n\n⏳ **Kalan Süre:** <t:${bitisZamani}:R>\n🏆 **Kazanan Sayısı:** ${kazananSayisi}\n👤 **Katılımcı:** 0`)
      .setFooter({ text: `Kastuhino Çekiliş Sistemi • ${tarih}` });

    const button = new ButtonBuilder()
      .setCustomId('cekilis_katil')
      .setLabel('Katıl (0)')
      .setEmoji('🎉')
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(button);
    const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    cekilisler[msg.id] = { odul, kazananSayisi, bitisZamani, katilimcilar: [] };

    setTimeout(async () => {
      const currentData = cekilisler[msg.id];
      if (!currentData) return;

      const katilimcilar = currentData.katilimcilar;
      let kazananlar = [];

      if (katilimcilar.length > 0) {
        let havuz = [...katilimcilar];
        for (let i = 0; i < kazananSayisi; i++) {
          if (havuz.length === 0) break;
          const randIndex = Math.floor(Math.random() * havuz.length);
          kazananlar.push(`<@${havuz[randIndex]}>`);
          havuz.splice(randIndex, 1);
        }
      }

      const endEmbed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle(`🎉 ÇEKİLİŞ SONA ERDİ: ${odul}`)
        .setDescription(`🏆 **Kazanan(lar):** ${kazananlar.length > 0 ? kazananlar.join(', ') : 'Katılımcı olmadığından kazanan yok.'}\n👤 **Toplam Katılımcı:** ${katilimcilar.length}`)
        .setFooter({ text: `Kastuhino Çekiliş Sistemi • ${tarih}` });

      const disabledButton = new ButtonBuilder()
        .setCustomId('cekilis_bitti')
        .setLabel(`Çekiliş Sona Erdi (${katilimcilar.length})`)
        .setEmoji('🔒')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);

      const endRow = new ActionRowBuilder().addComponents(disabledButton);
      await msg.edit({ embeds: [endEmbed], components: [endRow] });

      if (kazananlar.length > 0) {
        interaction.channel.send(`🎉 Tebrikler ${kazananlar.join(', ')}! **${odul}** çekilişini kazandınız!`);
      }

      delete cekilisler[msg.id];
    }, saat * 60 * 60 * 1000);
  }

  // MODERASYON
  if (commandName === 'sil') {
    const miktar = interaction.options.getInteger('miktar');
    await interaction.channel.bulkDelete(miktar, true).catch(() => {});
    return interaction.reply({ content: `✅ **${miktar}** adet mesaj silindi!`, ephemeral: true });
  }

  if (commandName === 'ban') {
    const user = interaction.options.getUser('kullanici');
    const sebep = interaction.options.getString('sebep') || 'Sebep belirtilmedi';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ content: 'Kullanıcı bulunamadı.', ephemeral: true });
    try {
      await member.ban({ reason: sebep });
      return interaction.reply({ content: `✅ **${user.tag}** yasaklandı.` });
    } catch { return interaction.reply({ content: 'Yetki hatası!', ephemeral: true }); }
  }

  if (commandName === 'unban') {
    const userId = interaction.options.getString('kullanici_id');
    try {
      await interaction.guild.members.unban(userId);
      return interaction.reply({ content: `✅ ID: ${userId} yasağı kaldırıldı.` });
    } catch { return interaction.reply({ content: 'Yasaklı kullanıcı bulunamadı.', ephemeral: true }); }
  }

  if (commandName === 'kick') {
    const user = interaction.options.getUser('kullanici');
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ content: 'Kullanıcı bulunamadı.', ephemeral: true });
    try {
      await member.kick();
      return interaction.reply({ content: `✅ **${user.tag}** atıldı.` });
    } catch { return interaction.reply({ content: 'Yetki hatası!', ephemeral: true }); }
  }

  if (commandName === 'sustur') {
    const user = interaction.options.getUser('kullanici');
    const dakika = interaction.options.getInteger('dakika') || 10;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ content: 'Kullanıcı bulunamadı.', ephemeral: true });
    try {
      await member.timeout(dakika * 60 * 1000);
      return interaction.reply({ content: `✅ **${user.tag}** ${dakika} dk susturuldu.` });
    } catch { return interaction.reply({ content: 'Yetki hatası!', ephemeral: true }); }
  }

  if (commandName === 'kanal-kilitle') {
    await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: false });
    return interaction.reply({ content: `🔒 Kanal mesajlara kapatıldı.` });
  }

  if (commandName === 'kanal-ac') {
    await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: null });
    return interaction.reply({ content: `🔓 Kanal mesajlara açıldı.` });
  }
});

// Partner Takip
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;
  if (message.channel.id === PARTNER_KANAL_ID) {
    if (message.content.includes('discord.gg/') || message.content.includes('discord.com/invite/')) {
      if (!partners[message.author.id]) partners[message.author.id] = { bugun: 0, hafta: 0, ay: 0, toplam: 0 };
      partners[message.author.id].bugun += 1;
      partners[message.author.id].hafta += 1;
      partners[message.author.id].ay += 1;
      partners[message.author.id].toplam += 1;
      savePartners();
      const embed = createPartnerEmbed(message.guild, message.author, partners[message.author.id]);
      return message.reply({ content: '✅ Partnerlik başarıyla sayıldı!', embeds: [embed] });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
