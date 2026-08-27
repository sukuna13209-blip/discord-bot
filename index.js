const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
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
let kartlar = [];
let ayarlar = { kufurEngel: false, reklamEngel: false, linkEngel: false, capsEngel: false };
let afkVeri = {};
let marketKartlari = [];

function veriYukle() {
    if (fs.existsSync(PARTNER_FILE)) try { partners = JSON.parse(fs.readFileSync(PARTNER_FILE, 'utf8')); } catch(e){}
    if (fs.existsSync(EKONOMI_FILE)) try { ekonomi = JSON.parse(fs.readFileSync(EKONOMI_FILE, 'utf8')); } catch(e){}
    if (fs.existsSync(KARTLAR_FILE)) try { kartlar = JSON.parse(fs.readFileSync(KARTLAR_FILE, 'utf8')); } catch(e){}
    if (fs.existsSync(AYARLAR_FILE)) try { ayarlar = JSON.parse(fs.readFileSync(AYARLAR_FILE, 'utf8')); } catch(e){}
    if (fs.existsSync(AFK_FILE)) try { afkVeri = JSON.parse(fs.readFileSync(AFK_FILE, 'utf8')); } catch(e){}
}
veriYukle();

function veriKaydet(dosya, veri) { fs.writeFileSync(dosya, JSON.stringify(veri, null, 2)); }
function profilGetir(userId) {
    if (!ekonomi[userId]) ekonomi[userId] = { bakiye: 1000, envanter: [], sonGunluk: 0, mesaj: 0 };
    return ekonomi[userId];
}

// --- GACHA & MARKET SİSTEMİ ---
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

function marketiYenile() {
    if (kartlar.length === 0) return;
    marketKartlari = [];
    for (let i = 0; i < 3; i++) {
        const rastgele = rastgeleKartSec();
        if (!rastgele) continue;
        let fiyat = 500;
        const s = (rastgele.sinif || "").toLowerCase();
        if (s.includes('efsanevi') || s.includes('legendary')) fiyat = 4000;
        else if (s.includes('nadir') || s.includes('rare')) fiyat = 1500;
        marketKartlari.push({ ...rastgele, fiyat });
    }
}
setInterval(marketiYenile, 3 * 60 * 60 * 1000); // 3 saatte bir yenile
setTimeout(marketiYenile, 2000);

// --- PARTNER & YARDIM FONKSİYONLARI ---
function haftalikSiralamaBul(userId) {
    const siralanmis = Object.entries(partners).sort((a, b) => (b[1].hafta || 0) - (a[1].hafta || 0));
    const index = siralanmis.findIndex(item => item[0] === userId);
    return index !== -1 ? index + 1 : 1;
}

function createPartnerEmbed(user, data, guild) {
    const siralama = haftalikSiralamaBul(user.id);
    const serverIcon = (guild && guild.iconURL()) ? guild.iconURL({ size: 512 }) : user.displayAvatarURL({ size: 512 });
    return new EmbedBuilder().setColor('#5865F2').setAuthor({ name: user.username, iconURL: user.displayAvatarURL() }).setTitle('Partnerlik Profili')
        .setDescription(`**Bugünlük Partnerin:** ${data.bugun || 0}\n**Haftalık Partnerin:** ${data.hafta || 0}\n**Aylık Partnerin:** ${data.ay || 0}\n**Toplam Partnerin:** ${data.toplam || 0}\n**Haftalık Sıralaman:** #${siralama}`)
        .setThumbnail(serverIcon).setImage('https://i.postimg.cc/PqJ78dP6/c84c6583-884f-46c2-ba81-933db6aaeff8.png').setTimestamp();
}

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

