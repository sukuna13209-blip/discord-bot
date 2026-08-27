const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const http = require('http');

// --- RENDER UPTIME SUNUCUSU ---
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Kastuhino Bot Aktif!\n');
});
server.listen(process.env.PORT || 3000);

// --- SABİT AYARLAR ---
const PARTNER_KANAL_ID = '1514756158831988876'; 
const PREFIX = 'k!';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildWebhooks
    ]
});

// --- GÜVENLİ VERİTABANI YÖNETİMİ ---
const PARTNER_FILE = './partners.json';
const EKONOMI_FILE = './ekonomi.json';
const KARTLAR_FILE = './kartlar.json';
const AYARLAR_FILE = './ayarlar.json';
const AFK_FILE = './afk.json';

let partners = {};
let ekonomi = {};
let kartlar = [
    { isim: "Monkey D. Luffy", sinif: "Efsanevi", gorsel_link: "https://i.imgur.com/8Q965aB.png" },
    { isim: "Roronoa Zoro", sinif: "Nadir", gorsel_link: "https://i.imgur.com/8Q965aB.png" },
    { isim: "Naruto Uzumaki", sinif: "Efsanevi", gorsel_link: "https://i.imgur.com/8Q965aB.png" },
    { isim: "Tanjiro Kamado", sinif: "Standart", gorsel_link: "https://i.imgur.com/8Q965aB.png" }
];
let ayarlar = { kufurEngel: false, reklamEngel: false, linkEngel: false, capsEngel: false };
let afkVeri = {};
let marketKartlari = [];

function veriYukle() {
    if (fs.existsSync(PARTNER_FILE)) try { partners = JSON.parse(fs.readFileSync(PARTNER_FILE, 'utf8')); } catch(e){}
    if (fs.existsSync(EKONOMI_FILE)) try { ekonomi = JSON.parse(fs.readFileSync(EKONOMI_FILE, 'utf8')); } catch(e){}
    if (fs.existsSync(KARTLAR_FILE)) {
        try { 
            const okununan = JSON.parse(fs.readFileSync(KARTLAR_FILE, 'utf8'));
            if (Array.isArray(okununan) && okununan.length > 0) kartlar = okununan;
        } catch(e){}
    } else {
        fs.writeFileSync(KARTLAR_FILE, JSON.stringify(kartlar, null, 2));
    }
    if (fs.existsSync(AYARLAR_FILE)) try { ayarlar = JSON.parse(fs.readFileSync(AYARLAR_FILE, 'utf8')); } catch(e){}
    if (fs.existsSync(AFK_FILE)) try { afkVeri = JSON.parse(fs.readFileSync(AFK_FILE, 'utf8')); } catch(e){}
}
veriYukle();

function veriKaydet(dosya, veri) { fs.writeFileSync(dosya, JSON.stringify(veri, null, 2)); }
function profilGetir(userId) {
    if (!ekonomi[userId]) ekonomi[userId] = { bakiye: 1000, envanter: [], sonGunluk: 0 };
    return ekonomi[userId];
}

// --- GACHA & MARKET MOTORU ---
function rastgeleKartSec() {
    if (kartlar.length === 0) return null;
    const efsaneviler = kartlar.filter(k => k.sinif && k.sinif.toLowerCase().includes('efsanevi'));
    const nadirler = kartlar.filter(k => k.sinif && k.sinif.toLowerCase().includes('nadir'));
    const normaller = kartlar.filter(k => !efsaneviler.includes(k) && !nadirler.includes(k));

    const sans = Math.random() * 100;
    if (sans < 60 && normaller.length > 0) return normaller[Math.floor(Math.random() * normaller.length)];
    else if (sans < 90 && nadirler.length > 0) return nadirler[Math.floor(Math.random() * nadirler.length)];
    else if (efsaneviler.length > 0) return efsaneviler[Math.floor(Math.random() * efsaneviler.length)];

    return kartlar[Math.floor(Math.random() * kartlar.length)];
}

function marketiYenile() {
    if (kartlar.length === 0) return;
    marketKartlari = [];
    for (let i = 0; i < 3; i++) {
        const rastgele = rastgeleKartSec();
        if (!rastgele) continue;
        let fiyat = 500;
        const s = (rastgele.sinif || "").toLowerCase();
        if (s.includes('efsanevi')) fiyat = 4000;
        else if (s.includes('nadir')) fiyat = 1500;
        marketKartlari.push({ ...rastgele, fiyat });
    }
}
marketiYenile();
setInterval(marketiYenile, 3 * 60 * 60 * 1000);

