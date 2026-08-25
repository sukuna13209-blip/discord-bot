const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
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

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration
    ]
});

// --- VERİTABANI YÖNETİMİ ---
let kartlar = [];
try { kartlar = JSON.parse(fs.readFileSync('./kartlar.json', 'utf8')); } catch (e) { console.log("⚠️ kartlar.json okunamadı!"); }

const PARTNER_FILE = './partners.json';
let partners = {};
if (fs.existsSync(PARTNER_FILE)) {
    try { partners = JSON.parse(fs.readFileSync(PARTNER_FILE, 'utf8')); } catch (e) { partners = {}; }
}
function savePartners() {
    fs.writeFileSync(PARTNER_FILE, JSON.stringify(partners, null, 2));
}

let ekonomi = {};
try { ekonomi = JSON.parse(fs.readFileSync('./ekonomi.json', 'utf8')); } catch (e) { ekonomi = {}; }
function ekonomiKaydet() {
    fs.writeFileSync('./ekonomi.json', JSON.stringify(ekonomi, null, 2));
}
function profilGetir(userId) {
    if (!ekonomi[userId]) {
        ekonomi[userId] = { bakiye: 1000, envanter: [] };
    }
    return ekonomi[userId];
}

// --- PARTNER RESİMLİ EMBED TASARIMI ---
function createPartnerEmbed(guild, user, data) {
    const guildIcon = guild ? guild.iconURL({ dynamic: true, size: 512 }) : null;
    return new EmbedBuilder()
        .setColor('#6b21ff')
        .setAuthor({ 
            name: user.tag, 
            iconURL: user.displayAvatarURL({ dynamic: true }) 
        })
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

// --- DENGELİ KART SEÇİMİ & MARKET ---
function rastgeleKartSec() {
    if (kartlar.length === 0) return null;
    const efsaneviler = kartlar.filter(k => k.sinif && (k.sinif.toLowerCase().includes('efsanevi') || k.sinif.toLowerCase().includes('legendary')));
    const nadirler = kartlar.filter(k => k.sinif && (k.sinif.toLowerCase().includes('nadir') || k.sinif.toLowerCase().includes('rare')));
    const normaller = kartlar.filter(k => !efsaneviler.includes(k) && !nadirler.includes(k));

    const sans = Math.random() * 100;
    if (sans < 60 && normaller.length > 0) return normaller[Math.floor(Math.random() * normaller.length)];
    else if (sans < 90 && nadirler.length > 0) return nadirler[Math.floor(Math.random() * nadirler.length)];
    else if (efsaneviler.length > 0) return efsaneviler[Math.floor(Math.random() * efsaneviler.length)];

    return kartlar[Math.floor(Math.random() * kartlar.length)];
}

let marketKartlari = [];
function marketiYenile() {
    if (kartlar.length === 0) return;
    marketKartlari = [];
    for (let i = 0; i < 3; i++) {
        const rastgele = rastgeleKartSec();
        if (!rastgele) continue;
        let fiyat = 500;
        const sinifKucuk = (rastgele.sinif || "").toLowerCase();
        if (sinifKucuk.includes('efsanevi') || sinifKucuk.includes('legendary')) fiyat = 4000;
        else if (sinifKucuk.includes('nadir') || sinifKucuk.includes('rare')) fiyat = 1500;
        else fiyat = 500;
        marketKartlari.push({ ...rastgele, fiyat });
    }
}
setInterval(marketiYenile, 3 * 60 * 60 * 1000);
marketiYenile();

// --- YARDIM MENÜSÜ ---
function yardimMenusuOlustur() {
    const embed = new EmbedBuilder()
        .setColor('#2F3136')
        .setTitle('🛡️ Kastuhino Bot — Kapsamlı Yardım & Kontrol Paneli')
        .setDescription('Kastuhino Bot komut rehberine hoş geldin.\n\n🔹 **Ön Ek:** `k!` veya `/`');

    const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('yardim_menu')
            .setPlaceholder('Menüden bir kategori seç...')
            .addOptions([
                { label: 'Moderatörlük Komutları', description: 'Sunucu yönetim araçları', value: 'mod_menu', emoji: '🛡️' },
                { label: 'Ekonomi ve Kart Koleksiyonu', description: 'Bakiye, market ve envanter', value: 'ekonomi_koleksiyon_menu', emoji: '💰' },
                { label: 'Eğlence ve Oyunlar', description: 'Gacha ve oyunlar', value: 'eglence_menu', emoji: '🎉' },
                { label: 'Bilgi Komutları', description: 'Partner ve bilgi', value: 'bilgi_menu', emoji: '📚' }
            ])
    );
    return { embeds: [embed], components: [row] };
}

