const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const http = require('http');

// --- RENDER UPTIME SUNUCUSU ---
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Kastuhino Bot Aktif ve Çalışıyor!\n');
});
server.listen(process.env.PORT || 3000);

// --- SABİT AYARLAR ---
const PARTNER_KANAL_ID = '1514756158831988876'; // Otomatik partner algılama kanalı

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration
    ]
});

// --- GÜVENLİ VERİTABANI YÖNETİMİ ---
const PARTNER_FILE = './partners.json';
const EKONOMI_FILE = './ekonomi.json';
const KARTLAR_FILE = './kartlar.json';

let partners = {};
if (fs.existsSync(PARTNER_FILE)) {
    try { partners = JSON.parse(fs.readFileSync(PARTNER_FILE, 'utf8')); } catch (e) { partners = {}; }
}
function savePartners() {
    fs.writeFileSync(PARTNER_FILE, JSON.stringify(partners, null, 2));
}

let ekonomi = {};
if (fs.existsSync(EKONOMI_FILE)) {
    try { ekonomi = JSON.parse(fs.readFileSync(EKONOMI_FILE, 'utf8')); } catch (e) { ekonomi = {}; }
}
function ekonomiKaydet() {
    fs.writeFileSync(EKONOMI_FILE, JSON.stringify(ekonomi, null, 2));
}
function profilGetir(userId) {
    if (!ekonomi[userId]) {
        ekonomi[userId] = { bakiye: 1000, envanter: [] };
    }
    return ekonomi[userId];
}

let kartlar = [];
if (fs.existsSync(KARTLAR_FILE)) {
    try { kartlar = JSON.parse(fs.readFileSync(KARTLAR_FILE, 'utf8')); } catch (e) { kartlar = []; }
}

// --- PROFESYONEL PARTNER RESİMLİ EMBED TASARIMI ---
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
        .setImage('https://i.postimg.cc/bvrhKD14/70ba521c-e278-4697-9f02-33cea9a96121.jpg') // Alt: Büyük Afiş
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

// --- GELİŞMİŞ YARDIM MENÜSÜ TASARIMI ---
function yardimMenusuOlustur() {
    const embed = new EmbedBuilder()
        .setColor('#2F3136')
        .setTitle('🛡️ Kastuhino Bot — Profesyonel Kontrol Paneli')
        .setDescription('Kastuhino Bot komut rehberine hoş geldin.\n\n🔹 **Prefix (Ön Ek):** `k!` veya `/`\n🔹 **Özellikler:** Otomatik Partner Sayacı, Anime Kart Koleksiyonu, Gelişmiş Ekonomi ve Moderasyon.\n\nAşağıdaki menüden dilediğin kategoriyi seçebilirsin.');

    const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('yardim_menu')
            .setPlaceholder('📂 Bir kategori seçin...')
            .addOptions([
                { label: 'Moderatörlük Komutları', description: 'Sunucu yönetim ve güvenlik araçları', value: 'mod_menu', emoji: '🛡️' },
                { label: 'Ekonomi & Kart Sistemi', description: 'Bakiye, günlük ödül, market ve gacha', value: 'ekonomi_koleksiyon_menu', emoji: '💰' },
                { label: 'Partner Sistemleri', description: 'Otomatik partner sayacı ve durum bilgisi', value: 'partner_menu', emoji: '🤝' },
                { label: 'Bilgi & Eğlence', description: 'Yardım ve koleksiyon listesi', value: 'bilgi_menu', emoji: '📚' }
            ])
    );
    return { embeds: [embed], components: [row] };
}

