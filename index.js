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

function veriYukle() {
    if (fs.existsSync(PARTNER_FILE)) partners = JSON.parse(fs.readFileSync(PARTNER_FILE, 'utf8'));
    if (fs.existsSync(EKONOMI_FILE)) ekonomi = JSON.parse(fs.readFileSync(EKONOMI_FILE, 'utf8'));
    if (fs.existsSync(KARTLAR_FILE)) kartlar = JSON.parse(fs.readFileSync(KARTLAR_FILE, 'utf8'));
    if (fs.existsSync(AYARLAR_FILE)) ayarlar = JSON.parse(fs.readFileSync(AYARLAR_FILE, 'utf8'));
    if (fs.existsSync(AFK_FILE)) afkVeri = JSON.parse(fs.readFileSync(AFK_FILE, 'utf8'));
}
veriYukle();

function veriKaydet(dosya, veri) { fs.writeFileSync(dosya, JSON.stringify(veri, null, 2)); }
function profilGetir(userId) {
    if (!ekonomi[userId]) ekonomi[userId] = { bakiye: 1000, envanter: [], sonGunluk: 0, mesaj: 0 };
    return ekonomi[userId];
}

// --- PARTNER & HAFTALIK SIRALAMA ---
function haftalikSiralamaBul(userId) {
    const siralanmis = Object.entries(partners).sort((a, b) => (b[1].hafta || 0) - (a[1].hafta || 0));
    const index = siralanmis.findIndex(item => item[0] === userId);
    return index !== -1 ? index + 1 : 1;
}

function createPartnerEmbed(user, data, guild) {
    const siralama = haftalikSiralamaBul(user.id);
    const serverIcon = (guild && guild.iconURL()) ? guild.iconURL({ size: 512 }) : user.displayAvatarURL({ size: 512 });

    return new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
        .setTitle('Partnerlik Profili')
        .setDescription(`**Bugünlük Partnerin:** ${data.bugun || 0}\n**Haftalık Partnerin:** ${data.hafta || 0}\n**Aylık Partnerin:** ${data.ay || 0}\n**Toplam Partnerin:** ${data.toplam || 0}\n**Haftalık Sıralaman:** #${siralama}`)
        .setThumbnail(serverIcon)
        .setImage('https://i.postimg.cc/PqJ78dP6/c84c6583-884f-46c2-ba81-933db6aaeff8.png')
        .setTimestamp();
}

