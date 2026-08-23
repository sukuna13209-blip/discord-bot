const { Client, GatewayIntentBits, SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const http = require('http');

// Render Uptime Sunucusu
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Kastuhino Bot Aktif!\n');
});
server.listen(process.env.PORT || 3000);

// Otomatik partner algılamanın çalışacağı ÖZEL KANAL ID'Sİ
const PARTNER_KANAL_ID = '1514756158831988876';

// Bot İstemcisi
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMessageReactions
  ]
});

// Partner Veritabanı
const PARTNER_FILE = './partners.json';
let partners = {};

if (fs.existsSync(PARTNER_FILE)) {
  try {
    partners = JSON.parse(fs.readFileSync(PARTNER_FILE, 'utf8'));
  } catch (e) {
    partners = {};
  }
}

function savePartners() {
  fs.writeFileSync(PARTNER_FILE, JSON.stringify(partners, null, 2));
}

// Resimli Partner Kart Tasarımı
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

// Slash Komutlarını Yükle
client.once('ready', async () => {
  console.log(`[✓] ${client.user.tag} başarıyla giriş yaptı!`);

  const commands = [
    // Herkesin Kullanabileceği Komut
    new SlashCommandBuilder()
      .setName('partner-durum')
      .setDescription('Partnerlik profili kartınızı gösterir.'),

    // Sadece Admin ve Sunucu Sahibinin Kullanabileceği Komutlar
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
      .addIntegerOption(opt => opt.setName('dakika').setDescription('Kaç dakika (Varsayılan: 10)').setRequired(false))
      .addStringOption(opt => opt.setName('sebep').setDescription('Susturma sebebi').setRequired(false)),

    new SlashCommandBuilder()
      .setName('kanal-kilitle')
      .setDescription('Bulunduğunuz kanalı üyelerin mesaj yazmasına kapatır.')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
      .setName('kanal-ac')
      .setDescription('Kilitli olan kanalı tekrar mesaj yazımına açar.')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
      .setName('cekilis')
      .setDescription('Odada otomatik bir çekiliş başlatır.')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addStringOption(opt => opt.setName('odul').setDescription('Çekiliş ödülü nedir?').setRequired(true))
      .addIntegerOption(opt => opt.setName('sure').setDescription('Çekiliş kaç dakika sürecek?').setRequired(true))
      .addIntegerOption(opt => opt.setName('kazanan_sayisi').setDescription('Kaç kişi kazanacak?').setRequired(false))
  ];

  try {
    await client.application.commands.set(commands);
    console.log('[✓] Tüm Admin ve Moderasyon komutları yüklendi!');
  } catch (err) {
    console.error('Slash komut yükleme hatası:', err);
  }
});