// --- BOT HAZIR OLDUĞUNDA SLASH KOMUTLARI KAYDI ---
client.once('ready', async () => {
    console.log(`[✓] ${client.user.tag} aktif ve operasyonel!`);
    const commands = [
        new SlashCommandBuilder().setName('yardim').setDescription('Profesyonel yardım panelini açar.'),
        new SlashCommandBuilder().setName('bakiye').setDescription('Cüzdanındaki Anime Cash miktarını gösterir.'),
        new SlashCommandBuilder().setName('gunluk').setDescription('Günlük Anime Cash ödülünü alırsın.'),
        new SlashCommandBuilder().setName('market').setDescription('3 saatte bir yenilenen kart marketini gösterir.'),
        new SlashCommandBuilder().setName('kart-al').setDescription('Marketten kart satın alır.').addIntegerOption(o => o.setName('no').setDescription('Market sırası (1-3)').setRequired(true)),
        new SlashCommandBuilder().setName('envanter').setDescription('Sahip olduğun kartları listeler.'),
        new SlashCommandBuilder().setName('gacha').setDescription('Şansına kutudan kart düşürür (300 Cash).'),
        new SlashCommandBuilder().setName('kart-bilgi').setDescription('Veritabanındaki tüm kartları listeler.'),
        new SlashCommandBuilder().setName('partner-durum').setDescription('Partnerlik profili kartınızı gösterir.'),
        new SlashCommandBuilder().setName('sil').setDescription('Belirtilen miktarda mesajı temizler.').setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages).addIntegerOption(opt => opt.setName('miktar').setDescription('Silinecek miktar').setRequired(true))
    ].map(command => command.toJSON());

    try {
        await client.application.commands.set(commands);
        console.log('✨ Tüm Slash (/) komutları Discord\'a başarıyla senkronize edildi.');
    } catch (e) { console.error('Slash komut yükleme hatası:', e); }
});

