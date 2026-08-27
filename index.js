const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const PREFIX = 'k!';

client.once('ready', () => {
    console.log(`Bot aktif: ${client.user.tag}`);
});

// 1. Normal Prefix Komutları (Diğer komutların burada çalışır)
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // k!yardim Komutu
    if (command === 'yardim' || command === 'yardım') {
        const embed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle('🛡️ Kastuhino Bot — Kontrol Paneli')
            .setDescription(`Merhaba **${message.author.username}**, komut rehberine hoş geldin.\nAşağıdaki kategorilerden birini seçerek komutları görüntüleyebilir veya prefix komutlarını kullanabilirsin.`);

        const rowKomutlar = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('eglence').setLabel('Eğlence').setEmoji('🐱').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('kullanici').setLabel('Kullanıcı').setEmoji('🔔').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('ekonomi').setLabel('Ekonomi ve Gacha').setEmoji('💰').setStyle(ButtonStyle.Secondary)
        );

        const rowSistemler = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('otomatik_mod').setLabel('Otomatik Mod').setEmoji('🛠️').setStyle(ButtonStyle.Secondary)
        );

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

        return message.reply({ 
            embeds: [embed], 
            components: [rowKomutlar, rowSistemler, rowSelect] 
        });
    }

    // Diğer mevcut komutların buraya ekli kalmaya devam edebilir
});

// 2. Buton ve Menü Etkileşimleri (Yardım menüsünün çalışmasını sağlar)
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

    const choice = interaction.customId || interaction.values?.[0];

    if (choice === 'eglence') {
        await interaction.update({
            content: '🐱 **Eğlence**\n`k!1vs1`, `k!ship`, `k!fakemesaj`',
            components: interaction.message.components
        });
    } else if (choice === 'kullanici') {
        await interaction.update({
            content: '🔔 **Kullanıcı**\n`k!afk`, `k!avatar`, `k!kullanicibilgi`',
            components: interaction.message.components
        });
    } else if (choice === 'ekonomi') {
        await interaction.update({
            content: '💰 **Ekonomi ve Gacha**\n`k!bakiye`, `k!günlük`, `k!market`, `k!al`, `k!gacha`, `k!envanter`',
            components: interaction.message.components
        });
    } else if (choice === 'otomatik_mod') {
        await interaction.update({
            content: '🛠️ **Otomatik Mod**\n`k!reklamengel`, `k!küfürengel`, `k!linkengel`, `k!capsengel`',
            components: interaction.message.components
        });
    }
});

client.login('TOKENIN_BURAYA');
