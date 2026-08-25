const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, REST, Routes, SlashCommandBuilder } = require('discord.js');
const fs = require('fs');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// --- VERİTABANI YÖNETİMİ ---
let kartlar = [];
try { kartlar = JSON.parse(fs.readFileSync('./kartlar.json', 'utf8')); } catch (e) { }

let partnerler = [];
try { partnerler = JSON.parse(fs.readFileSync('./partners.json', 'utf8')); } catch (e) { }

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

// --- DENGELİ KART SEÇİMİ ---
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

// --- MARKET SİSTEMİ ---
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

// --- SLASH KOMUTLARI ---
const commands = [
    new SlashCommandBuilder().setName('yardim').setDescription('Yardım panelini açar.'),
    new SlashCommandBuilder().setName('bakiye').setDescription('Cüzdanındaki Anime Cash miktarını gösterir.'),
    new SlashCommandBuilder().setName('gunluk').setDescription('Günlük Anime Cash ödülünü alırsın.'),
    new SlashCommandBuilder().setName('market').setDescription('3 saatte bir yenilenen kart marketini gösterir.'),
    new SlashCommandBuilder().setName('kart-al').setDescription('Marketten kart satın alır.').addIntegerOption(o => o.setName('no').setDescription('Market sırası').setRequired(true)),
    new SlashCommandBuilder().setName('envanter').setDescription('Sahip olduğun kartları listeler.'),
    new SlashCommandBuilder().setName('gacha').setDescription('Şansına kutudan kart düşürür (300 Cash).'),
    new SlashCommandBuilder().setName('kart-bilgi').setDescription('Tüm kartları listeler.'),
    new SlashCommandBuilder().setName('partner').setDescription('Partner sunucuları gösterir.')
].map(command => command.toJSON());

client.on('ready', async () => {
    console.log(`${client.user.tag} aktif!`);
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    } catch (e) { }
});

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

// --- KOMUT İŞLEME ---
function komutIsle(isim, user, args = []) {
    const embed = new EmbedBuilder().setTimestamp();
    const userProfil = profilGetir(user.id);

    if (isim === 'yardim') return yardimMenusuOlustur();

    if (isim === 'bakiye') {
        embed.setColor('#F1C40F').setTitle('💰 Cüzdan Durumu').setDescription(`${user}, cüzdanında **${userProfil.bakiye} Anime Cash** var!`);
        return { embeds: [embed] };
    }

    if (isim === 'gunluk') {
        userProfil.bakiye += 1000;
        ekonomiKaydet();
        embed.setColor('#2ECC71').setTitle('🎁 Günlük Ödül').setDescription(`${user}, günlük **1000 Anime Cash** ödülün eklendi!`);
        return { embeds: [embed] };
    }

    if (isim === 'market') {
        if (marketKartlari.length === 0) return { content: "Markette şu an kart yok." };
        embed.setColor('#9B59B6').setTitle('🛒 Kastuhino Kart Marketi').setDescription('Satıştaki kartlar (`k!al <1-3>`):');
        marketKartlari.forEach((k, idx) => {
            embed.addFields({ name: `${idx + 1}. ${k.isim} (${k.sinif})`, value: `Fiyat: **${k.fiyat} Cash**\n[Görsel](${k.gorsel_link})`, inline: false });
        });
        return { embeds: [embed] };
    }

    if (isim === 'kart-al' || isim === 'al') {
        const secim = parseInt(args[0]) - 1;
        if (isNaN(secim) || secim < 0 || secim >= marketKartlari.length) return { content: "Geçerli bir sıra belirt!" };
        const alinacak = marketKartlari[secim];
        if (userProfil.bakiye < alinacak.fiyat) return { content: "Yeterli paran yok!" };

        userProfil.bakiye -= alinacak.fiyat;
        userProfil.envanter.push(alinacak);
        ekonomiKaydet();

        embed.setColor('#2ECC71').setTitle('🎉 Satın Alındı!').setDescription(`${user}, **${alinacak.isim}** kartını aldın!`);
        return { embeds: [embed] };
    }

    if (isim === 'envanter') {
        if (userProfil.envanter.length === 0) return { content: "Envanterin boş." };
        embed.setColor('#3498DB').setTitle(`🎒 ${user.username} - Envanter`);
        userProfil.envanter.forEach((k, idx) => {
            embed.addFields({ name: `${idx + 1}. ${k.isim}`, value: `Sınıf: ${k.sinif}`, inline: true });
        });
        return { embeds: [embed] };
    }

    if (isim === 'gacha' || isim === 'kart-cek') {
        if (userProfil.bakiye < 300) return { content: "300 Cash gerekiyor!" };
        userProfil.bakiye -= 300;
        const secilen = rastgeleKartSec();
        if (!secilen) return { content: "Kart bulunamadı." };
        userProfil.envanter.push(secilen);
        ekonomiKaydet();

        embed.setColor('#3498DB').setTitle(`🎴 Gacha — ${secilen.isim}`).setDescription(`Sınıf: ${secilen.sinif}`).setImage(secilen.gorsel_link);
        return { embeds: [embed] };
    }

    if (isim === 'kart-bilgi') {
        embed.setColor('#F1C40F').setTitle('🃏 Tüm Kartlar');
        kartlar.forEach((k, i) => embed.addFields({ name: `${i + 1}. ${k.isim}`, value: `Sınıf: ${k.sinif}`, inline: false }));
        return { embeds: [embed] };
    }

    if (isim === 'partner') {
        try {
            const pListe = JSON.parse(fs.readFileSync('./partners.json', 'utf8'));
            if (!pListe || pListe.length === 0) return { content: "Partner bulunmuyor." };
            const p = pListe[0];
            
            embed.setColor('#2F3136')
                 .setTitle(`🤝 Partner Sunucu: ${p.isim || "Kastuhino"}`)
                 .setDescription(`🔗 **Davet Linki:** [Buraya Tıkla](${p.link || 'https://discord.com'})`)
                 .setThumbnail(p.pp || null)
                 .setImage(p.afis || null);
            return { embeds: [embed] };
        } catch (e) {
            return { content: "Partnerler yüklenirken hata oluştu." };
        }
    }
}

