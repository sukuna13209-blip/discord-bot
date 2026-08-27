const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
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

// --- DOSYA YÖNETİMİ & VERİTABANI ---
const PARTNER_FILE = './partners.json';
const EKONOMI_FILE = './ekonomi.json';
const KARTLAR_FILE = './kartlar.json';
const AYARLAR_FILE = './ayarlar.json';
const AFK_FILE = './afk.json';

let partners = {};
let ekonomi = {};

// Kusursuz Karakter ve Görsel Arşivi
let kartlar = [
    { isim: "Monkey D. Luffy", sinif: "Efsanevi", gorsel_link: "https://images.alphacoders.com/133/1331776.png" },
    { isim: "Portgas D. Ace", sinif: "Efsanevi", gorsel_link: "https://images.alphacoders.com/112/1123306.png" },
    { isim: "Roronoa Zoro", sinif: "Nadir", gorsel_link: "https://images.alphacoders.com/132/1325325.png" },
    { isim: "Naruto Uzumaki", sinif: "Efsanevi", gorsel_link: "https://images.alphacoders.com/565/565217.png" },
    { isim: "Namikaze Minato", sinif: "Efsanevi", gorsel_link: "https://images.alphacoders.com/133/1333678.png" },
    { isim: "Uchiha Itachi", sinif: "Standart", gorsel_link: "https://images.alphacoders.com/797/797828.png" },
    { isim: "Ken Kaneki", sinif: "Efsanevi", gorsel_link: "https://images.alphacoders.com/604/604470.png" },
    { isim: "Ichigo Kurosaki", sinif: "Nadir", gorsel_link: "https://images.alphacoders.com/100/1008779.png" },
    { isim: "Killua Zoldyck", sinif: "Nadir", gorsel_link: "https://images.alphacoders.com/133/1331821.png" },
    { isim: "Tanjiro Kamado", sinif: "Standart", gorsel_link: "https://images.alphacoders.com/131/1315570.png" }
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
            if (Array.isArray(okununan) && okununan.length > 0) {
                kartlar = okununan;
            }
        } catch(e){}
    }
    fs.writeFileSync(KARTLAR_FILE, JSON.stringify(kartlar, null, 2));

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

// --- GACHA ÇEKİRDEK FONKSİYONU ---
async function gachaCek(targetMessage, user) {
    const p = profilGetir(user.id);
    if (p.bakiye < 300) {
        const uyari = { content: "⚠️ Gacha çevirmek için **300 Cash** gerekiyor!", ephemeral: true };
        if (targetMessage.reply) return targetMessage.reply(uyari);
        if (targetMessage.update) return targetMessage.update(uyari);
        return;
    }

    const secilen = rastgeleKartSec();
    if (!secilen) {
        const uyari = { content: "⚠️ Sistemde çekilebilir kart bulunamadı.", ephemeral: true };
        if (targetMessage.reply) return targetMessage.reply(uyari);
        if (targetMessage.update) return targetMessage.update(uyari);
        return;
    }

    p.bakiye -= 300;
    if (!p.envanter) p.envanter = [];
    p.envanter.push(secilen);
    veriKaydet(EKONOMI_FILE, ekonomi);

    const yukleniyorEmbed = new EmbedBuilder()
        .setColor('#2F3136')
        .setTitle('🔮 Mühür Kırılıyor...')
        .setImage('https://i.makeagif.com/media/9-28-2015/0R3bJ9.gif');

    let msg;
    if (targetMessage.reply) {
        msg = await targetMessage.reply({ embeds: [yukleniyorEmbed], components: [] });
    } else if (targetMessage.update) {
        await targetMessage.update({ embeds: [yukleniyorEmbed], components: [] });
        msg = targetMessage.message;
    }

    setTimeout(() => {
        const sinif = (secilen.sinif || '').toLowerCase();
        let renk = '#3498DB', rozet = '⚔️ STANDART';
        if (sinif.includes('efsanevi')) { renk = '#FFD700'; rozet = '🌟 EFSANEVİ'; }
        else if (sinif.includes('nadir')) { renk = '#9B59B6'; rozet = '💎 NADİR'; }

        const finalEmbed = new EmbedBuilder()
            .setColor(renk)
            .setAuthor({ name: '✨ KART ÇIKTI ✨', iconURL: user.displayAvatarURL() })
            .setTitle(`${rozet} — ${secilen.isim}`)
            .setDescription(`| Kalan Bakiye: **${p.bakiye} Cash**`)
            .setImage(secilen.gorsel_link);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('gacha_tekrar').setLabel('Tekrar (300)').setStyle(ButtonStyle.Danger).setEmoji('🎲'),
            new ButtonBuilder().setCustomId('gacha_envanter').setLabel('Envanter').setStyle(ButtonStyle.Secondary).setEmoji('🎒')
        );

        msg.edit({ embeds: [finalEmbed], components: [row] }).catch(() => {});
    }, 2000);
}