// --- BUTON VE MENÜ ETKİLEŞİMLERİ ---
client.on('interactionCreate', async interaction => {
    // Yardım Menüsü Seçimleri
    if (interaction.isStringSelectMenu() && interaction.customId === 'yardim_menu') {
        const secim = interaction.values[0];
        const resEmbed = new EmbedBuilder().setColor('#2B2D31').setTimestamp();

        if (secim === 'ana_sayfa') return interaction.update(yardimMenusuOlustur(interaction.user.username));
        if (secim === 'eglence_menu') resEmbed.setTitle('🐱 Eğlence').setDescription('`k!1vs1`, `k!ship`, `k!fakemesaj`, `k!fast`');
        else if (secim === 'kullanici_menu') resEmbed.setTitle('🛎️ Kullanıcı').setDescription('`k!afk`, `k!avatar`, `k!kullanıcıbilgi`, `k!sunucubilgi`');
        else if (secim === 'automod_menu') resEmbed.setTitle('🛠️ Otomatik Mod').setDescription('`k!reklamengel`, `k!küfürengel`, `k!linkengel`, `k!capsengel`');
        else if (secim === 'ekonomi_menu') resEmbed.setTitle('💰 Ekonomi ve Gacha').setDescription('`k!bakiye`, `k!gunluk`, `k!market`, `k!al [sıra]`, `k!gacha`, `k!envanter`');
        else if (secim === 'mod_menu') resEmbed.setTitle('🔨 Moderasyon').setDescription('`k!ban [@üye]`, `k!kick [@üye]`, `k!mute [@üye]`, `k!sil [miktar]`');

        return interaction.update({ embeds: [resEmbed], components: interaction.message.components });
    }
});

