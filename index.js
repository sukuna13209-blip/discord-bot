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
const PREFIX = 'k!';

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

// --- HAFTALIK SIRALAMA HESAPLAMA MOTORU ---
function haftalikSiralamaBul(userId) {
    const siralanmis = Object.entries(partners)
        .sort((a, b) => (b[1].hafta || 0) - (a[1].hafta || 0));
    const index = siralanmis.findIndex(item => item[0] === userId);
    return index !== -1 ? index + 1 : 1;
}

// --- PARTNER EMBED TASARIMI ---
function createPartnerEmbed(user, data, guild) {
    const siralama = haftalikSiralamaBul(user.id);
    const embed = new EmbedBuilder()
        .setColor('#6b21ff')
        .setAuthor({ 
            name: user.tag, 
            iconURL: user.displayAvatarURL({ dynamic: true }) 
        })
        .setTitle('Partnerlik Profili')
        .setDescription(
            `**Bugünlük Partnerin:** ${data.bugun || 0}\n` +
            `**Haftalık Partnerin:** ${data.hafta || 0}\n` +
            `**Aylık Partnerin:** ${data.ay || 0}\n` +
            `**Toplam Partnerin:** ${data.toplam || 0}\n` +
            `**Haftalık Sıralaman:** #${siralama}`
        )
        .setImage('https://i.postimg.cc/PqJ78dP6/c84c6583-884f-46c2-ba81-933db6aaeff8.png') // Alt kısımdaki büyük afiş resmi
        .setTimestamp();

    // Sağ üstteki küçük resim (Sunucu Logosu / PP'si)
    if (guild && guild.iconURL()) {
        embed.setThumbnail(guild.iconURL({ dynamic: true, size: 512 }));
    }

    return embed;
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

// --- Kapsamlı Yardım Menüsü ---
function yardimMenusuOlustur(username) {
    const embed = new EmbedBuilder()
        .setColor('#2F3136')
        .setTitle('🛡️ Kastuhino Bot — Kapsamlı Yardım & Kontrol Paneli')
        .setDescription(
            `Merhaba **${username}**, Kastuhino Bot komut rehberine hoş geldin.\n\n` +
            `🔹 **Bot Ön Eki (Prefix):** \`${PREFIX}\` veya \`/\`\n\n` +
            `Aşağıdaki açılır menüyü kullanarak kategoriler arasında geçiş yapabilirsiniz.\n\n` +
            `📂 **Kategoriler:**\n` +
            `• 🔨 **Moderasyon:** Ban, mute, rol, uyarı ve jüri yargılama sistemi\n` +
            `• 🔒 **Kanal Yönetimi:** Kanal kilitleme ve genel bakım modu\n` +
            `• ⚙️ **Sunucu Ayarları:** Denetim masası, tag, otorol, log ve bilet ayarları\n` +
            `• 🌐 **Genel & Sistemler:** Ses bağlantısı, çekiliş, oylama, davet ve AFK\n` +
            `• 💰 **Ekonomi & Eğlence:** Bakiye, gacha ve kart koleksiyon sistemi`
        );

    const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('yardim_menu')
            .setPlaceholder('Kategori seçmek için buraya tıklayın...')
            .addOptions([
                { label: 'Ana Sayfa', description: 'Yardım panelinin ana ekranına döner.', value: 'ana_sayfa', emoji: '🏠' },
                { label: 'Moderasyon', description: 'Ban, mute, rol, uyarı ve jüri yargılama komutları.', value: 'mod_menu', emoji: '🔨' },
                { label: 'Kanal Yönetimi', description: 'Kanal kilitleme ve bakım modu komutları.', value: 'kanal_menu', emoji: '🔒' },
                { label: 'Sunucu Ayarları', description: 'Denetim masası, tag, otorol, log ve bilet ayarları.', value: 'sunucu_ayar_menu', emoji: '⚙️' },
                { label: 'Genel & Sistemler', description: 'Ses, çekiliş, oylama, davet, ticket ve AFK sistemleri.', value: 'genel_menu', emoji: '🌐' },
                { label: 'Ekonomi & Eğlence', description: 'Bakiye, market, gacha ve anime kartları.', value: 'ekonomi_menu', emoji: '💰' }
            ])
    );
    return { embeds: [embed], components: [row] };
}

