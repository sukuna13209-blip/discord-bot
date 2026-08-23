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

// Bot Hazır Olduğunda Slash Komutlarını Yükle
client.once('ready', async () => {
  console.log(`[✓] ${client.user.tag} başarıyla giriş yaptı!`);

  const commands = [
    new SlashCommandBuilder().setName('partner-durum').setDescription('Partnerlik profili kartınızı gösterir.'),
    
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

    // SAAT BAZLI ÇEKİLİŞ KOMUTU
    new SlashCommandBuilder()
      .setName('cekilis')
      .setDescription('Odada saat bazlı çekiliş başlatır.')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addStringOption(opt => opt.setName('odul').setDescription('Çekiliş ödülü nedir?').setRequired(true))
      .addIntegerOption(opt => opt.setName('saat').setDescription('Çekiliş kaç saat sürecek?').setRequired(true))
      .addIntegerOption(opt => opt.setName('kazanan_sayisi').setDescription('Kaç kişi kazanacak?').setRequired(false))
  ];

  try {
    await client.application.commands.set(commands);
    console.log('[✓] Tüm Slash komutları yüklendi!');
  } catch (err) {
    console.error('Slash komut yükleme hatası:', err);
  }
});

// Komut ve Buton Dinleyici
client.on('interactionCreate', async (interaction) => {

  // 1. BUTON ETKİLEŞİMİ (ÇEKİLİŞE KATILMA)
  if (interaction.isButton() && interaction.customId === 'cekilis_katil') {
    const msgId = interaction.message.id;
    if (!cekilisler[msgId]) {
      return interaction.reply({ content: 'Bu çekiliş sona ermiş veya geçerliliğini yitirmiş.', ephemeral: true });
    }

    const userId = interaction.user.id;
    const katilimcilar = cekilisler[msgId].katilimcilar;

    if (katilimcilar.includes(userId)) {
      // Çıkış yapma
      const index = katilimcilar.indexOf(userId);
      katilimcilar.splice(index, 1);
      await interaction.reply({ content: 'Çekilişten ayrıldınız.', ephemeral: true });
    } else {
      // Katılma
      katilimcilar.push(userId);
      await interaction.reply({ content: '🎉 Çekilişe başarıyla katıldınız!', ephemeral: true });
    }

    // Embed ve Buton Yazısını Güncelleme
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

  if (commandName === 'partner-durum') {
    if (!partners[interaction.user.id]) partners[interaction.user.id] = { bugun: 0, hafta: 0, ay: 0, toplam: 0 };
    const embed = createPartnerEmbed(interaction.guild, interaction.user, partners[interaction.user.id]);
    return interaction.reply({ embeds: [embed] });
  }

  // Admin Kontrolü
  const isOwnerOrAdmin = interaction.guild.ownerId === interaction.user.id || 
                         interaction.member.permissions.has(PermissionFlagsBits.Administrator);

  if (!isOwnerOrAdmin) {
    return interaction.reply({ content: '❌ Bu komutu sadece **Sunucu Sahibi** ve **Yöneticiler** kullanabilir!', ephemeral: true });
  }

  // ÇEKİLİŞ BAŞLATMA
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

    // Hafızaya Kayıt
    cekilisler[msg.id] = {
      odul,
      kazananSayisi,
      bitisZamani,
      katilimcilar: []
    };

    // Zaman Dolduğunda Çekilişi Bitir
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

  // Diğer Moderasyon Komutları
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