// --- SLASH KOMUTLARI YÜKLEME ---
client.once('ready', async () => {
    console.log(`[✓] ${client.user.tag} başarıyla giriş yaptı!`);
    const commands = [
        new SlashCommandBuilder().setName('yardim').setDescription('Yardım panelini açar.'),
        new SlashCommandBuilder().setName('bakiye').setDescription('Cüzdanındaki Anime Cash miktarını gösterir.'),
        new SlashCommandBuilder().setName('gunluk').setDescription('Günlük Anime Cash ödülünü alırsın.'),
        new SlashCommandBuilder().setName('market').setDescription('3 saatte bir yenilenen kart marketini gösterir.'),
        new SlashCommandBuilder().setName('kart-al').setDescription('Marketten kart satın alır.').addIntegerOption(o => o.setName('no').setDescription('Market sırası (1-3)').setRequired(true)),
        new SlashCommandBuilder().setName('envanter').setDescription('Sahip olduğun kartları listeler.'),
        new SlashCommandBuilder().setName('gacha').setDescription('Şansına kutudan kart düşürür (300 Cash).'),
        new SlashCommandBuilder().setName('kart-bilgi').setDescription('Tüm kartları listeler.'),
        new SlashCommandBuilder().setName('partner-durum').setDescription('Partnerlik profili kartınızı gösterir.'),
        new SlashCommandBuilder().setName('sil').setDescription('Mesaj temizler.').setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages).addIntegerOption(opt => opt.setName('miktar').setDescription('Miktar').setRequired(true))
    ].map(command => command.toJSON());

    try {
        await client.application.commands.set(commands);
        console.log('✨ Tüm Slash komutları yüklendi.');
    } catch (e) { console.error(e); }
});

// --- KOMUT İŞLEME MERKEZİ ---
function komutIsle(isim, user, args = [], guild = null) {
    const embed = new EmbedBuilder().setTimestamp();
    const userProfil = profilGetir(user.id);

    if (!partners[user.id]) {
        partners[user.id] = { bugun: 0, hafta: 0, ay: 0, toplam: 0 };
    }

    if (isim === 'yardim') return yardimMenusuOlustur();

    if (isim === 'bakiye') {
        embed.setColor('#F1C40F').setTitle('💰 Cüzdan Durumu').setDescription(`${user}, cüzdanında **${userProfil.bakiye} Anime Cash** var!`);
        return { embeds: [embed] };
    }

    if (isim === 'gunluk') {
        userProfil.bakiye += 1000;
        ekonomiKaydet();
        embed.setColor('#2ECC71').setTitle('🎁 Günlük Ödül').setDescription(`${user}, günlük **1000 Anime Cash** ödülün cüzdanına eklendi!`);
        return { embeds: [embed] };
    }

    if (isim === 'market') {
        if (marketKartlari.length === 0) return { content: "Markette şu an kart yok." };
        embed.setColor('#9B59B6').setTitle('🛒 Kastuhino Kart Marketi').setDescription('Satıştaki kartlar (`k!al <1-3>`):');
        marketKartlari.forEach((k, idx) => {
            embed.addFields({ name: `${idx + 1}. ${k.isim} (${k.sinif || 'Standart'})`, value: `Fiyat: **${k.fiyat} Cash**\n[Görsel](${k.gorsel_link})`, inline: false });
        });
        return { embeds: [embed] };
    }

    if (isim === 'kart-al' || isim === 'al') {
        const secim = parseInt(args[0]) - 1;
        if (isNaN(secim) || secim < 0 || secim >= marketKartlari.length) return { content: "Geçerli bir sıra belirt! Örnek: `k!al 1`" };
        const alinacak = marketKartlari[secim];
        if (userProfil.bakiye < alinacak.fiyat) return { content: `Yeterli paran yok! Gereken: **${alinacak.fiyat}**` };

        userProfil.bakiye -= alinacak.fiyat;
        userProfil.envanter.push(alinacak);
        ekonomiKaydet();

        embed.setColor('#2ECC71').setTitle('🎉 Satın Alındı!').setDescription(`${user}, **${alinacak.isim}** kartını başarıyla aldın!`);
        return { embeds: [embed] };
    }

    if (isim === 'envanter') {
        if (userProfil.envanter.length === 0) return { content: "Envanterin boş. `k!market` veya `k!gacha` kullanabilirsin." };
        embed.setColor('#3498DB').setTitle(`🎒 ${user.username} - Envanter`);
        userProfil.envanter.forEach((k, idx) => {
            embed.addFields({ name: `${idx + 1}. ${k.isim}`, value: `Sınıf: ${k.sinif || 'Standart'}`, inline: true });
        });
        return { embeds: [embed] };
    }

    if (isim === 'gacha' || isim === 'kart-cek') {
        if (userProfil.bakiye < 300) return { content: "Gacha çevirmek için 300 Cash gerekiyor!" };
        userProfil.bakiye -= 300;
        const secilen = rastgeleKartSec();
        if (!secilen) return { content: "Veritabanında kart bulunamadı." };
        userProfil.envanter.push(secilen);
        ekonomiKaydet();

        embed.setColor('#3498DB').setTitle(`🎴 Gacha Çekilişi — ${secilen.isim}`).setDescription(`Sınıf: ${secilen.sinif || 'Standart'}`).setImage(secilen.gorsel_link);
        return { embeds: [embed] };
    }

    if (isim === 'kart-bilgi') {
        if (kartlar.length === 0) return { content: "Veritabanında kart yok." };
        embed.setColor('#F1C40F').setTitle('🃏 Tüm Kartlar');
        kartlar.forEach((k, i) => embed.addFields({ name: `${i + 1}. ${k.isim}`, value: `Sınıf: ${k.sinif || 'Standart'}`, inline: false }));
        return { embeds: [embed] };
    }

    if (isim === 'partner-durum') {
        return { embeds: [createPartnerEmbed(guild, user, partners[user.id])] };
    }
}