// --- YARDIM MENÜSÜ ---
function yardimMenusuOlustur(username) {
    const embed = new EmbedBuilder().setColor('#2F3136').setTitle('🛡️ Kastuhino Bot — Kontrol Paneli')
        .setDescription(`Merhaba **${username}**, komut rehberine hoş geldin.\nAşağıdaki menüden incelemek istediğin kategoriyi seçebilirsin.\n\n📂 **Kategoriler:**\n🐱 Eğlence\n🛎️ Kullanıcı\n🛠️ Otomatik Mod\n💰 Ekonomi\n🤝 Partner Sistemi\n🔨 Moderasyon`);
    const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId('yardim_menu').setPlaceholder('Kategori seçmek için tıkla...')
            .addOptions([
                { label: 'Ana Sayfa', value: 'ana_sayfa', emoji: '🏠' },
                { label: 'Eğlence', value: 'eglence_menu', emoji: '🐱' },
                { label: 'Kullanıcı', value: 'kullanici_menu', emoji: '🛎️' },
                { label: 'Otomatik Mod', value: 'automod_menu', emoji: '🛠️' },
                { label: 'Ekonomi & Kart', value: 'ekonomi_menu', emoji: '💰' },
                { label: 'Partner Sistemi', value: 'partner_menu', emoji: '🤝' },
                { label: 'Moderasyon', value: 'mod_menu', emoji: '🔨' }
            ])
    );
    return { embeds: [embed], components: [row] };
}

client.once('ready', () => { console.log(`[✓] ${client.user.tag} Tüm Sistemleriyle Aktif!`); });

