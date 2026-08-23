const { Client, GatewayIntentBits, SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const http = require('http');

// Render'ın botu kapatmaması (port hatası vermemesi) için kurulan hafif web sunucusu
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Kastuhino Bot Aktif!\n');
});
server.listen(process.env.PORT || 3000);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ]
});

// Partner Veritabanı Sistemi
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

client.once('ready', async () => {
    console.log(`✅ ${client.user.tag} başarıyla giriş yaptı!`);

    // Komutların Discord menüsünde (/) görünmesi için kayıt dizisi
    const commands = [
        new SlashCommandBuilder().setName('ban').setDescription('Bir kullanıcıyı sunucudan banlar.')
            .addUserOption(option => option.setName('kullanici').setDescription('Banlanacak kullanıcı').setRequired(true))
            .addStringOption(option => option.setName('sebep').setDescription('Ban sebebi').setRequired(false)),
        new SlashCommandBuilder().setName('kick').setDescription('Bir kullanıcıyı sunucudan atar.')
            .addUserOption(option => option.setName('kullanici').setDescription('Atılacak kullanıcı').setRequired(true))
            .addStringOption(option => option.setName('sebep').setDescription('Atılma sebebi').setRequired(false)),
        new SlashCommandBuilder().setName('temizle').setDescription('Belirtilen miktarda mesajı siler.')
            .addIntegerOption(option => option.setName('miktar').setDescription('Silinecek mesaj sayısı').setRequired(true)),
        new SlashCommandBuilder().setName('partner-ekle').setDescription('Partner sunucu ekler.')
            .addStringOption(option => option.setName('sunucu-adi').setDescription('Sunucu adı').setRequired(true))
            .addStringOption(option => option.setName('davet-linki').setDescription('Davet linki').setRequired(true)),
        new SlashCommandBuilder().setName('partner-durum').setDescription('Mevcut partner durumunuzu gösterir.')
    ].map(command => command.toJSON());

    try {
        await client.application.commands.set(commands);
        console.log('✅ Tüm eğik çizgi (/) komutları Discorda başarıyla yüklendi!');
    } catch (error) {
        console.error('Komut yüklenirken hata oluştu:', error);
    }
});

// Komut Yönetimi ve Çalıştırıcısı
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'ban') {
        const user = interaction.options.getUser('kullanici');
        const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi';
        if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return interaction.reply({ content: 'Bu komutu kullanmak için yetkin yok!', ephemeral: true });
        }
        await interaction.guild.members.ban(user, { reason }).catch(() => {});
        await interaction.reply(`${user.tag} başarıyla banlandı! Sebep: ${reason}`);
    } 
    else if (commandName === 'kick') {
        const user = interaction.options.getUser('kullanici');
        const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi';
        if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
            return interaction.reply({ content: 'Bu komutu kullanmak için yetkin yok!', ephemeral: true });
        }
        await interaction.guild.members.kick(user, { reason }).catch(() => {});
        await interaction.reply(`${user.tag} başarıyla sunucudan atıldı! Sebep: ${reason}`);
    }
    else if (commandName === 'temizle') {
        const miktar = interaction.options.getInteger('miktar');
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({ content: 'Bu komutu kullanmak için yetkin yok!', ephemeral: true });
        }
        await interaction.channel.bulkDelete(miktar, true).catch(() => {
            return interaction.reply({ content: 'Mesajlar silinirken bir hata oluştu!', ephemeral: true });
        });
        await interaction.reply({ content: `${miktar} adet mesaj silindi!`, ephemeral: true });
    }
    else if (commandName === 'partner-ekle') {
        const sunucuAdi = interaction.options.getString('sunucu-adi');
        const davetLinki = interaction.options.getString('davet-linki');
        partners[interaction.user.id] = { sunucuAdi, davetLinki, tarih: new Date().toLocaleDateString() };
        savePartners();
        await interaction.reply(`"${sunucuAdi}" adlı partner başarıyla eklendi!`);
    }
    else if (commandName === 'partner-durum') {
        const kayit = partners[interaction.user.id];
        if (!kayit) {
            return interaction.reply({ content: 'Kayıtlı bir partnerliğiniz bulunmuyor.', ephemeral: true });
        }
        await interaction.reply(`Partner Sunucunuz: ${kayit.sunucuAdi}\nLink: ${kayit.davetLinki}`);
    }
});
// Prefix (k!) Gelişmiş Partner ve Embed Sistemi
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith('k!')) return;

  const args = message.content.slice(2).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // Her kullanıcının sayaç verisini kontrol et, yoksa sıfırdan oluştur
  if (!partners[message.author.id]) {
    partners[message.author.id] = { bugun: 0, hafta: 0, ay: 0, toplam: 0 };
  }

  // Kullanım: k!partner-ekle
  if (command === 'partner-ekle') {
    // Sayıları 1 artır
    partners[message.author.id].bugun += 1;
    partners[message.author.id].hafta += 1;
    partners[message.author.id].ay += 1;
    partners[message.author.id].toplam += 1;
    savePartners();

    return message.reply(`✅ Bir partner daha eklendi! Toplam partner sayın: **${partners[message.author.id].toplam}**`);
  }

  // Kullanım: k!partner-durum
  if (command === 'partner-durum') {
    const kayit = partners[message.author.id];

    // Fotoğraftaki görünümü oluşturan Embed tasarımı
    const durumEmbed = new EmbedBuilder()
      .setColor('#6b21ff') // Sol kenardaki mor şerit
      .setAuthor({ 
        name: message.author.tag, 
        iconURL: message.author.displayAvatarURL({ dynamic: true }) 
      })
      .setTitle('Partnerlik Profili')
      .setDescription(
        `**Bugünlük Partnerin:** ${kayit.bugun}\n` +
        `**Haftalık Partnerin:** ${kayit.hafta}\n` +
        `**Aylık Partnerin:** ${kayit.ay}\n` +
        `**Toplam Partnerin:** ${kayit.toplam}\n` +
        `**Haftalık Sıralaman:** #1`
      )
      // Fotoğraftaki alt afiş kısmı (Kendi resminin linkini buraya koyabilirsin)
     .setImage('https://i.postimg.cc/bvrhKD14/70ba521c-e278-4697-9f02-33cea9a96121.jpg')
      .setTimestamp();

    return message.reply({ embeds: [durumEmbed] });
  }
});
// Bot Giriş İşlemi
client.login(process.env.DISCORD_TOKEN);
