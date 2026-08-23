const { Client, GatewayIntentBits, SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const http = require('http');

// Render Uptime Sunucusu
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Kastuhino Bot Aktif!\n');
});
server.listen(process.env.PORT || 3000);

// Bot İstemcisi ve İzinler
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration
  ]
});

// Partner Veritabanı (partners.json)
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

// Resimli Partner Kart Tasarımı (Embed)
function createPartnerEmbed(guild, user, data) {
  const guildIcon = guild ? guild.iconURL({ dynamic: true, size: 512 }) : null;

  return new EmbedBuilder()
    .setColor('#6b21ff')
    .setAuthor({ 
      name: user.tag, 
      iconURL: user.displayAvatarURL({ dynamic: true }) 
    })
    .setThumbnail(guildIcon) // Sağ Üst: Sunucu Logosu
    .setTitle('Partnerlik Profili')
    .setDescription(
      `**Bugünlük Partnerin:** ${data.bugun || 0}\n` +
      `**Haftalık Partnerin:** ${data.hafta || 0}\n` +
      `**Aylık Partnerin:** ${data.ay || 0}\n` +
      `**Toplam Partnerin:** ${data.toplam || 0}\n` +
      `**Haftalık Sıralaman:** #1`
    )
    .setImage('https://i.postimg.cc/bvrhKD14/70ba521c-e278-4697-9f02-33cea9a96121.jpg') // Alt: Kastuhino Afişi
    .setTimestamp();
}

// Bot Aktif Olduğunda Slash Komutlarını Yükle
client.once('ready', async () => {
  console.log(`[✓] ${client.user.tag} başarıyla giriş yaptı!`);

  const commands = [
    new SlashCommandBuilder()
      .setName('partner-durum')
      .setDescription('Partnerlik profili kartınızı gösterir.'),
    new SlashCommandBuilder()
      .setName('sil')
      .setDescription('Belirtilen miktarda mesajı temizler.')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
      .addIntegerOption(opt => opt.setName('miktar').setDescription('Silinecek mesaj sayısı').setRequired(true))
  ];

  try {
    await client.application.commands.set(commands);
    console.log('[✓] Tüm eğik çizgi (/) komutları Discorda yüklendi!');
  } catch (err) {
    console.error('Slash komut yükleme hatası:', err);
  }
});

// Slash Komut Etkileşimleri
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'sil') {
    const miktar = interaction.options.getInteger('miktar');
    await interaction.channel.bulkDelete(miktar, true).catch(() => {
      return interaction.reply({ content: 'Mesajlar silinirken bir hata oluştu!', ephemeral: true });
    });
    return interaction.reply({ content: `${miktar} adet mesaj silindi!`, ephemeral: true });
  }

  if (commandName === 'partner-durum') {
    if (!partners[interaction.user.id]) {
      partners[interaction.user.id] = { bugun: 0, hafta: 0, ay: 0, toplam: 0 };
    }
    const embed = createPartnerEmbed(interaction.guild, interaction.user, partners[interaction.user.id]);
    return interaction.reply({ embeds: [embed] });
  }
});

// Prefix Komutları (k!) ve Otomatik Partner Algılama
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  if (!partners[message.author.id]) {
    partners[message.author.id] = { bugun: 0, hafta: 0, ay: 0, toplam: 0 };
  }

  // 1. OTOMATİK PARTNER ALGILAMA (discord.gg linki görünce)
  if (message.content.includes('discord.gg/') || message.content.includes('discord.com/invite/')) {
    partners[message.author.id].bugun += 1;
    partners[message.author.id].hafta += 1;
    partners[message.author.id].ay += 1;
    partners[message.author.id].toplam += 1;
    savePartners();

    const embed = createPartnerEmbed(message.guild, message.author, partners[message.author.id]);
    return message.reply({ content: '✅ Partnerlik başarıyla sayıldı!', embeds: [embed] });
  }

  // 2. k!sustur Komutu
  if (message.content.startsWith('k!sustur')) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply('Komut çalıştırılırken bir Discord izin hatası oluştu.');
    }
    const target = message.mentions.members.first();
    if (!target) return message.reply('Lütfen susturulacak üyeyi etiketleyin!');

    try {
      await target.timeout(10 * 60 * 1000, 'k!sustur komutu');
      return message.reply(`✅ **${target.user.tag}** 10 dakika boyunca susturuldu.`);
    } catch (err) {
      return message.reply('Komut çalıştırılırken bir Discord izin hatası oluştu.');
    }
  }

  // 3. k!kick Komutu
  if (message.content.startsWith('k!kick')) {
    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
      return message.reply('Komut çalıştırılırken bir Discord izin hatası oluştu.');
    }
    const target = message.mentions.members.first();
    if (!target) return message.reply('Lütfen sunucudan atılacak üyeyi etiketleyin!');

    try {
      await target.kick('k!kick komutu');
      return message.reply(`✅ **${target.user.tag}** sunucudan atıldı.`);
    } catch (err) {
      return message.reply('Komut çalıştırılırken bir Discord izin hatası oluştu.');
    }
  }

  // 4. k!ban Komutu
  if (message.content.startsWith('k!ban')) {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return message.reply('Komut çalıştırılırken bir Discord izin hatası oluştu.');
    }
    const target = message.mentions.members.first();
    if (!target) return message.reply('Lütfen yasaklanacak üyeyi etiketleyin!');

    try {
      await target.ban({ reason: 'k!ban komutu' });
      return message.reply(`✅ **${target.user.tag}** sunucudan yasaklandı.`);
    } catch (err) {
      return message.reply('Komut çalıştırılırken bir Discord izin hatası oluştu.');
    }
  }

  // 5. k!partner-durum Komutu
  if (message.content.trim() === 'k!partner-durum') {
    const embed = createPartnerEmbed(message.guild, message.author, partners[message.author.id]);
    return message.reply({ embeds: [embed] });
  }
});

// Bot Girişi
client.login(process.env.DISCORD_TOKEN);