// --- SLASH KOMUTLARI ---
client.once('ready', async () => {
    console.log(`[✓] ${client.user.tag} aktif ve operasyonel!`);
    const commands = [
        new SlashCommandBuilder().setName('yardim').setDescription('Yardım panelini açar.'),
        new SlashCommandBuilder().setName('bakiye').setDescription('Cüzdanındaki Anime Cash miktarını gösterir.'),
        new SlashCommandBuilder().setName('gunluk').setDescription('Günlük Anime Cash ödülünü alırsın.'),
        new SlashCommandBuilder().setName('market').setDescription('Kart marketini gösterir.'),
        new SlashCommandBuilder().setName('kart-al').setDescription('Marketten kart satın alır.').addIntegerOption(o => o.setName('no').setDescription('Market sırası (1-3)').setRequired(true)),
        new SlashCommandBuilder().setName('envanter').setDescription('Sahip olduğun kartları listeler.'),
        new SlashCommandBuilder().setName('gacha').setDescription('Şansına kart düşürür (300 Cash).'),
        new SlashCommandBuilder().setName('kart-bilgi').setDescription('Veritabanındaki kartları listeler.'),
        new SlashCommandBuilder().setName('partner-durum').setDescription('Partnerlik profili kartınızı gösterir.'),
        new SlashCommandBuilder().setName('sil').setDescription('Mesaj temizler.').setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages).addIntegerOption(opt => opt.setName('miktar').setDescription('Miktar').setRequired(true))
    ].map(command => command.toJSON());

    try {
        await client.application.commands.set(commands);
        console.log('✨ Slash komutları senkronize edildi.');
    } catch (e) { console.error('Slash yükleme hatası:', e); }
});

// --- KOMUT İŞLEME MERKEZİ ---
function komutIsle(isim, user, args = [], guild = null) {
    const embed = new EmbedBuilder().setTimestamp();
    const userProfil = profilGetir(user.id);

    if (!partners[user.id]) {
        partners[user.id] = { bugun: 0, hafta: 0, ay: 0, toplam: 0 };
    }

    if (isim === 'yardim') return yardimMenusuOlustur(user.username);

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
        if (marketKartlari.length === 0) return { content: "🛒 Markette şu an aktif kart yok." };
        embed.setColor('#9B59B6').setTitle('🛒 Kastuhino Kart Marketi').setDescription(`Satıştaki kartlar (\`${PREFIX}al <1-3>\`):`);
        marketKartlari.forEach((k, idx) => {
            embed.addFields({ name: `${idx + 1}. ${k.isim} (${k.sinif || 'Standart'})`, value: `Fiyat: **${k.fiyat} Cash**\n[Görsel](${k.gorsel_link})`, inline: false });
        });
        return { embeds: [embed] };
    }

    if (isim === 'kart-al') {
        const secim = parseInt(args[0]) - 1;
        if (isNaN(secim) || secim < 0 || secim >= marketKartlari.length) return { content: `⚠️ Geçerli bir sıra belirt! Örnek: \`${PREFIX}al 1\`` };
        const alinacak = marketKartlari[secim];
        if (userProfil.bakiye < alinacak.fiyat) return { content: `⚠️ Yeterli paran yok! Gereken: **${alinacak.fiyat}**` };

        userProfil.bakiye -= alinacak.fiyat;
        userProfil.envanter.push(alinacak);
        ekonomiKaydet();

        embed.setColor('#2ECC71').setTitle('🎉 Satın Alındı!').setDescription(`${user}, **${alinacak.isim}** kartını aldın!`);
        return { embeds: [embed] };
    }

    if (isim === 'envanter') {
        if (userProfil.envanter.length === 0) return { content: "🎒 Envanterin boş." };
        embed.setColor('#3498DB').setTitle(`🎒 ${user.username} - Envanter`);
        userProfil.envanter.forEach((k, idx) => {
            embed.addFields({ name: `${idx + 1}. ${k.isim}`, value: `Sınıf: ${k.sinif || 'Standart'}`, inline: true });
        });
        return { embeds: [embed] };
    }

    // --- 2. FOTOĞRAFDAKİ BİREBİR GACHA / KART ÇEKME TASARIMI ---
    if (isim === 'gacha') {
        if (userProfil.bakiye < 300) return { content: "⚠️ 300 Cash gerekiyor!" };
        userProfil.bakiye -= 300;
        const secilen = rastgeleKartSec();
        if (!secilen) return { content: "⚠️ Veritabanında kart yok." };
        userProfil.envanter.push(secilen);
        ekonomiKaydet();

        embed.setColor('#2F3136')
            .setTitle(`${secilen.isim}`)
            .setDescription(
                `**Sınıfı / Nadirliği:** ${secilen.sinif || 'Standart'}\n\n` +
                `Kastuhino Koleksiyon Seti'nden yeni bir kart çıkardın!`
            )
            .setImage(secilen.gorsel_link)
            .setFooter({ 
                text: `${user.tag} tarafından çekildi`, 
                iconURL: user.displayAvatarURL({ dynamic: true }) 
            });

        return { embeds: [embed] };
    }

    if (isim === 'kart-bilgi') {
        if (kartlar.length === 0) return { content: "⚠️ Veritabanında kart yok." };
        embed.setColor('#F1C40F').setTitle('🃏 Tüm Kartlar');
        kartlar.forEach((k, i) => embed.addFields({ name: `${i + 1}. ${k.isim}`, value: `Sınıf: ${k.sinif || 'Standart'}`, inline: false }));
        return { embeds: [embed] };
    }

    if (isim === 'partner-durum') {
        return { embeds: [createPartnerEmbed(user, partners[user.id], guild)] };
    }
}