// --- KAPSAMLI YARDIM MENÜSÜ ---
function yardimMenusuOlustur(username) {
    const embed = new EmbedBuilder()
        .setColor('#2F3136')
        .setTitle('🛡️ Kastuhino Bot — Kontrol Paneli')
        .setDescription(`Merhaba **${username}**, komut rehberine hoş geldin.\nAşağıdaki menüden incelemek istediğin kategoriyi seçebilirsin.\n\n📂 **Kategoriler:**\n🐱 Eğlence\n🛎️ Kullanıcı\n🛠️ Otomatik Mod\n💰 Ekonomi\n🔨 Moderasyon`);

    const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('yardim_menu')
            .setPlaceholder('Kategori seçmek için tıkla...')
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

client.once('ready', () => {
    console.log(`[✓] ${client.user.tag} Tüm Sistemleriyle Aktif!`);
});

// --- MENÜ ETKİLEŞİMLERİ (YENİLENMİŞ GÖRÜNÜM) ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isStringSelectMenu() || interaction.customId !== 'yardim_menu') return;
    const secim = interaction.values[0];
    const resEmbed = new EmbedBuilder().setColor('#2B2D31').setTimestamp();

    if (secim === 'ana_sayfa') return interaction.update(yardimMenusuOlustur(interaction.user.username));
    
    if (secim === 'eglence_menu') {
        resEmbed.setTitle('🐱 Eğlence')
        .setDescription('Eğlenceli ve keyifli komutlar\n\n' +
        '`k!1vs1`\nBaşka biri ile düello atarsınız.\n\n' +
        '`k!ship`\nBot sizi etiketlediğiniz kişiyle eşleştirir.\n\n' +
        '`k!fakemesaj`\nBelirlediğiniz kişi için sahte mesaj gönderirsiniz.\n\n' +
        '`k!fast`\nBelirlenen sürede verilen kelimeyi yazmaya çalışırsınız.');
    } 
    else if (secim === 'kullanici_menu') {
        resEmbed.setTitle('🛎️ Kullanıcı')
        .setDescription('Profil ve kullanıcı bilgileri\n\n' +
        '`k!afk`\nBahsedildiğinizde yanıt verilmesi için bir AFK durumu ayarlar.\n\n' +
        '`k!avatar`\nBelirttiğiniz kullanıcının avatarını gösterir.\n\n' +
        '`k!kullanıcıbilgi`\nBelirtilen kullanıcı hakkında ayrıntılı bilgi verir.\n\n' +
        '`k!sunucubilgi`\nBulunduğunuz sunucu hakkında genel istatistikleri gösterir.');
    } 
    else if (secim === 'automod_menu') {
        resEmbed.setTitle('🛠️ Otomatik Mod')
        .setDescription('Mesaj ihlallerini otomatik olarak algılar ve yönetir.\n\n' +
        '`k!reklamengel`\nReklam ve davet linki içeren mesajları anında siler.\n\n' +
        '`k!küfürengel`\nKüfür ve argo kelime içeren mesajları engeller.\n\n' +
        '`k!linkengel`\nİzinsiz paylaşılan dış bağlantıları ve linkleri siler.\n\n' +
        '`k!capsengel`\nBelirlenen büyük harf oranını aşan rahatsız edici mesajları siler.');
    } 
    else if (secim === 'ekonomi_menu') {
        resEmbed.setTitle('💰 Ekonomi ve Gacha')
        .setDescription('Sunucu içi ticaret, bakiye ve kart toplama sistemi\n\n' +
        '`k!bakiye`\nCüzdanınızdaki mevcut Anime Cash miktarını gösterir.\n\n' +
        '`k!gunluk`\nHer 24 saatte bir günlük Anime Cash ödülünüzü almanızı sağlar.\n\n' +
        '`k!market`\nSatın alabileceğiniz, belirli aralıklarla yenilenen kartları listeler.\n\n' +
        '`k!al [sıra]`\nMarketten belirttiğiniz sıradaki (1, 2 veya 3) kartı satın alır.\n\n' +
        '`k!gacha`\n300 Cash karşılığında rastgele bir mühür kırıp kart çıkartırsınız.\n\n' +
        '`k!envanter`\nSahip olduğunuz tüm özel koleksiyon kartlarını gösterir.');
    } 
    else if (secim === 'mod_menu') {
        resEmbed.setTitle('🔨 Moderasyon')
        .setDescription('Sunucu düzenini ve güvenliğini sağlamak için yönetim araçları\n\n' +
        '`k!ban [@üye]`\nKural ihlali yapan üyeyi sunucudan kalıcı olarak uzaklaştırır.\n\n' +
        '`k!kick [@üye]`\nBelirtilen üyeyi sunucudan atar (tekrar katılabilir).\n\n' +
        '`k!mute [@üye]`\nBelirtilen üyeyi 10 dakika boyunca geçici olarak susturur.\n\n' +
        '`k!sil [miktar]`\nBelirttiğiniz sayı kadar (1-100) mesajı sohbetten temizler.');
    }

    return interaction.update({ embeds: [resEmbed], components: interaction.message.components });
});