// --- ANA MESAJ DİNLEYİCİSİ (KOMUTLAR BURADA) ---
client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    // 1. AFK SİSTEMİ
    if (afkVeri[message.author.id]) {
        delete afkVeri[message.author.id]; veriKaydet(AFK_FILE, afkVeri);
        message.reply(`👋 Hoş geldin! AFK modundan çıktın.`).then(m => setTimeout(() => m.delete(), 5000));
    }
    message.mentions.users.forEach(u => { if (afkVeri[u.id]) message.reply(`💤 **${u.username}** şu an AFK. Sebep: *${afkVeri[u.id]}*`); });

    // 2. OTOMATİK MOD FİLTRELERİ
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        const text = message.content.toLowerCase();
        const kufurler = ['amk', 'aq', 'sik', 'piç', 'orospu', 'yarak', 'yarrak'];
        if (ayarlar.kufurEngel && kufurler.some(k => text.includes(k))) {
            await message.delete().catch(() => {});
            return message.channel.send(`⚠️ ${message.author}, bu sunucuda küfür yasak!`).then(m => setTimeout(() => m.delete(), 3000));
        }
        if (ayarlar.reklamEngel && (text.includes('discord.gg/') || text.includes('discord.com/invite/'))) {
            if (message.channel.id !== PARTNER_KANAL_ID) {
                await message.delete().catch(() => {});
                return message.channel.send(`🛡️ ${message.author}, reklam yapmak yasak!`).then(m => setTimeout(() => m.delete(), 3000));
            }
        }
        if (ayarlar.linkEngel && (text.includes('http://') || text.includes('https://') || text.includes('.com'))) {
            if (message.channel.id !== PARTNER_KANAL_ID) {
                await message.delete().catch(() => {});
                return message.channel.send(`🔗 ${message.author}, link paylaşımı kapalı!`).then(m => setTimeout(() => m.delete(), 3000));
            }
        }
        if (ayarlar.capsEngel && message.content.length > 5) {
            const letters = message.content.replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ]/g, '');
            if (letters.length > 0 && (letters.match(/[A-ZĞÜŞİÖÇ]/g) || []).length / letters.length > 0.7) {
                await message.delete().catch(() => {});
                return message.channel.send(`🅰️ ${message.author}, büyük harf sınırını aştın!`).then(m => setTimeout(() => m.delete(), 3000));
            }
        }
    }

    // 3. PARTNER SİSTEMİ
    if (!partners[message.author.id]) partners[message.author.id] = { bugun: 0, hafta: 0, ay: 0, toplam: 0 };
    if (message.channel.id === PARTNER_KANAL_ID) {
        if (message.content.includes('discord.gg/') || message.content.includes('https://')) {
            partners[message.author.id].bugun += 1; partners[message.author.id].hafta += 1;
            partners[message.author.id].ay += 1; partners[message.author.id].toplam += 1;
            veriKaydet(PARTNER_FILE, partners);
            return message.reply({ content: '✅ Partnerlik sayıldı!', embeds: [createPartnerEmbed(message.author, partners[message.author.id], message.guild)] });
        }
    }

    // 4. KOMUT YÖNETİMİ BAŞLANGICI
    if (!message.content.startsWith(PREFIX)) return;
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    const etiketlenen = message.mentions.members.first();

    // ==========================================
    // EKONOMİ VE KART SİSTEMİ KOMUTLARI (DÜZELTİLDİ)
    // ==========================================

    if (cmd === 'bakiye') {
        const profil = profilGetir(message.author.id);
        const embed = new EmbedBuilder().setColor('#F1C40F').setTitle('💰 Cüzdan').setDescription(`${message.author}, hesabında **${profil.bakiye} Cash** var!`);
        return message.reply({ embeds: [embed] });
    }

    if (cmd === 'günlük' || cmd === 'gunluk') {
        const profil = profilGetir(message.author.id);
        const simdi = Date.now();
        if (profil.sonGunluk && (simdi - profil.sonGunluk < 86400000)) {
            const kalanSaat = Math.floor((86400000 - (simdi - profil.sonGunluk)) / 3600000);
            return message.reply(`⏳ Ödülünü zaten aldın! Tekrar almak için **${kalanSaat} saat** beklemelisin.`);
        }
        profil.bakiye += 1000;
        profil.sonGunluk = simdi;
        veriKaydet(EKONOMI_FILE, ekonomi);
        return message.reply({ embeds: [new EmbedBuilder().setColor('#2ECC71').setTitle('🎁 Günlük Ödül').setDescription(`${message.author}, günlük **1000 Cash** hesabına eklendi!`)] });
    }

    if (cmd === 'market') {
        if (marketKartlari.length === 0) return message.reply("🛒 Markette şu an aktif kart yok.");
        const embed = new EmbedBuilder().setColor('#9B59B6').setTitle('🛒 Kart Marketi').setDescription(`(\`${PREFIX}al <1-3>\`) ile satın alabilirsiniz:\n`);
        marketKartlari.forEach((k, idx) => {
            embed.addFields({ name: `${idx + 1}. ${k.isim} (${k.sinif || 'Standart'})`, value: `Fiyat: **${k.fiyat} Cash**`, inline: false });
        });
        return message.reply({ embeds: [embed] });
    }

    if (cmd === 'al') {
        const secim = parseInt(args[0]) - 1;
        if (isNaN(secim) || secim < 0 || secim >= marketKartlari.length) return message.reply(`⚠️ Doğru bir sıra girin! Örn: \`${PREFIX}al 1\``);
        const alinacak = marketKartlari[secim];
        const profil = profilGetir(message.author.id);
        if (profil.bakiye < alinacak.fiyat) return message.reply(`⚠️ Yetersiz Bakiye! Gereken: **${alinacak.fiyat} Cash**`);
        
        profil.bakiye -= alinacak.fiyat;
        if (!profil.envanter) profil.envanter = [];
        profil.envanter.push(alinacak);
        veriKaydet(EKONOMI_FILE, ekonomi);
        return message.reply({ embeds: [new EmbedBuilder().setColor('#2ECC71').setDescription(`🎉 **${alinacak.isim}** kartını başarıyla satın aldın!`)] });
    }

    if (cmd === 'envanter') {
        const profil = profilGetir(message.author.id);
        if (!profil.envanter || profil.envanter.length === 0) return message.reply("🎒 Envanterin şu an bomboş.");
        const embed = new EmbedBuilder().setColor('#3498DB').setTitle(`🎒 ${message.author.username} - Envanter`);
        let desc = '';
        profil.envanter.forEach((k, i) => { desc += `**${i + 1}.** ${k.isim} - *${k.sinif || 'Standart'}*\n`; });
        embed.setDescription(desc);
        return message.reply({ embeds: [embed] });
    }

    if (cmd === 'gacha' || cmd === 'çek') {
        const profil = profilGetir(message.author.id);
        if (profil.bakiye < 300) return message.reply("⚠️ Gacha çekmek için **300 Cash** gerekiyor!");
        
        const secilen = rastgeleKartSec();
        if (!secilen) return message.reply("⚠️ Sunucu veritabanında çekilecek kart bulunamadı.");
        
        profil.bakiye -= 300;
        if (!profil.envanter) profil.envanter = [];
        profil.envanter.push(secilen);
        veriKaydet(EKONOMI_FILE, ekonomi);

        const animEmbed = new EmbedBuilder().setColor('#2F3136').setTitle('🔮 Büyülü Mühür Kırılıyor...').setImage('https://i.makeagif.com/media/9-28-2015/0R3bJ9.gif');
        const m = await message.reply({ embeds: [animEmbed] });

        setTimeout(() => {
            const sinif = (secilen.sinif || 'Standart').toLowerCase();
            let renk = '#3498DB', rozet = '⚔️ STANDART';
            if (sinif.includes('efsanevi')) { renk = '#FFD700'; rozet = '🌟 EFSANEVİ'; }
            else if (sinif.includes('nadir')) { renk = '#9B59B6'; rozet = '💎 NADİR'; }

            const finalEmbed = new EmbedBuilder().setColor(renk).setAuthor({ name: '✨ KART ÇIKARTILDI ✨', iconURL: message.author.displayAvatarURL() })
                .setTitle(`${rozet} — ${secilen.isim}`)
                .setDescription(`Koleksiyonuna yeni bir parça katıldı!`)
                .setImage(secilen.gorsel_link);
            m.edit({ embeds: [finalEmbed] });
        }, 2200);
        return;
    }

    // ==========================================
    // DİĞER TÜM KOMUTLAR
    // ==========================================

    if (['reklamengel', 'küfürengel', 'linkengel', 'capsengel'].includes(cmd)) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply("⚠️ Yetkin yok!");
        const ayar = cmd.replace('ü', 'u').replace('engel', 'Engel'); 
        ayarlar[ayar] = !ayarlar[ayar];
        veriKaydet(AYARLAR_FILE, ayarlar);
        return message.reply(`🛠️ ${cmd} başarıyla **${ayarlar[ayar] ? 'Açıldı ✅' : 'Kapatıldı ❌'}**`);
    }

    if (cmd === 'afk') {
        const sebep = args.join(' ') || 'Şu an buralarda değilim.';
        afkVeri[message.author.id] = sebep; veriKaydet(AFK_FILE, afkVeri);
        return message.reply(`💤 AFK moduna geçtin. Sebep: **${sebep}**`);
    }

    if (cmd === 'avatar') return message.reply({ embeds: [new EmbedBuilder().setColor('#9B59B6').setImage((etiketlenen ? etiketlenen.user : message.author).displayAvatarURL({ dynamic: true, size: 1024 }))] });
    
    if (cmd === 'ship') {
        if (!etiketlenen) return message.reply("💕 Kimi shiplemek istiyorsun? Birini etiketle!");
        const % = Math.floor(Math.random() * 101);
        return message.reply({ embeds: [new EmbedBuilder().setColor('#E74C3C').setTitle('💕 Aşk Ölçer').setDescription(`**${message.author.username}** x **${etiketlenen.user.username}**\nAşk Yüzdesi: **%${%}**`)] });
    }

    if (cmd === 'yardım' || cmd === 'yardim') return message.reply(yardimMenusuOlustur(message.author.username));
    
    if (cmd === 'sil') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply('⚠️ Yetkin yok.');
        const miktar = parseInt(args[0]);
        if (isNaN(miktar) || miktar < 1 || miktar > 100) return message.reply('⚠️ 1 ile 100 arasında bir sayı belirt!');
        await message.channel.bulkDelete(miktar, true).catch(() => {});
        return message.channel.send(`✅ **${miktar}** mesaj silindi!`).then(m => setTimeout(() => m.delete(), 3000));
    }
});

client.login(process.env.DISCORD_TOKEN || process.env.TOKEN);