client.on('interactionCreate', async interaction => {
    if (interaction.isStringSelectMenu() && interaction.customId === 'yardim_menu') {
        const secim = interaction.values[0];
        const resEmbed = new EmbedBuilder().setColor('#3498DB');
        if (secim === 'mod_menu') resEmbed.setTitle('🛡️ Moderatörlük').setDescription('• `k!ban`, `k!kick`, `k!mute`, `k!temizle`');
        else if (secim === 'ekonomi_koleksiyon_menu') resEmbed.setTitle('💰 Ekonomi').setDescription('• `k!bakiye`, `k!gunluk`, `k!market`, `k!al`, `k!envanter`, `k!gacha`');
        else if (secim === 'eglence_menu') resEmbed.setTitle('🎉 Eğlence').setDescription('• `k!gacha`, `k!anime-tahmin`');
        else if (secim === 'bilgi_menu') resEmbed.setTitle('📚 Bilgi').setDescription('• `k!kart-bilgi`, `k!partner`, `k!yardim`');
        return interaction.update({ embeds: [resEmbed], components: interaction.message.components });
    }

    if (!interaction.isChatInputCommand()) return;
    const sonuc = komutIsle(interaction.commandName, interaction.user, [interaction.options.getInteger('no')]);
    if (sonuc) await interaction.reply(sonuc);
});

client.on('messageCreate', async message => {
    if (message.author.bot || !message.content.startsWith('k!')) return;
    const parts = message.content.slice(2).trim().split(/\s+/);
    const cmd = parts[0];
    const arg1 = parts[1];

    let islenen = cmd;
    if (cmd === 'kart' && arg1 === 'çek') islenen = 'gacha';
    if (cmd === 'kart' && arg1 === 'bilgi') islenen = 'kart-bilgi';

    const sonuc = komutIsle(islenen, message.author, [arg1]);
    if (sonuc) await message.reply(sonuc);
});

client.login(process.env.TOKEN);
