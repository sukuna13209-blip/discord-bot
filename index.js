const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const http = require('http');

// --- RENDER UPTIME SUNUCUSU ---
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Kastuhino Premium Bot Aktif!\n');
}).listen(process.env.PORT || 3000);

// --- SABİT AYARLAR ---
const PARTNER_KANAL_ID = '1514756158831988876'; 
const PREFIX = 'k!';
const SUNUCU_ISMI = 'ᴋᴀsᴛᴜʜɪ̇ɴᴏ // 𝑨𝒏𝒊𝒎𝒆 & 𝑴𝒂𝒏𝒈𝒂';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration
    ]
});

// --- VERİTABANI YÖNETİMİ ---
const PARTNER_FILE = './partners.json';
const EKONOMI_FILE = './ekonomi.json';
const KARTLAR_FILE = './kartlar.json';

const okuJSON = (dosya) => fs.existsSync(dosya) ? JSON.parse(fs.readFileSync(dosya, 'utf8')) : (dosya === KARTLAR_FILE ? [] : {});
const yazJSON = (dosya, veri) => fs.writeFileSync(dosya, JSON.stringify(veri, null, 2));

let partners = okuJSON(PARTNER_FILE);
let ekonomi = okuJSON(EKONOMI_FILE);
let kartlar = okuJSON(KARTLAR_FILE);

function profilGetir(userId) {
    if (!ekonomi[userId]) ekonomi[userId] = { bakiye: 1000, envanter: [], sonGunluk: 0 };
    return ekonomi[userId];
}

// --- HİBRİT YANIT SİSTEMİ (SLASH & PREFIX ORTAK KULLANIM) ---
async function dinamikYanit(ctx, payload, editMsg = null) {
    const isSlash = !!ctx.commandName;
    if (editMsg) {
        return isSlash ? await ctx.editReply(payload) : await editMsg.edit(payload);
    }
    return isSlash ? await ctx.reply(payload) : await ctx.reply(payload);
}

// --- SİSTEM FONKSİYONLARI ---
function haftalikSiralamaBul(userId) {
    const siralanmis = Object.entries(partners).sort((a, b) => (b[1].hafta || 0) - (a[1].hafta || 0));
    const index = siralanmis.findIndex(item => item[0] === userId);
    return index !== -1 ? index + 1 : 1;
}

function rastgeleKartSec() {
    if (kartlar.length === 0) return null;
    const efsaneviler = kartlar.filter(k => (k.sinif || "").toLowerCase().includes('efsanevi'));
    const nadirler = kartlar.filter(k => (k.sinif || "").toLowerCase().includes('nadir'));
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
        const r = rastgeleKartSec();
        if (!r) continue;
        let fiyat = (r.sinif || "").toLowerCase().includes('efsanevi') ? 4000 : (r.sinif || "").toLowerCase().includes('nadir') ? 1500 : 500;
        marketKartlari.push({ ...r, fiyat });
    }
}
setInterval(marketiYenile, 3 * 60 * 60 * 1000);
marketiYenile();

function yardimMenusuOlustur(user) {
    const embed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setAuthor({ name: SUNUCU_ISMI, iconURL: user.displayAvatarURL() })
        .setTitle('💠 Merkez Kontrol Paneli')
        .setDescription(`**Prefix:** \`${PREFIX}\` veya \`/\` (Slash)\nAşağıdaki akıllı menüden kategorileri inceleyebilirsiniz.`)
        .setImage('https://i.postimg.cc/PqJ78dP6/c84c6583-884f-46c2-ba81-933db6aaeff8.png')
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId('yardim_menu').setPlaceholder('Kategori Seçin...').addOptions([
            { label: 'Ana Sayfa', value: 'ana_sayfa', emoji: '🏠' },
            { label: 'Moderasyon', value: 'mod_menu', emoji: '🔨' },
            { label: 'Ekonomi & Gacha', value: 'ekonomi_menu', emoji: '💰' }
        ])
    );
    return { embeds: [embed], components: [row] };
}