// --- ETKİLEŞİM YÖNETİMİ (Select Menu & Slash) ---
client.on('interactionCreate', async interaction => {
    if (interaction.isStringSelectMenu() && interaction.customId === 'yardim_menu') {
        const secim = interaction.values[0];

        if (secim === 'ana_sayfa') {
            return interaction.update(yardimMenusuOlustur(interaction.user.username));
        }

        const resEmbed = new EmbedBuilder().setColor('#3498DB').setTimestamp();

        if (secim === 'mod_menu') {
            resEmbed.setTitle('🔨 Moderasyon Komutları').setDescription(`• \`${PREFIX}ban @üye [sebep]\` - Yasaklar\n• \`${PREFIX}kick @üye [sebep]\` - Atar\n• \`${PREFIX}mute @üye [dakika]\` - Susturur\n• \`${PREFIX}sil [1-100]\` - Mesaj siler\n• \`${PREFIX}uyar\` / \`${PREFIX}sicil\` - Uyarı sistemleri`);
        } else if (secim === 'kanal_menu') {
            resEmbed.setTitle('🔒 Kanal Yönetimi Komutları').setDescription(`• \`${PREFIX}lock\` - Kanalı kapatır\n• \`${PREFIX}unlock\` - Kanalı açar\n• \`${PREFIX}bakım aç <süre>\` - Bakım modu`);
        } else if (secim === 'sunucu_ayar_menu') {
            resEmbed.setTitle('⚙️ Sunucu Ayarları Komutları').setDescription(`• \`${PREFIX}tagayar <tag>\` - Tag ayarlar\n• \`${PREFIX}otorol ayarla @rol\` - Otorol\n• \`${PREFIX}logayar\` - Log kanalı`);
        } else if (secim === 'genel_menu') {
            resEmbed.setTitle('🌐 Genel Komutlar & Sistemler').setDescription(`• \`${PREFIX}çekiliş\` • \`${PREFIX}oylama\` • \`${PREFIX}davet\` • \`${PREFIX}afk\``);
        } else if (secim === 'ekonomi_menu') {
            resEmbed.setTitle('💰 Ekonomi & Kart Sistemi').setDescription(`• \`${PREFIX}bakiye\` • \`${PREFIX}gunluk\` • \`${PREFIX}market\` • \`${PREFIX}al [1-3]\` • \`${PREFIX}envanter\` • \`${PREFIX}gacha\``);
        }

        return interaction.update({ embeds: [resEmbed], components: interaction.message.components });
    }

    if (!interaction.isChatInputCommand()) return;
    const { commandName } = interaction;

    if (commandName === 'sil') {
        const miktar = interaction.options.getInteger('miktar');
        await interaction.channel.bulkDelete(miktar, true).catch(() => {});
        return interaction.reply({ content: `✅ **${miktar}** mesaj silindi!`, ephemeral: true });
    }

    let arg = null;
    if (commandName === 'kart-al') arg = interaction.options.getInteger('no');

    const sonuc = komutIsle(commandName, interaction.user, [arg], interaction.guild);
    if (sonuc) await interaction.reply(sonuc);
});

