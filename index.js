const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');

// Komut içinde veya etkileşimde:
const embed = new EmbedBuilder()
    .setColor('#2b2d31')
    .setTitle('🛡️ Kastuhino Bot — Kontrol Paneli')
    .setDescription(`Merhaba **${message.author.username}**, komut rehberine hoş geldin.\nAşağıdaki kategorilerden birini seçerek komutları görüntüleyebilir veya prefix komutlarını kullanabilirsin.`);

// 1. Satır: Komutlar Butonları
const rowKomutlar = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('eglence').setLabel('Eğlence').setEmoji('🐱').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('kullanici').setLabel('Kullanıcı').setEmoji('🔔').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ekonomi').setLabel('Ekonomi ve Gacha').setEmoji('💰').setStyle(ButtonStyle.Secondary)
);

// 2. Satır: Sistemler Butonları
const rowSistemler = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('otomatik_mod').setLabel('Otomatik Mod').setEmoji('🛠️').setStyle(ButtonStyle.Secondary)
);

// 3. Satır: Seçim Menüsü (Dropdown)
const rowSelect = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
        .setCustomId('yardim_kategori_sec')
        .setPlaceholder('Bir kategori seçin...')
        .addOptions([
            { label: 'Eğlence', value: 'eglence', emoji: '🐱' },
            { label: 'Kullanıcı', value: 'kullanici', emoji: '🔔' },
            { label: 'Ekonomi ve Gacha', value: 'ekonomi', emoji: '💰' },
            { label: 'Otomatik Mod', value: 'otomatik_mod', emoji: '🛠️' }
        ])
);

// Mesajı gönderme
await message.reply({ 
    embeds: [embed], 
    components: [rowKomutlar, rowSistemler, rowSelect] 
});
