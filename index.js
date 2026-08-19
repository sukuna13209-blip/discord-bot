// Kastuhino Bot - Tek Dosya Sürümü (index.js)
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ]
});

// Partner Veritabanı Dosyası
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

client.once('ready', () => {
    console.log(`${client.user.tag} hazır.`);
});

// Komutlar ve Diğer Mantıksal Kodlar
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'ban') {
        const user = interaction.options.getUser('kullanici');
        const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi';
        if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return interaction.reply({ content: 'Bu komutu kullanmak için yetkin yok!', ephemeral: true });
        }
        await interaction.guild.members.ban(user, { reason });
        await interaction.reply(`${user.tag} başarıyla banlandı! Sebep: ${reason}`);
    } 
    else if (commandName === 'kick') {
        const user = interaction.options.getUser('kullanici');
        const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi';
        if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
            return interaction.reply({ content: 'Bu komutu kullanmak için yetkin yok!', ephemeral: true });
        }
        await interaction.guild.members.kick(user, { reason });
        await interaction.reply(`${user.tag} başarıyla sunucudan atıldı! Sebep: ${reason}`);
    }
    else if (commandName === 'temizle') {
        const miktar = interaction.options.getInteger('miktar');
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({ content: 'Bu komutu kullanmak için yetkin yok!', ephemeral: true });
        }
        await interaction.channel.bulkDelete(miktar, true).catch(err => {
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

// Botu Başlat (Token'ını Replit'ten veya Koyeb Environment Variables kısmından alacak)
client.login(process.env.DISCORD_TOKEN);