// --- ANA MESAJ DİNLEYİCİSİ (OTOMATİK MOD & AFK BURADA) ---
client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    // 1. AFK SİSTEMİ KONTROLÜ
    if (afkVeri[message.author.id]) {
        delete afkVeri[message.author.id];
        veriKaydet(AFK_FILE, afkVeri);
        message.reply(`👋 Hoş geldin! AFK modundan çıktın.`).then(m => setTimeout(() => m.delete(), 5000));
    }
    message.mentions.users.forEach(u => {
        if (afkVeri[u.id]) {
            message.reply(`💤 **${u.username}** şu an AFK. Sebep: *${afkVeri[u.id]}*`);
        }
    });

    // 2. OTOMATİK MOD FİLTRELERİ (Adminler Hariç)
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        const text = message.content.toLowerCase();
        
        // Küfür Filtresi
        const kufurler = ['amk', 'aq', 'sik', 'piç', 'orospu', 'yarak', 'yarrak'];
        if (ayarlar.kufurEngel && kufurler.some(k => text.includes(k))) {
            await message.delete().catch(() => {});
            return message.channel.send(`⚠️ ${message.author}, bu sunucuda küfür edemezsin!`).then(m => setTimeout(() => m.delete(), 3000));
        }

        // Reklam Filtresi (Discord Invite)
        if (ayarlar.reklamEngel && (text.includes('discord.gg/') || text.includes('discord.com/invite/'))) {
            if (message.channel.id !== PARTNER_KANAL_ID) { // Partner kanalı hariç
                await message.delete().catch(() => {});
                return message.channel.send(`🛡️ ${message.author}, reklam yapmak yasak!`).then(m => setTimeout(() => m.delete(), 3000));
            }
        }

        // Link Filtresi
        if (ayarlar.linkEngel && (text.includes('http://') || text.includes('https://') || text.includes('.com'))) {
            if (message.channel.id !== PARTNER_KANAL_ID) {
                await message.delete().catch(() => {});
                return message.channel.send(`🔗 ${message.author}, link paylaşımı kapalı!`).then(m => setTimeout(() => m.delete(), 3000));
            }
        }

        // Capslock Engeli
        if (ayarlar.capsEngel && message.content.length > 5) {
            const letters = message.content.replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ]/g, '');
            if (letters.length > 0 && (letters.match(/[A-ZĞÜŞİÖÇ]/g) || []).length / letters.length > 0.7) {
                await message.delete().catch(() => {});
                return message.channel.send(`🅰️ ${message.author}, lütfen çok fazla büyük harf kullanma!`).then(m => setTimeout(() => m.delete(), 3000));
            }
        }
    }

    // 3. PARTNER SİSTEMİ & XP
    if (!partners[message.author.id]) partners[message.author.id] = { bugun: 0, hafta: 0, ay: 0, toplam: 0 };
    if (message.channel.id === PARTNER_KANAL_ID) {
        if (message.content.includes('discord.gg/') || message.content.includes('https://')) {
            partners[message.author.id].bugun += 1;
            partners[message.author.id].hafta += 1;
            partners[message.author.id].ay += 1;
            partners[message.author.id].toplam += 1;
            veriKaydet(PARTNER_FILE, partners);
            return message.reply({ content: '✅ Partnerlik sayıldı!', embeds: [createPartnerEmbed(message.author, partners[message.author.id], message.guild)] });
        }
    }

    // 4. KOMUT YÖNETİMİ
    if (!message.content.startsWith(PREFIX)) return;
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    const etiketlenen = message.mentions.members.first();

    // --- OTOMATİK MOD KOMUTLARI ---
    if (['reklamengel', 'küfürengel', 'linkengel', 'capsengel'].includes(cmd)) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply("⚠️ Yetkin yok!");
        const ayarAdi = cmd.replace('ü', 'u').replace('engel', 'Engel'); // kufurEngel, reklamEngel vb.
        ayarlar[ayarAdi] = !ayarlar[ayarAdi];
        veriKaydet(AYARLAR_FILE, ayarlar);
        return message.reply(`🛠️ ${cmd} başarıyla **${ayarlar[ayarAdi] ? 'Açıldı ✅' : 'Kapatıldı ❌'}**`);
    }

    // --- KULLANICI KOMUTLARI ---
    if (cmd === 'afk') {
        const sebep = args.join(' ') || 'Şu an buralarda değilim.';
        afkVeri[message.author.id] = sebep;
        veriKaydet(AFK_FILE, afkVeri);
        return message.reply(`💤 AFK moduna geçtin. Sebep: **${sebep}**`);
    }

    if (cmd === 'avatar') {
        const user = etiketlenen ? etiketlenen.user : message.author;
        const embed = new EmbedBuilder().setColor('#9B59B6').setTitle(`${user.username} Avatarı`).setImage(user.displayAvatarURL({ dynamic: true, size: 1024 }));
        return message.reply({ embeds: [embed] });
    }

    if (cmd === 'kullanıcıbilgi' || cmd === 'kullanicibilgi') {
        const member = etiketlenen || message.member;
        const embed = new EmbedBuilder()
            .setColor('#3498DB')
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .setTitle(`👤 ${member.user.tag} Profili`)
            .addFields(
                { name: 'Kayıt Tarihi', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: 'Sunucuya Katılım', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
                { name: 'Roller', value: member.roles.cache.filter(r => r.name !== '@everyone').map(r => r.toString()).join(' ') || 'Rolü yok' }
            );
        return message.reply({ embeds: [embed] });
    }

    if (cmd === 'sunucubilgi') {
        const embed = new EmbedBuilder()
            .setColor('#F1C40F')
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .setTitle(`🌐 ${message.guild.name} İstatistikleri`)
            .addFields(
                { name: '👑 Sahip', value: `<@${message.guild.ownerId}>`, inline: true },
                { name: '👥 Üye Sayısı', value: `${message.guild.memberCount}`, inline: true },
                { name: '📅 Kuruluş', value: `<t:${Math.floor(message.guild.createdTimestamp / 1000)}:R>`, inline: false }
            );
        return message.reply({ embeds: [embed] });
    }

    // --- EĞLENCE KOMUTLARI ---
    if (cmd === 'ship') {
        if (!etiketlenen) return message.reply("💕 Kimi shiplemek istiyorsun? Birini etiketle!");
        const askYuzdesi = Math.floor(Math.random() * 101);
        let kalp = askYuzdesi > 80 ? '💖💖💖' : askYuzdesi > 50 ? '💘💘' : askYuzdesi > 20 ? '💔' : '🖤';
        const embed = new EmbedBuilder().setColor('#E74C3C').setTitle('💕 Aşk Ölçer').setDescription(`**${message.author.username}** ile **${etiketlenen.user.username}** arasındaki aşk:\n\n**%${askYuzdesi}** ${kalp}`);
        return message.reply({ embeds: [embed] });
    }

    if (cmd === '1vs1') {
        if (!etiketlenen) return message.reply("⚔️ Savaşmak için birini etiketle!");
        if (etiketlenen.id === message.author.id) return message.reply("Kendinle savaşamazsın!");
        const guc1 = Math.floor(Math.random() * 100);
        const guc2 = Math.floor(Math.random() * 100);
        const kazanan = guc1 > guc2 ? message.author : (guc2 > guc1 ? etiketlenen.user : 'Berabere!');
        const embed = new EmbedBuilder()
            .setColor('#E67E22')
            .setTitle('⚔️ Destansı Düello!')
            .setDescription(`**${message.author.username}** Gücü: ${guc1} 🗡️\n**${etiketlenen.user.username}** Gücü: ${guc2} 🛡️\n\n🏆 **Sonuç:** ${kazanan === 'Berabere!' ? 'Berabere!' : `${kazanan.username} paramparça etti!`}`);
        return message.reply({ embeds: [embed] });
    }

    if (cmd === 'fakemesaj') {
        if (!etiketlenen) return message.reply("👤 Birini etiketle!");
        const metin = args.slice(1).join(' ');
        if (!metin) return message.reply("📝 Söyletmek istediğin mesajı yaz!");
        await message.delete().catch(() => {});
        
        try {
            const webhook = await message.channel.createWebhook({
                name: etiketlenen.user.username,
                avatar: etiketlenen.user.displayAvatarURL({ dynamic: true })
            });
            await webhook.send({ content: metin });
            await webhook.delete();
        } catch (e) {
            message.channel.send("⚠️ Webhook oluşturma yetkim yok! (Manage Webhooks izni gerekiyor)");
        }
        return;
    }

    if (cmd === 'fast') {
        const kelimeler = ['kastuhino', 'anime', 'manga', 'roblox', 'kılıç', 'gacha', 'efsanevi'];
        const secilen = kelimeler[Math.floor(Math.random() * kelimeler.length)];
        
        await message.reply(`⌨️ **HIZLI YAZMA YARIŞI!**\nŞu kelimeyi ilk yazan kazanır: **${secilen}**\n*(Süreniz 15 saniye!)*`);
        
        const filter = m => m.content.toLowerCase() === secilen && !m.author.bot;
        const collector = message.channel.createMessageCollector({ filter, time: 15000, max: 1 });

        collector.on('collect', m => {
            m.reply(`🏆 Tebrikler **${m.author.username}**, kelimeyi doğru ve en hızlı sen yazdın!`);
        });
        collector.on('end', collected => {
            if (collected.size === 0) message.channel.send(`⏰ Süre doldu! Kimse **${secilen}** kelimesini yazamadı.`);
        });
        return;
    }

    // --- YARDIM VE MODERASYON ---
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