// --- YARDIM MENÜSÜ ---
function yardimMenusuOlustur(username) {
    const embed = new EmbedBuilder().setColor('#2F3136').setTitle('🛡️ Kastuhino Bot — Kontrol Paneli')
        .setDescription(`Merhaba **${username}**, komut rehberine hoş geldin.\nAşağıdaki menüden incelemek istediğin kategoriyi seçebilirsin.\n\n📂 **Kategoriler:**\n🐱 Eğlence\n🛎️ Kullanıcı\n🛠️ Otomatik Mod\n💰 Ekonomi\n🔨 Moderasyon`);
    const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId('yardim_menu').setPlaceholder('Kategori seçmek için tıkla...')
            .addOptions([
                { label: 'Ana Sayfa', value: 'ana_sayfa', emoji: '🏠' },
                { label: 'Eğlence', value: 'eglence_menu', emoji: '🐱' },
                { label: 'Kullanıcı', value: 'kullanici_menu', emoji: '🛎️' },
                { label: 'Otomatik Mod', value: 'automod_menu', emoji: '🛠️' },
                { label: 'Ekonomi & Kart', value: 'ekonomi_menu', emoji: '💰' },
                { label: 'Moderasyon', value: 'mod_menu', emoji: '🔨' }
            ])
    );
    return { embeds: [embed], components: [row] };
}

client.once('ready', () => { console.log(`[✓] ${client.user.tag} Tüm Sistemleriyle Aktif!`); });

client.on('interactionCreate', async interaction => {
    if (!interaction.isStringSelectMenu() || interaction.customId !== 'yardim_menu') return;
    const secim = interaction.values[0];
    const resEmbed = new EmbedBuilder().setColor('#2B2D31').setTimestamp();

    if (secim === 'ana_sayfa') return interaction.update(yardimMenusuOlustur(interaction.user.username));
    if (secim === 'eglence_menu') resEmbed.setTitle('🐱 Eğlence').setDescription('`k!1vs1`, `k!ship`, `k!fakemesaj`, `k!fast`');
    else if (secim === 'kullanici_menu') resEmbed.setTitle('🛎️ Kullanıcı').setDescription('`k!afk`, `k!avatar`, `k!kullanıcıbilgi`, `k!sunucubilgi`');
    else if (secim === 'automod_menu') resEmbed.setTitle('🛠️ Otomatik Mod').setDescription('`k!reklamengel`, `k!küfürengel`, `k!linkengel`, `k!capsengel`');
    else if (secim === 'ekonomi_menu') resEmbed.setTitle('💰 Ekonomi ve Gacha').setDescription('`k!bakiye`, `k!günlük`, `k!market`, `k!al [sıra]`, `k!gacha`, `k!envanter`');
    else if (secim === 'mod_menu') resEmbed.setTitle('🔨 Moderasyon').setDescription('`k!ban [@üye]`, `k!kick [@üye]`, `k!mute [@üye]`, `k!sil [miktar]`');

    return interaction.update({ embeds: [resEmbed], components: interaction.message.components });
});