// --- ORTAK KOMUT İŞLEYİCİ ---
async function komutCalistir(komutAdi, ctx, args = []) {
    const isSlash = !!ctx.commandName;
    const user = isSlash ? ctx.user : ctx.author;
    const guild = ctx.guild;
    const userProfil = profilGetir(user.id);

    if (!partners[user.id]) partners[user.id] = { bugun: 0, hafta: 0, ay: 0, toplam: 0 };

    if (komutAdi === 'yardim') return dinamikYanit(ctx, yardimMenusuOlustur(user));

    if (komutAdi === 'bakiye') {
        const embed = new EmbedBuilder().setColor('#F1C40F').setTitle('💳 Cüzdan').setDescription(`**Bakiye:** \`${userProfil.bakiye} Anime Cash\``);
        return dinamikYanit(ctx, { embeds: [embed] });
    }

    if (komutAdi === 'gunluk') {
        const simdi = Date.now();
        if (simdi - userProfil.sonGunluk < 86400000) return dinamikYanit(ctx, { content: `⏳ Günlük ödülünü zaten aldın! Tekrar almak için beklemen gerekiyor.`, ephemeral: true });
        userProfil.bakiye += 1000;
        userProfil.sonGunluk = simdi;
        yazJSON(EKONOMI_FILE, ekonomi);
        return dinamikYanit(ctx, { embeds: [new EmbedBuilder().setColor('#2ECC71').setDescription(`🎁 **+1000 Anime Cash** hesabına eklendi!`)] });
    }

    if (komutAdi === 'gacha') {
        if (userProfil.bakiye < 300) return dinamikYanit(ctx, { content: "⚠️ Yetersiz bakiye! (Gereken: 300 Cash)", ephemeral: true });
        userProfil.bakiye -= 300;
        const secilen = rastgeleKartSec();
        if (!secilen) return dinamikYanit(ctx, { content: "⚠️ Kart bulunamadı." });

        userProfil.envanter.push(secilen);
        yazJSON(EKONOMI_FILE, ekonomi);

        // --- ŞOK EDİCİ GACHA ANİMASYONU ---
        const araEmbed = new EmbedBuilder().setColor('#2b2d31').setTitle('🔮 Büyülü Mühür Kırılıyor...').setImage('https://i.makeagif.com/media/9-28-2015/0R3bJ9.gif');
        const beklemeMesaji = await dinamikYanit(ctx, { embeds: [araEmbed], fetchReply: true });

        await new Promise(r => setTimeout(r, 2500)); // 2.5 saniye animasyon beklemesi

        const sinif = (secilen.sinif || 'Standart').toLowerCase();
        let renk = '#3498DB', rozet = '⚔️ STANDART';
        if (sinif.includes('efsanevi')) { renk = '#FFD700'; rozet = '🌟 EFSANEVİ'; }
        else if (sinif.includes('nadir')) { renk = '#9B59B6'; rozet = '💎 NADİR'; }

        const finalEmbed = new EmbedBuilder().setColor(renk).setAuthor({ name: '✨ KART ÇIKTI ✨', iconURL: user.displayAvatarURL() }).setTitle(`${rozet} — ${secilen.isim}`).setDescription(`> Kalan Bakiye: **${userProfil.bakiye} Cash**`).setImage(secilen.gorsel_link);
        const btnRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('gacha_tekrar').setLabel('Tekrar (300)').setStyle(ButtonStyle.Success).setEmoji('🎲'),
            new ButtonBuilder().setCustomId('envanter_bak').setLabel('Envanter').setStyle(ButtonStyle.Secondary).setEmoji('🎒')
        );

        return dinamikYanit(ctx, { embeds: [finalEmbed], components: [btnRow] }, beklemeMesaji);
    }

    if (komutAdi === 'partner-durum') {
        const data = partners[user.id];
        const siralama = haftalikSiralamaBul(user.id);
        const embed = new EmbedBuilder().setColor('#5865F2')
            .setAuthor({ name: `${user.username} — Partnerlik Kimliği`, iconURL: user.displayAvatarURL() })
            .addFields(
                { name: '📊 Günlük', value: `\`\`\`${data.bugun} Sunucu\`\`\``, inline: true },
                { name: '📅 Haftalık', value: `\`\`\`${data.hafta} Sunucu\`\`\``, inline: true },
                { name: '🏆 Sıralama', value: `\`\`\`#${siralama}\`\`\``, inline: true }
            )
            .setFooter({ text: SUNUCU_ISMI });
        return dinamikYanit(ctx, { embeds: [embed] });
    }

    // MODERASYON (Hem Slash hem Prefix)
    if (['sil', 'ban', 'kick', 'mute'].includes(komutAdi)) {
        const target = isSlash ? ctx.options.getUser('kullanici') || ctx.options.getInteger('miktar') : (komutAdi === 'sil' ? parseInt(args[0]) : ctx.mentions?.members?.first());
        
        if (komutAdi === 'sil') {
            if (!ctx.member.permissions.has(PermissionFlagsBits.ManageMessages)) return dinamikYanit(ctx, { content: 'Yetkin yok.', ephemeral: true });
            if (isNaN(target) || target < 1 || target > 100) return dinamikYanit(ctx, { content: '1-100 arası sayı gir.', ephemeral: true });
            await ctx.channel.bulkDelete(target, true).catch(() => {});
            return dinamikYanit(ctx, { content: `✅ **${target}** mesaj uzayın derinliklerine yollandı!`, ephemeral: true });
        }
    }
}