// --- ETKİLEŞİM YÖNETİMİ ---
client.on('interactionCreate', async interaction => {
    if (interaction.isStringSelectMenu() && interaction.customId === 'yardim_menu') {
        const secim = interaction.values[0];
        const resEmbed = new EmbedBuilder().setColor('#2B2D31').setTimestamp();

        if (secim === 'ana_sayfa') return interaction.update(yardimMenusuOlustur(interaction.user.username));
        if (secim === 'eglence_menu') resEmbed.setTitle('🐱 Eğlence').setDescription('`k!1vs1`, `k!ship`, `k!fakemesaj`, `k!fast`');
        else if (secim === 'kullanici_menu') resEmbed.setTitle('🛎️ Kullanıcı').setDescription('`k!afk`, `k!avatar`, `k!kullanıcıbilgi`, `k!sunucubilgi`');
        else if (secim === 'automod_menu') resEmbed.setTitle('🛠️ Otomatik Mod').setDescription('`k!reklamengel`, `k!küfürengel`, `k!linkengel`, `k!capsengel`');
        else if (secim === 'ekonomi_menu') resEmbed.setTitle('💰 Ekonomi ve Gacha').setDescription('`k!bakiye`, `k!günlük`, `k!market`, `k!al [sıra]`, `k!gacha`, `k!envanter`');
        else if (secim === 'partner_menu') resEmbed.setTitle('🤝 Partner Sistemi').setDescription('`k!partner`, `k!partner-sayi [@üye]`, `k!partner-liste`');
        else if (secim === 'mod_menu') resEmbed.setTitle('🔨 Moderasyon').setDescription('`k!ban [@üye]`, `k!kick [@üye]`, `k!mute [@üye]`, `k!sil [miktar]`');

        return interaction.update({ embeds: [resEmbed], components: interaction.message.components });
    }

    if (interaction.isButton()) {
        if (interaction.customId === 'gacha_tekrar') {
            await gachaCek(interaction, interaction.user);
        } else if (interaction.customId === 'gacha_envanter') {
            const p = profilGetir(interaction.user.id);
            if (!p.envanter || p.envanter.length === 0) {
                return interaction.reply({ content: "🎒 Envanterin bomboş.", ephemeral: true });
            }
            const embed = new EmbedBuilder().setColor('#3498DB').setTitle(`🎒 ${interaction.user.username} — Envanter`);
            let desc = '';
            p.envanter.forEach((k, i) => { desc += `**${i + 1}.** ${k.isim} — *${k.sinif || 'Standart'}*\n`; });
            embed.setDescription(desc);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
});

// --- MESAJ KOMUTLARI & SİSTEMLER ---
client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    // AFK Sistemi
    if (afkVeri[message.author.id]) {
        delete afkVeri[message.author.id]; veriKaydet(AFK_FILE, afkVeri);
        message.reply(`👋 Hoş geldin! AFK modundan çıktın.`).then(m => setTimeout(() => m.delete(), 5000));
    }
    message.mentions.users.forEach(u => { if (afkVeri[u.id]) message.reply(`💤 **${u.username}** şu an AFK. Sebep: *${afkVeri[u.id]}*`); });

    // Partner Kanalı Otomatik Takip Sistemi
    if (message.channel.id === PARTNER_KANAL_ID) {
        const userId = message.author.id;
        if (!partners[userId]) partners[userId] = { sayi: 0, isim: message.author.tag };
        partners[userId].sayi += 1;
        partners[userId].isim = message.author.tag;
        veriKaydet(PARTNER_FILE, partners);
    }

    // Otomatik Mod
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        const text = message.content.toLowerCase();
        const kufurler = ['amk', 'aq', 'sik', 'piç', 'orospu', 'yarak', 'yarrak'];
        if (ayarlar.kufurEngel && kufurler.some(k => text.includes(k))) {
            await message.delete().catch(() => {});
            return message.channel.send(`⚠️ ${message.author}, küfür yasak!`).then(m => setTimeout(() => m.delete(), 3000));
        }
        if (ayarlar.reklamengel && (text.includes('discord.gg/') || text.includes('discord.com/invite/'))) {
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

    // PARTNER KOMUTLARI
    if (cmd === 'partner') {
        return message.reply({ embeds: [new EmbedBuilder().setColor('#9B59B6').setTitle('🤝 Partner Sistemi').setDescription(`Kanalda paylaştığın partner ilanları otomatik olarak sayılır.\n\nKomutlar:\n\`${PREFIX}partner-sayi [@üye]\` - Partner sayılarını görürsün.\n\`${PREFIX}partner-liste\` - Toplam partner istatistiklerini listeler.`)] });
    }

    if (cmd === 'partner-sayi' || cmd === 'partnersayi') {
        const hedef = etiketlenen ? etiketlenen.user : message.author;
        const veri = partners[hedef.id] ? partners[hedef.id].sayi : 0;
        return message.reply({ embeds: [new EmbedBuilder().setColor('#3498DB').setTitle('🤝 Partner Bilgisi').setDescription(`**${hedef.username}** adlı kullanıcının toplam başarılı partner sayısı: **${veri}**`)] });
    }

    if (cmd === 'partner-liste' || cmd === 'partnerliste') {
        const keys = Object.keys(partners);
        if (keys.length === 0) return message.reply("📁 Henüz kayıtlı partner verisi bulunmuyor.");
        const sirali = keys.sort((a, b) => partners[b].sayi - partners[a].sayi).slice(0, 10);
        const embed = new EmbedBuilder().setColor('#F1C40F').setTitle('🏆 En Çok Partner Yapanlar');
        let desc = '';
        sirali.forEach((id, index) => {
            desc += `**${index + 1}.** <@${id}> — **${partners[id].sayi}** Partner\n`;
        });
        embed.setDescription(desc);
        return message.reply({ embeds: [embed] });
    }

    // EKONOMİ & GACHA KOMUTLARI
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
        return await gachaCek(message, message.author);
    }

    // MODERASYON KOMUTLARI
    if (cmd === 'sil') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply("⚠️ Mesajları yönet yetkin yok!");
        const miktar = parseInt(args[0]);
        if (isNaN(miktar) || miktar < 1 || miktar > 100) return message.reply("⚠️ 1 ile 100 arasında bir sayı gir!");
        await message.channel.bulkDelete(miktar, true).catch(() => {});
        return message.channel.send(`✅ **${miktar}** mesaj silindi!`).then(m => setTimeout(() => m.delete(), 3000));
    }

    if (cmd === 'ban') {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) return message.reply("⚠️ Üyeleri yasakla yetkin yok!");
        if (!etiketlenen) return message.reply("⚠️ Yasaklanacak üyeyi etiketlemelisin! Örn: \`${PREFIX}ban @üye\``);
        if (!etiketlenen.bannable) return message.reply("⚠️ Bu üyeyi yasaklayamıyorum (Yetkim yetersiz olabilir).");
        const sebep = args.slice(1).join(' ') || 'Belirtilmedi';
        await etiketlenen.ban({ reason: sebep }).catch(() => {});
        return message.reply(`🔨 **${etiketlenen.user.tag}** sunucudan yasaklandı! Sebep: *${sebep}*`);
    }

    if (cmd === 'kick') {
        if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) return message.reply("⚠️ Üyeleri at yetkin yok!");
        if (!etiketlenen) return message.reply("⚠️ Atılacak üyeyi etiketlemelisin! Örn: \`${PREFIX}kick @üye\``);
        if (!etiketlenen.kickable) return message.reply("⚠️ Bu üyeyi atamıyorum (Yetkim yetersiz olabilir).");
        const sebep = args.slice(1).join(' ') || 'Belirtilmedi';
        await etiketlenen.kick(sebep).catch(() => {});
        return message.reply(`👢 **${etiketlenen.user.tag}** sunucudan atıldı! Sebep: *${sebep}*`);
    }

    if (cmd === 'mute') {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return message.reply("⚠️ Üyeleri zaman aşımına uğrat yetkin yok!");
        if (!etiketlenen) return message.reply("⚠️ Susturulacak üyeyi etiketlemelisin! Örn: \`${PREFIX}mute @üye 10\``);
        const dakika = parseInt(args[1]);
        if (isNaN(dakika) || dakika < 1) return message.reply("⚠️ Geçerli bir süre (dakika cinsinden) belirtmelisin!");
        const sebep = args.slice(2).join(' ') || 'Belirtilmedi';
        await etiketlenen.timeout(dakika * 60 * 1000, sebep).catch(() => {});
        return message.reply(`🔇 **${etiketlenen.user.tag}** ${dakika} dakika süreyle susturuldu! Sebep: *${sebep}*`);
    }

    // DİĞER EĞLENCE KOMUTLARI
    if (cmd === 'ship') {
        if (!etiketlenen) return message.reply("💕 Birini etiketlemelisin!");
        const yuzdeOrani = Math.floor(Math.random() * 101);
        return message.reply({ embeds: [new EmbedBuilder().setColor('#E74C3C').setTitle('💕 Aşk Ölçer').setDescription(`**${message.author.username}** x **${etiketlenen.user.username}**\nAşk Yüzdesi: **%${yuzdeOrani}**`)] });
    }

    if (cmd === 'yardım' || cmd === 'yardim') return message.reply(yardimMenusuOlustur(message.author.username));
});

client.login(process.env.DISCORD_TOKEN || process.env.TOKEN);