// --- MERKEZİ KOMUT İŞLEME MOTORU ---
function komutIsle(isim, user, args = [], guild = null) {
    const embed = new EmbedBuilder().setTimestamp();
    const userProfil = profilGetir(user.id);

    if (!partners[user.id]) {
        partners[user.id] = { bugun: 0, hafta: 0, ay: 0, toplam: 0 };
    }

    if (isim === 'yardim') return yardimMenusuOlustur();

    if (isim === 'bakiye') {
        embed.setColor('#F1C40F').setTitle('💰 Cüzdan Durumu').setDescription(`${user}, cüzdanında toplam **${userProfil.bakiye} Anime Cash** bulunuyor! 🌸`);
        return { embeds: [embed] };
    }

    if (isim === 'gunluk') {
        userProfil.bakiye += 1000;
        ekonomiKaydet();
        embed.setColor('#2ECC71').setTitle('🎁 Günlük Ödül Alındı').setDescription(`${user}, günlük **1000 Anime Cash** ödülün cüzdanına eklendi!`);
        return { embeds: [embed] };
    }

    if (isim === 'market') {
        if (marketKartlari.length === 0) return { content: "🛒 Şu an markette aktif kart kalmadı, lütfen daha sonra tekrar dene." };
        embed.setColor('#9B59B6').setTitle('🛒 Kastuhino | Kart Marketi').setDescription('Satıştaki güncel kartlar (Satın almak için `k!al <1-3>` yazabilirsin):');
        marketKartlari.forEach((k, idx) => {
            embed.addFields({ name: `${idx + 1}. ${k.isim} (${k.sinif || 'Standart'})`, value: `Fiyat: **${k.fiyat} Anime Cash**\n[Görseli Görüntüle](${k.gorsel_link})`, inline: false });
        });
        return { embeds: [embed] };
    }

    if (isim === 'kart-al' || isim === 'al') {
        const secim = parseInt(args[0]) - 1;
        if (isNaN(secim) || secim < 0 || secim >= marketKartlari.length) return { content: "⚠️ Geçerli bir market numarası belirtmelisin! Örnek: `k!al 1`" };
        const alinacak = marketKartlari[secim];
        if (userProfil.bakiye < alinacak.fiyat) return { content: `⚠️ Yeterli Anime Cash'in yok! Gereken: **${alinacak.fiyat}**, Senin paran: **${userProfil.bakiye}**` };

        userProfil.bakiye -= alinacak.fiyat;
        userProfil.envanter.push(alinacak);
        ekonomiKaydet();

        embed.setColor('#2ECC71').setTitle('🎉 Kart Satın Alındı!').setDescription(`${user}, marketten başarıyla **${alinacak.isim}** kartını satın aldın!`);
        return { embeds: [embed] };
    }

    if (isim === 'envanter') {
        if (userProfil.envanter.length === 0) return { content: "🎒 Envanterinde henüz hiç kart yok! `k!market` veya `k!gacha` ile kart edinebilirsin." };
        embed.setColor('#3498DB').setTitle(`🎒 ${user.username} — Kart Envanteri`).setDescription('Sahip olduğun koleksiyon parçaları:');
        userProfil.envanter.forEach((k, idx) => {
            embed.addFields({ name: `${idx + 1}. ${k.isim}`, value: `Sınıf: **${k.sinif || 'Standart'}**`, inline: true });
        });
        return { embeds: [embed] };
    }

    if (isim === 'gacha' || isim === 'kart-cek') {
        if (userProfil.bakiye < 300) return { content: "⚠️ Gacha çevirmek için en az **300 Anime Cash** gerekiyor!" };
        userProfil.bakiye -= 300;
        const secilen = rastgeleKartSec();
        if (!secilen) return { content: "⚠️ Veritabanında (`kartlar.json`) hiç kart bulunmuyor." };
        userProfil.envanter.push(secilen);
        ekonomiKaydet();

        embed.setColor('#3498DB')
             .setTitle(`🎴 Gacha Çekilişi — ${secilen.isim}`)
             .setDescription(`300 Cash harcadın ve yeni kart kazandın!\n**Sınıfı:** ${secilen.sinif || 'Standart'}`)
             .setImage(secilen.gorsel_link)
             .setFooter({ text: `${user.username} tarafından çekildi. Kalan Bakiye: ${userProfil.bakiye} Cash` });
        return { embeds: [embed] };
    }

    if (isim === 'kart-bilgi') {
        if (kartlar.length === 0) return { content: "⚠️ Veritabanında kayıtlı kart bulunmuyor." };
        embed.setColor('#F1C40F').setTitle('🃏 Veritabanındaki Tüm Kartlar');
        kartlar.forEach((k, i) => embed.addFields({ name: `${i + 1}. ${k.isim}`, value: `Sınıf: **${k.sinif || 'Standart'}**`, inline: false }));
        return { embeds: [embed] };
    }

    if (isim === 'partner-durum') {
        return { embeds: [createPartnerEmbed(guild, user, partners[user.id])] };
    }
}