// --- ETKİLEŞİM YÖNETİMİ ---
client.on('interactionCreate', async interaction => {
    if (interaction.isStringSelectMenu() && interaction.customId === 'yardim_menu') {
        const secim = interaction.values[0];
        const resEmbed = new EmbedBuilder().setColor('#3498DB');
        if (secim === 'mod_menu') resEmbed.setTitle('🛡️ Moderatörlük').setDescription('• `k!ban`, `k!kick`, `k!sustur`, `k!sil`');
        else if (secim === 'ekonomi_koleksiyon_menu') resEmbed.setTitle('💰 Ekonomi').setDescription('• `k!bakiye`, `k!gunluk`, `k!market`, `k!al`, `k!envanter`, `k!gacha`');
        else if (secim === 'eglence_menu') resEmbed.setTitle('🎉 Eğlence').setDescription('• `k!gacha` - Şansına kart düşür');
        else if (secim === 'bilgi_menu') resEmbed.setTitle('📚 Bilgi').setDescription('• `k!kart-bilgi`, `k!partner-durum`, `k!yardim`');
        return interaction.update({ embeds: [resEmbed], components: interaction.message.components });
    }

    if (!interaction.isChatInputCommand()) return;
    const { commandName } = interaction;

    if (commandName === 'sil') {
        const miktar = interaction.options.getInteger('miktar');
        await interaction.channel.bulkDelete(miktar, true).catch(() => {});
        return interaction.reply({ content: `${miktar} adet mesaj silindi!`, ephemeral: true });
    }

    const sonuc = komutIsle(commandName, interaction.user, [interaction.options.getInteger('no')], interaction.guild);
    if (sonuc) await interaction.reply(sonuc);
});

// --- MESAJ KOMUTLARI VE OTOMATİK PARTNER SAYAÇ ---
client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    if (!partners[message.author.id]) {
        partners[message.author.id] = { bugun: 0, hafta: 0, ay: 0, toplam: 0 };
    }

    // Otomatik Partner Sayma
    if (message.channel.id === PARTNER_KANAL_ID) {
        if (message.content.includes('discord.gg/') || message.content.includes('discord.com/invite/')) {
            partners[message.author.id].bugun += 1;
            partners[message.author.id].hafta += 1;
            partners[message.author.id].ay += 1;
            partners[message.author.id].toplam += 1;
            savePartners();

            const embed = createPartnerEmbed(message.guild, message.author, partners[message.author.id]);
            return message.reply({ content: '✅ Partnerlik başarıyla sayıldı!', embeds: [embed] });
        }
    }

    // Moderatörlük Prefix Komutları
    if (message.content.startsWith('k!sustur')) {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return message.reply('Yetkin yok.');
        const target = message.mentions.members.first();
        if (!target) return message.reply('Üye etiketle!');
        await target.timeout(10 * 60 * 1000, 'k!sustur').catch(() => {});
        return message.reply(`✅ **${target.user.tag}** susturuldu.`);
    }

    if (message.content.startsWith('k!kick')) {
        if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) return message.reply('Yetkin yok.');
        const target = message.mentions.members.first();
        if (!target) return message.reply('Üye etiketle!');
        await target.kick().catch(() => {});
        return message.reply(`✅ **${target.user.tag}** atıldı.`);
    }

    if (message.content.startsWith('k!ban')) {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) return message.reply('Yetkin yok.');
        const target = message.mentions.members.first();
        if (!target) return message.reply('Üye etiketle!');
        await target.ban().catch(() => {});
        return message.reply(`✅ **${target.user.tag}** yasaklandı.`);
    }

    if (!message.content.startsWith('k!')) return;

    const parts = message.content.slice(2).trim().split(/\s+/);
    const cmd = parts[0];
    const arg1 = parts[1];

    let islenen = cmd;
    if (cmd === 'kart' && arg1 === 'çek') islenen = 'gacha';
    if (cmd === 'kart' && arg1 === 'bilgi') islenen = 'kart-bilgi';
    if (cmd === 'partner' && arg1 === 'durum') islenen = 'partner-durum';

    const sonuc = komutIsle(islenen, message.author, [arg1], message.guild);
    if (sonuc) await message.reply(sonuc);
});

client.login(process.env.DISCORD_TOKEN || process.env.TOKEN);