client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    // AFK Sistemi
    if (afkVeri[message.author.id]) {
        delete afkVeri[message.author.id]; veriKaydet(AFK_FILE, afkVeri);
        message.reply(`👋 Hoş geldin! AFK modundan çıktın.`).then(m => setTimeout(() => m.delete(), 5000));
    }
    message.mentions.users.forEach(u => { if (afkVeri[u.id]) message.reply(`💤 **${u.username}** şu an AFK. Sebep: *${afkVeri[u.id]}*`); });

    // Otomatik Mod
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        const text = message.content.toLowerCase();
        const kufurler = ['amk', 'aq', 'sik', 'piç', 'orospu', 'yarak', 'yarrak'];
        if (ayarlar.kufurEngel && kufurler.some(k => text.includes(k))) {
            await message.delete().catch(() => {});
            return message.channel.send(`⚠️ ${message.author}, küfür yasak!`).then(m => setTimeout(() => m.delete(), 3000));
        }
        if (ayarlar.reklamEngel && (text.includes('discord.gg/') || text.includes('discord.com/invite/'))) {
            if (message.channel.id !== PARTNER_KANAL_ID) {
                await message.delete().catch(() => {});
                return message.channel.send(`🛡️ ${message.author}, reklam yasak!`).then(m => setTimeout(() => m.delete(), 3000));
            }
        }
    }

    if (!message.content.startsWith(PREFIX)) return;
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    const etiketlenen = message.mentions.members.first();

    // EKONOMİ & GACHA
    if (cmd === 'bakiye') {
        const p = profilGetir(message.author.id);
        return message.reply({ embeds: [new EmbedBuilder().setColor('#F1C40F').setTitle('💰 Cüzdan').setDescription(`${message.author}, hesabında **${p.bakiye} Cash** var!`)] });
    }

    if (cmd === 'günlük' || cmd === 'gunluk') {
        const p = profilGetir(message.author.id);
        const simdi = Date.now();
        if (p.sonGunluk && (simdi - p.sonGunluk < 86400000)) {
            const kalan = Math.ceil((86400000 - (simdi - p.sonGunluk)) / 3600000);
            return message.reply(`⏳ Günlük ödülünü zaten aldın! **${kalan} saat** beklemelisin.`);
        }
        p.bakiye += 1000; p.sonGunluk = simdi;
        veriKaydet(EKONOMI_FILE, ekonomi);
        return message.reply({ embeds: [new EmbedBuilder().setColor('#2ECC71').setTitle('🎁 Günlük Ödül').setDescription(`${message.author}, hesabına **1000 Cash** eklendi!`)] });
    }

    if (cmd === 'market') {
        if (marketKartlari.length === 0) return message.reply("🛒 Markette şu an aktif kart yok.");
        const embed = new EmbedBuilder().setColor('#9B59B6').setTitle('🛒 Kart Marketi').setDescription(`Satın almak için: \`${PREFIX}al <1-3>\`\n`);
        marketKartlari.forEach((k, i) => embed.addFields({ name: `${i + 1}. ${k.isim} (${k.sinif || 'Standart'})`, value: `Fiyat: **${k.fiyat} Cash**`, inline: false }));
        return message.reply({ embeds: [embed] });
    }

    if (cmd === 'al') {
        const sira = parseInt(args[0]) - 1;
        if (isNaN(sira) || sira < 0 || sira >= marketKartlari.length) return message.reply(`⚠️ Geçerli bir sıra belirt! Örn: \`${PREFIX}al 1\``);
        const kart = marketKartlari[sira];
        const p = profilGetir(message.author.id);
        if (p.bakiye < kart.fiyat) return message.reply(`⚠️ Yetersiz bakiye! Gereken: **${kart.fiyat} Cash**`);
        p.bakiye -= kart.fiyat;
        if (!p.envanter) p.envanter = [];
        p.envanter.push(kart);
        veriKaydet(EKONOMI_FILE, ekonomi);
        return message.reply({ embeds: [new EmbedBuilder().setColor('#2ECC71').setDescription(`🎉 **${kart.isim}** kartı başarıyla satın alındı!`)] });
    }

    if (cmd === 'envanter') {
        const p = profilGetir(message.author.id);
        if (!p.envanter || p.envanter.length === 0) return message.reply("🎒 Envanterin bomboş.");
        const embed = new EmbedBuilder().setColor('#3498DB').setTitle(`🎒 ${message.author.username} — Envanter`);
        let desc = '';
        p.envanter.forEach((k, i) => { desc += `**${i + 1}.** ${k.isim} — *${k.sinif || 'Standart'}*\n`; });
        embed.setDescription(desc);
        return message.reply({ embeds: [embed] });
    }

    if (cmd === 'gacha') {
        const p = profilGetir(message.author.id);
        if (p.bakiye < 300) return message.reply("⚠️ Gacha çevirmek için **300 Cash** gerekiyor!");
        const secilen = rastgeleKartSec();
        if (!secilen) return message.reply("⚠️ Sistemde çekilebilir kart bulunamadı.");
        p.bakiye -= 300;
        if (!p.envanter) p.envanter = [];
        p.envanter.push(secilen);
        veriKaydet(EKONOMI_FILE, ekonomi);

        const m = await message.reply({ embeds: [new EmbedBuilder().setColor('#2F3136').setTitle('🔮 Mühür Kırılıyor...').setImage('https://i.makeagif.com/media/9-28-2015/0R3bJ9.gif')] });
        setTimeout(() => {
            const sinif = (secilen.sinif || '').toLowerCase();
            let renk = '#3498DB', rozet = '⚔️ STANDART';
            if (sinif.includes('efsanevi')) { renk = '#FFD700'; rozet = '🌟 EFSANEVİ'; }
            else if (sinif.includes('nadir')) { renk = '#9B59B6'; rozet = '💎 NADİR'; }
            m.edit({ embeds: [new EmbedBuilder().setColor(renk).setTitle(`${rozet} — ${secilen.isim}`).setImage(secilen.gorsel_link)] });
        }, 2000);
        return;
    }

    // DİĞER KOMUTLAR
    if (cmd === 'ship') {
        if (!etiketlenen) return message.reply("💕 Birini etiketlemelisin!");
        const yuzdeOrani = Math.floor(Math.random() * 101);
        return message.reply({ embeds: [new EmbedBuilder().setColor('#E74C3C').setTitle('💕 Aşk Ölçer').setDescription(`**${message.author.username}** x **${etiketlenen.user.username}**\nAşk Yüzdesi: **%${yuzdeOrani}**`)] });
    }

    if (cmd === 'yardım' || cmd === 'yardim') return message.reply(yardimMenusuOlustur(message.author.username));

    if (cmd === 'sil') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply("⚠️ Yetkin yok!");
        const miktar = parseInt(args[0]);
        if (isNaN(miktar) || miktar < 1 || miktar > 100) return message.reply("⚠️ 1 ile 100 arasında bir sayı gir!");
        await message.channel.bulkDelete(miktar, true).catch(() => {});
        return message.channel.send(`✅ **${miktar}** mesaj silindi!`).then(m => setTimeout(() => m.delete(), 3000));
    }
});

client.login(process.env.DISCORD_TOKEN || process.env.TOKEN);