// Slash Komut Etkileşimleri
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  // /partner-durum
  if (commandName === 'partner-durum') {
    if (!partners[interaction.user.id]) partners[interaction.user.id] = { bugun: 0, hafta: 0, ay: 0, toplam: 0 };
    const embed = createPartnerEmbed(interaction.guild, interaction.user, partners[interaction.user.id]);
    return interaction.reply({ embeds: [embed] });
  }

  // Yetki Kontrolü (Admin veya Sunucu Sahibi)
  const isOwnerOrAdmin = interaction.guild.ownerId === interaction.user.id || 
                         interaction.member.permissions.has(PermissionFlagsBits.Administrator);

  if (!isOwnerOrAdmin) {
    return interaction.reply({ content: '❌ Bu komutu sadece **Sunucu Sahibi** ve **Yöneticiler** kullanabilir!', ephemeral: true });
  }

  // Moderasyon Komutları
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
      return interaction.reply({ content: `✅ **${user.tag}** sunucudan yasaklandı. (Sebep: ${sebep})` });
    } catch { return interaction.reply({ content: 'Yetki hatası!', ephemeral: true }); }
  }

  if (commandName === 'unban') {
    const userId = interaction.options.getString('kullanici_id');
    try {
      await interaction.guild.members.unban(userId);
      return interaction.reply({ content: `✅ Belirtilen ID'ye sahip kullanıcının yasağı başarıyla kaldırıldı!` });
    } catch { return interaction.reply({ content: 'Bu ID\'ye sahip yasaklı bir kullanıcı bulunamadı.', ephemeral: true }); }
  }

  if (commandName === 'kick') {
    const user = interaction.options.getUser('kullanici');
    const sebep = interaction.options.getString('sebep') || 'Sebep belirtilmedi';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ content: 'Kullanıcı bulunamadı.', ephemeral: true });
    try {
      await member.kick(sebep);
      return interaction.reply({ content: `✅ **${user.tag}** sunucudan atıldı. (Sebep: ${sebep})` });
    } catch { return interaction.reply({ content: 'Yetki hatası!', ephemeral: true }); }
  }

  if (commandName === 'sustur') {
    const user = interaction.options.getUser('kullanici');
    const dakika = interaction.options.getInteger('dakika') || 10;
    const sebep = interaction.options.getString('sebep') || 'Sebep belirtilmedi';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ content: 'Kullanıcı bulunamadı.', ephemeral: true });
    try {
      await member.timeout(dakika * 60 * 1000, sebep);
      return interaction.reply({ content: `✅ **${user.tag}** ${dakika} dakika susturuldu. (Sebep: ${sebep})` });
    } catch { return interaction.reply({ content: 'Yetki hatası!', ephemeral: true }); }
  }

  if (commandName === 'kanal-kilitle') {
    await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: false });
    return interaction.reply({ content: `🔒 Kanal üyelerin mesaj göndermesine **kapatıldı**.` });
  }

  if (commandName === 'kanal-ac') {
    await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: null });
    return interaction.reply({ content: `🔓 Kanal üyelerin mesaj göndermesine **açıldı**.` });
  }

  if (commandName === 'cekilis') {
    const odul = interaction.options.getString('odul');
    const sure = interaction.options.getInteger('sure');
    const kazananSayisi = interaction.options.getInteger('kazanan_sayisi') || 1;

    const embed = new EmbedBuilder()
      .setTitle('🎉 ÇEKİLİŞ BAŞLADI! 🎉')
      .setDescription(`**Ödül:** ${odul}\n**Kazanan Sayısı:** ${kazananSayisi} Kişi\n**Süre:** ${sure} Dakika\n\n*Katılmak için aşağıdaki 🎉 emojisine tıklayın!*`)
      .setColor('#ffbb00')
      .setFooter({ text: 'Kastuhino Çekiliş Sistemi' });

    const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
    await msg.react('🎉');

    setTimeout(async () => {
      const fetchedMsg = await interaction.channel.messages.fetch(msg.id).catch(() => null);
      if (!fetchedMsg) return;

      const reaction = fetchedMsg.reactions.cache.get('🎉');
      const users = await reaction.users.fetch();
      const validUsers = Array.from(users.values()).filter(u => !u.bot);

      if (validUsers.length === 0) {
        return interaction.followUp({ content: `Kimse katılmadığı için **${odul}** çekilişi iptal edildi.` });
      }

      let winners = [];
      for (let i = 0; i < kazananSayisi; i++) {
        if (validUsers.length === 0) break;
        const randomIndex = Math.floor(Math.random() * validUsers.length);
        winners.push(validUsers[randomIndex]);
        validUsers.splice(randomIndex, 1);
      }

      const winnersText = winners.map(w => w.toString()).join(', ');
      interaction.followUp({ content: `🎉 **TEBRİKLER ${winnersText}!** **${odul}** kazandınız!` });

      const endEmbed = new EmbedBuilder()
        .setTitle('🎊 Çekiliş Sona Erdi! 🎊')
        .setDescription(`**Ödül:** ${odul}\n**Kazanan(lar):** ${winnersText}`)
        .setColor('#00ff00');
      await fetchedMsg.edit({ embeds: [endEmbed] });

    }, sure * 60000);
  }
});

// Otomatik Partner Algılama
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  if (message.channel.id === PARTNER_KANAL_ID) {
    if (message.content.includes('discord.gg/') || message.content.includes('discord.com/invite/')) {
      if (!partners[message.author.id]) {
        partners[message.author.id] = { bugun: 0, hafta: 0, ay: 0, toplam: 0 };
      }

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

// Bot Girişi
client.login(process.env.DISCORD_TOKEN);