// --- MESAJLAR VE OTOMATİK PARTNER SAYAÇ ---
client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    if (!partners[message.author.id]) {
        partners[message.author.id] = { bugun: 0, hafta: 0, ay: 0, toplam: 0 };
    }

    // OTOMATİK PARTNER SAYAÇ (Belirttiğin Kanal ID)
    if (message.channel.id === PARTNER_KANAL_ID) {
        const text = message.content.toLowerCase();
        if (text.includes('https://discord.gg') || text.includes('discord.gg/')) {
            partners[message.author.id].bugun += 1;
            partners[message.author.id].hafta += 1;
            partners[message.author.id].ay += 1;
            partners[message.author.id].toplam += 1;
            savePartners();

            const embed = createPartnerEmbed(message.author, partners[message.author.id], message.guild);
            return message.reply({ content: '✅ Partnerlik sayıldı!', embeds: [embed] });
        }
    }

    // MODERASYON PREFIX KOMUTLARI (k!)
    if (message.content.startsWith(`${PREFIX}mute`) || message.content.startsWith(`${PREFIX}sustur`)) {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return message.reply('⚠️ Yetkin yok.');
        const target = message.mentions.members.first();
        if (!target) return message.reply('⚠️ Üye etiketle!');
        await target.timeout(10 * 60 * 1000, `${PREFIX}mute`).catch(() => {});
        return message.reply(`✅ **${target.user.tag}** susturuldu.`);
    }

    if (message.content.startsWith(`${PREFIX}kick`)) {
        if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) return message.reply('⚠️ Yetkin yok.');
        const target = message.mentions.members.first();
        if (!target) return message.reply('⚠️ Üye etiketle!');
        await target.kick().catch(() => {});
        return message.reply(`✅ **${target.user.tag}** atıldı.`);
    }

    if (message.content.startsWith(`${PREFIX}ban`)) {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) return message.reply('⚠️ Yetkin yok.');
        const target = message.mentions.members.first();
        if (!target) return message.reply('⚠️ Üye etiketle!');
        await target.ban().catch(() => {});
        return message.reply(`✅ **${target.user.tag}** yasaklandı.`);
    }

    if (message.content.startsWith(`${PREFIX}sil`)) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply('⚠️ Yetkin yok.');
        const args = message.content.split(/\s+/);
        const miktar = parseInt(args[1]);
        if (isNaN(miktar) || miktar < 1 || miktar > 100) return message.reply('⚠️ 1 ile 100 arasında bir sayı belirt!');
        await message.channel.bulkDelete(miktar, true).catch(() => {});
        return message.reply(`✅ **${miktar}** mesaj silindi!`).then(msg => setTimeout(() => msg.delete().catch(() => {}), 3000));
    }

    if (!message.content.startsWith(PREFIX)) return;

    const parts = message.content.slice(PREFIX.length).trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const arg1 = parts[1];

    let islenen = cmd;
    if (cmd === 'günlük') islenen = 'gunluk';
    if (cmd === 'al') islenen = 'kart-al';
    if (cmd === 'çek' || cmd === 'gacha' || (cmd === 'kart' && arg1 === 'çek')) islenen = 'gacha';
    if (cmd === 'kart' && arg1 === 'bilgi') islenen = 'kart-bilgi';
    if (cmd === 'partner' && arg1 === 'durum') islenen = 'partner-durum';
    if (cmd === 'yardım') islenen = 'yardim';

    const sonuc = komutIsle(islenen, message.author, [arg1], message.guild);
    if (sonuc) await message.reply(sonuc);
});

client.login(process.env.DISCORD_TOKEN || process.env.TOKEN);