// --- ETKİLEŞİM YÖNETİMİ (Select Menu ve Slash) ---
client.on('interactionCreate', async interaction => {
    if (interaction.isStringSelectMenu() && interaction.customId === 'yardim_menu') {
        const secim = interaction.values[0];
        const resEmbed = new EmbedBuilder().setColor('#3498DB').setTimestamp();

        if (secim === 'mod_menu') {
            resEmbed.setTitle('🛡️ Moderatörlük Komutları').setDescription('• `k!ban` - Üyeyi yasaklar\n• `k!kick` - Üyeyi atar\n• `k!sustur` - Üyeyi zaman aşımına uğratır\n• `k!sil` veya `/sil` - Belirtilen miktarda mesajı siler');
        } else if (secim === 'ekonomi_koleksiyon_menu') {
            resEmbed.setTitle('💰 Ekonomi ve Kart Sistemi').setDescription('• `k!bakiye` - Cüzdanını gösterir\n• `k!gunluk` - Günlük 1000 Cash verir\n• `k!market` - Kart marketini açar\n• `k!al <no>` - Marketten kart alır\n• `k!envanter` - Kartlarını listeler\n• `k!gacha` - Şansına kart düşürür (300 Cash)');
        } else if (secim === 'partner_menu') {
            resEmbed.setTitle('🤝 Partner Sistemleri').setDescription('• `k!partner-durum` veya `/partner-durum` - Resimli partnerlik profilini gösterir\n• Otomatik Algılama: Partner kanalında `https://discord.gg` paylaşım yapıldığında anında sayılır.');
        } else if (secim === 'bilgi_menu') {
            resEmbed.setTitle('📚 Bilgi ve Koleksiyon').setDescription('• `k!kart-bilgi` - Tüm kartları listeler\n• `k!yardim` - Yardım menüsünü açar');
        }

        return interaction.update({ embeds: [resEmbed], components: interaction.message.components });
    }

    if (!interaction.isChatInputCommand()) return;
    const { commandName } = interaction;

    if (commandName === 'sil') {
        const miktar = interaction.options.getInteger('miktar');
        await interaction.channel.bulkDelete(miktar, true).catch(() => {});
        return interaction.reply({ content: `✅ Başarıyla **${miktar}** adet mesaj silindi!`, ephemeral: true });
    }

    const sonuc = komutIsle(commandName, interaction.user, [interaction.options.getInteger('no')], interaction.guild);
    if (sonuc) await interaction.reply(sonuc);
});

// --- MESAJLAR VE OTOMATİK PARTNER SAYAÇ MOTORU ---
client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    if (!partners[message.author.id]) {
        partners[message.author.id] = { bugun: 0, hafta: 0, ay: 0, toplam: 0 };
    }

    // 1. KESİN ÇALIŞAN OTOMATİK PARTNER ALGILAMA & SAYMA
    if (message.channel.id === PARTNER_KANAL_ID) {
        const text = message.content.toLowerCase();
        // Kullanıcının belirttiği gibi https://discord.gg veya discord.gg/ geçtiğinde anında tetiklenir
        if (text.includes('https://discord.gg') || text.includes('discord.gg/')) {
            partners[message.author.id].bugun += 1;
            partners[message.author.id].hafta += 1;
            partners[message.author.id].ay += 1;
            partners[message.author.id].toplam += 1;
            savePartners();

            const embed = createPartnerEmbed(message.guild, message.author, partners[message.author.id]);
            return message.reply({ content: '✅ **Partnerlik başarıyla sayıldı!**', embeds: [embed] });
        }
    }

    // 2. MODERATÖRLÜK PREFIX KOMUTLARI
    if (message.content.startsWith('k!sustur')) {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return message.reply('⚠️ Bu komutu kullanmak için yetkin yok.');
        const target = message.mentions.members.first();
        if (!target) return message.reply('⚠️ Lütfen susturulacak üyeyi etiketleyin!');
        await target.timeout(10 * 60 * 1000, 'k!sustur komutu').catch(() => {});
        return message.reply(`✅ **${target.user.tag}** 10 dakika süreyle susturuldu.`);
    }

    if (message.content.startsWith('k!kick')) {
        if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) return message.reply('⚠️ Bu komutu kullanmak için yetkin yok.');
        const target = message.mentions.members.first();
        if (!target) return message.reply('⚠️ Lütfen sunucudan atılacak üyeyi etiketleyin!');
        await target.kick('k!kick komutu').catch(() => {});
        return message.reply(`✅ **${target.user.tag}** sunucudan atıldı.`);
    }

    if (message.content.startsWith('k!ban')) {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) return message.reply('⚠️ Bu komutu kullanmak için yetkin yok.');
        const target = message.mentions.members.first();
        if (!target) return message.reply('⚠️ Lütfen yasaklanacak üyeyi etiketleyin!');
        await target.ban({ reason: 'k!ban komutu' }).catch(() => {});
        return message.reply(`✅ **${target.user.tag}** sunucudan yasaklandı.`);
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

// --- BOT GİRİŞİ ---
client.login(process.env.DISCORD_TOKEN || process.env.TOKEN);