// --- SLASH KOMUTLARI YÜKLEME ---
client.once('ready', async () => {
    console.log(`[✓] ${client.user.tag} Yüksek Performansla Aktif!`);
    const commands = [
        new SlashCommandBuilder().setName('yardim').setDescription('Gelişmiş kontrol panelini açar.'),
        new SlashCommandBuilder().setName('bakiye').setDescription('Anime Cash bakiyeni gösterir.'),
        new SlashCommandBuilder().setName('gunluk').setDescription('24 saatte bir bedava cash al.'),
        new SlashCommandBuilder().setName('gacha').setDescription('300 Cash karşılığı animasyonlu kart çekimi!'),
        new SlashCommandBuilder().setName('partner-durum').setDescription('Partnerlik istatistiklerini gör.'),
        new SlashCommandBuilder().setName('sil').setDescription('Mesaj siler.').setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages).addIntegerOption(o => o.setName('miktar').setDescription('Silinecek miktar').setRequired(true))
    ];
    await client.application.commands.set(commands);
});

// --- ETKİLEŞİM & MESAJ DİNLEYİCİLERİ ---
client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        await komutCalistir(interaction.commandName, interaction);
    } 
    else if (interaction.isButton()) {
        const islem = interaction.customId;
        if (islem === 'gacha_tekrar') await komutCalistir('gacha', interaction);
    }
    else if (interaction.isStringSelectMenu() && interaction.customId === 'yardim_menu') {
        const secim = interaction.values[0];
        if (secim === 'ana_sayfa') return interaction.update(yardimMenusuOlustur(interaction.user));
        
        const rEmbed = new EmbedBuilder().setColor('#3498DB').setTitle(secim === 'mod_menu' ? '🔨 Moderasyon' : '💰 Ekonomi').setDescription(secim === 'mod_menu' ? `\`/sil\` veya \`${PREFIX}sil\`\n\`/ban\` veya \`${PREFIX}ban\`` : `\`/gacha\` veya \`${PREFIX}gacha\`\n\`/bakiye\` veya \`${PREFIX}bakiye\``);
        return interaction.update({ embeds: [rEmbed], components: interaction.message.components });
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    if (message.channel.id === PARTNER_KANAL_ID && (message.content.includes('discord.gg/') || message.content.includes('https://discord.gg'))) {
        if (!partners[message.author.id]) partners[message.author.id] = { bugun: 0, hafta: 0, ay: 0, toplam: 0 };
        partners[message.author.id].bugun++; partners[message.author.id].hafta++; partners[message.author.id].ay++; partners[message.author.id].toplam++;
        yazJSON(PARTNER_FILE, partners);
        message.react('✅');
    }

    if (!message.content.startsWith(PREFIX)) return;
    const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
    const cmd = args.shift().toLowerCase();
    
    const aliases = { 'günlük': 'gunluk', 'çek': 'gacha', 'yardım': 'yardim', 'partner': 'partner-durum' };
    await komutCalistir(aliases[cmd] || cmd, message, args);
});

client.login(process.env.DISCORD_TOKEN || process.env.TOKEN);
