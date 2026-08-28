const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const http = require('http');

// --- UPTIME SUNUCUSU ---
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Kastuhino Bot Aktif!\n');
});
server.listen(process.env.PORT || 3000);

// --- SABİT AYARLAR ---
const PARTNER_KANAL_ID = '1514756158831988876'; 
const PREFIX = 'k!';
const BOT_GELISTIRICI_ID = 'SeninGeliştiriciID'; // Gerekirse buraya kendi ID'ni yaz

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

function veriYukle() {
    if (fs.existsSync(PARTNER_FILE)) try { partners = JSON.parse(fs.readFileSync(PARTNER_FILE, 'utf8')); } catch(e){}
    if (fs.existsSync(EKONOMI_FILE)) try { ekonomi = JSON.parse(fs.readFileSync(EKONOMI_FILE, 'utf8')); } catch(e){}
    
    if (fs.existsSync(KARTLAR_FILE)) {
        try { 
            const okununan = JSON.parse(fs.readFileSync(KARTLAR_FILE, 'utf8'));
            if (Array.isArray(okununan) && okununan.length > 0) kartlar = okununan;
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

// --- YARDIM MENÜSÜ TASARIMI GELİŞTİRME ---
function yardimMenusuOlustur(username) {
    const embed = new EmbedBuilder()
        .setColor('#2f3136')
        .setAuthor({ name: 'Kastuhino Bot | Komut Merkezi', iconURL: client.user.displayAvatarURL() })
        .setTitle('🛠️ Kastuhino Bot — Ana Kontrol Paneli')
        .setDescription(`Selamlar, **${username}**! Ben Kastuhino, sunucunuza gelişmiş özellikler katmak için tasarlanmış bir botum. \n\n`)
        .addFields(
            { name: '📖 Kullanım Kılavuzu', value: `Aşağıdaki açılır menüyü kullanarak her kategorinin komutlarını, detaylarını ve örnek kullanımlarını öğrenebilirsiniz.\n`, inline: false },
            { name: 'Kategoriler', value: `🐱 Eğlence\n🛎️ Kullanıcı\n🔮 Gacha ve Ekonomi\n🔨 Moderasyon\n🤝 Partner Sistemi\n🛠️ Otomatik Mod`, inline: false }
        )
        .setFooter({ text: 'Kastuhino Bot Tüm Hakları Saklıdır. | Bu kod 1 saatlik uğraşla hazırlandı.' })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('yardim_menu')
            .setPlaceholder('Menüyü keşfetmek için bir kategori seçin...')
            .addOptions([
                { label: 'Ana Sayfa', value: 'ana_sayfa', emoji: '🏠', description: 'Ana yardım paneline geri dönersin.' },
                { label: 'Eğlence', value: 'eglence_menu', emoji: '🐱', description: 'Arkadaşlarınla eğlenebileceğin komutlar.' },
                { label: 'Kullanıcı', value: 'kullanici_menu', emoji: '🛎️', description: 'Avatar, profil ve kullanıcı istatistikleri.' },
                { label: 'Gacha ve Ekonomi', value: 'ekonomi_menu', emoji: '🔮', description: 'Bakiye, günlük cash, gacha çekme, envanter.' },
                { label: 'Moderasyon', value: 'mod_menu', emoji: '🔨', description: 'Sunucu düzenini sağlayan yetkili komutları.' },
                { label: 'Partner Sistemi', value: 'partner_menu', emoji: '🤝', description: 'Partnerlik sayıları, sıralama, liste.' },
                { label: 'Otomatik Mod', value: 'automod_menu', emoji: '🛠️', description: 'Reklam, küfür, link, caps engelleme ayarları.' }
            ])
    );
    return { embeds: [embed], components: [row] };
}

client.once('ready', () => { console.log(`[✓] ${client.user.tag} Tüm Sistemleriyle Aktif!`); });

client.on('interactionCreate', async interaction => {
    if (!interaction.isStringSelectMenu() || interaction.customId !== 'yardim_menu') return;
    const secim = interaction.values[0];
    const resEmbed = new EmbedBuilder().setColor('#2f3136').setTimestamp();

    if (secim === 'ana_sayfa') {
        const anaMenu = yardimMenusuOlustur(interaction.user.username);
        return interaction.update({ embeds: anaMenu.embeds, components: anaMenu.components });
    }

    if (secim === 'eglence_menu') {
        resEmbed.setAuthor({ name: '🐱 Kastuhino Bot Eğlence Komutları', iconURL: 'https://images.alphacoders.com/133/1331821.png' })
            .setTitle('Eğlence Kategorisi Komutları')
            .setDescription(`**${PREFIX}1vs1 [@üye]** - Etiketlediğiniz kişiyle düello yaparsınız. \n**${PREFIX}ship [@üye]** - Aşk uyumunuzu ölçer. \n**${PREFIX}fakemesaj [@üye] [mesaj]** - Başkası gibi mesaj atmanızı sağlar.`);
    } else if (secim === 'kullanici_menu') {
        resEmbed.setAuthor({ name: '🛎️ Kastuhino Bot Kullanıcı Komutları', iconURL: 'https://images.alphacoders.com/131/1315570.png' })
            .setTitle('Kullanıcı Kategorisi Komutları')
            .setDescription(`**${PREFIX}afk [sebep]** - AFK moduna geçersiniz. \n**${PREFIX}avatar [@üye]** - Profil fotoğrafınızı veya başkasının fotoğrafını büyütür. \n**${PREFIX}kullanıcıbilgi [@üye]** - Başkası hakkında veya kendi profiliniz hakkında bilgi verir.`);
    } else if (secim === 'ekonomi_menu') {
        resEmbed.setAuthor({ name: '🔮 Kastuhino Bot Ekonomi Komutları', iconURL: 'https://images.alphacoders.com/797/797828.png' })
            .setTitle('Gacha ve Ekonomi Kategorisi Komutları')
            .setDescription(`**${PREFIX}bakiye** - Cash miktarınızı gösterir. \n**${PREFIX}günlük** - Günlük cash ödülünüzü alırsınız. \n**${PREFIX}gacha [çek]** - Rastgele kart çeker, cash harcar. \n**${PREFIX}envanter** - Koleksiyonunuzdaki kartları listeler.`);
    } else if (secim === 'mod_menu') {
        resEmbed.setAuthor({ name: '🔨 Kastuhino Bot Moderasyon Komutları', iconURL: 'https://images.alphacoders.com/132/1325325.png' })
            .setTitle('Moderasyon Kategorisi Komutları')
            .setDescription(`**${PREFIX}ban [@üye] [sebep]** - Üyeyi sunucudan yasaklar. \n**${PREFIX}kick [@üye] [sebep]** - Üyeyi sunucudan atar. \n**${PREFIX}mute [@üye] [dakika] [sebep]** - Üyeyi susturur. \n**${PREFIX}sil [miktar]** - Kanalda belirtilen miktarda mesaj siler.`);
    } else if (secim === 'partner_menu') {
        resEmbed.setAuthor({ name: '🤝 Kastuhino Bot Partner Komutları', iconURL: 'https://images.alphacoders.com/112/1123306.png' })
            .setTitle('Partner Sistemi Kategorisi Komutları')
            .setDescription(`**${PREFIX}partner** - Partnerlik durumu hakkında detaylı bilgi verir. \n**${PREFIX}partner-sayi [@üye]** - Toplam partner sayınızı gösterir. \n**${PREFIX}partner-liste** - En çok partner yapanların listesini gösterir.`);
    } else if (secim === 'automod_menu') {
        resEmbed.setAuthor({ name: '🛠️ Kastuhino Bot Otomatik Mod Ayarları', iconURL: 'https://images.alphacoders.com/133/1331776.png' })
            .setTitle('Otomatik Mod Kategorisi Komutları')
            .setDescription(`**${PREFIX}reklamengel** - Reklam engellemeyi açar/kapatır. \n**${PREFIX}küfürengel** - Küfür engellemeyi açar/kapatır. \n**${PREFIX}linkengel** - Link engellemeyi açar/kapatır. \n**${PREFIX}capsengel** - Caps engellemeyi açar/kapatır.`);
    }

    interaction.update({ embeds: [resEmbed], components: interaction.message.components });
});

client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    if (afkVeri[message.author.id]) {
        delete afkVeri[message.author.id]; veriKaydet(AFK_FILE, afkVeri);
        message.reply(`👋 Hoş geldin! AFK modundan çıktın.`).then(m => setTimeout(() => m.delete(), 5000));
    }
    message.mentions.users.forEach(u => { if (afkVeri[u.id]) message.reply(`💤 **${u.username}** şu an AFK. Sebep: *${afkVeri[u.id]}*`); });

    // --- OTOMATİK PARTNER SİSTEMİ ---
    if (message.channel.id === PARTNER_KANAL_ID) {
        const icerik = message.content.toLowerCase();
        if (icerik.includes('discord.gg/') || icerik.includes('discord.com/invite/')) {
            const userId = message.author.id;
            if (!partners[userId]) partners[userId] = { sayi: 0, isim: message.author.tag };
            partners[userId].sayi += 1; partners[userId].isim = message.author.tag;
            veriKaydet(PARTNER_FILE, partners);
            
            message.react('✅').catch(() => {});

            const sayi = partners[userId].sayi;
            const partnerEmbed = new EmbedBuilder()
                .setColor('#2f3136') // TASARIM GELİŞTİRME: Renk
                .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
                .setTitle('🤝 Partnerlik Başarıyla Sayıldı!') // TASARIM GELİŞTİRME: Başlık
                .addFields(
                    { name: 'Bugünlük Partnerin:', value: `${sayi}`, inline: false },
                    { name: 'Haftalık Partnerin:', value: `${sayi}`, inline: false },
                    { name: 'Aylık Partnerin:', value: `${sayi}`, inline: false },
                    { name: 'Toplam Partnerin:', value: `${sayi}`, inline: false },
                    { name: 'Haftalık Sıralaman:', value: '#1', inline: false }
                )
                // --- İSTEK 1: Thumbnail Sunucu PP'si ---
                .setThumbnail(message.guild.iconURL({ dynamic: true })) 
                .setImage("https://images.alphacoders.com/112/1123306.png"); // Büyük afiş resmi
            
            message.reply({ content: `🎉 **Partnerlik sayıldı! İstatistiklerin güncellendi.**`, embeds: [partnerEmbed] }).catch(() => {});
        }
    }

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

    if (cmd === 'yardım' || cmd === 'yardim') { return message.reply(yardimMenusuOlustur(message.author.username)); }

    // --- PARTNER SİSTEMİ KOMUTLARI TASARIM GELİŞTİRME ---
    if (cmd === 'partner') {
        const partnerEmbed = new EmbedBuilder()
            .setColor('#2f3136')
            .setAuthor({ name: '🤝 Partnerlik Merkezi', iconURL: 'https://images.alphacoders.com/112/1123306.png' })
            .setTitle('🤝 Partner Sistemi Detayları')
            .setDescription(`Partner kanalına davet linki içeren ilan attığınızda başarılı olan her partnerlik otomatik olarak sayılır.\nBu komutla partnerlik durumunuzu, toplam sayınızı ve sıralamanızı görebilirsiniz.`)
            .addFields(
                { name: 'Nasıl Çalışır?', value: 'İlanınızı partner kanalına gönderin, bot otomatik olarak ✅ ile onaylayacak ve embed profilinizi gönderecektir.', inline: false },
                { name: 'Komutlar', value: `k!partner-sayi [@üye]\nk!partner-liste`, inline: false }
            )
            .setFooter({ text: 'Kastuhino Partner Sistemi' })
            .setTimestamp();
        return message.reply({ embeds: [partnerEmbed] });
    }

    if (cmd === 'partner-sayi' || cmd === 'partnersayi') {
        const hedef = etiketlenen ? etiketlenen.user : message.author;
        const veri = partners[hedef.id] ? partners[hedef.id].sayi : 0;
        const veriEmbed = new EmbedBuilder()
            .setColor('#2f3136')
            .setAuthor({ name: 'Partner Bilgisi', iconURL: 'https://images.alphacoders.com/112/1123306.png' })
            .setTitle(`👤 **${hedef.username}** Partner İstatistikleri`)
            .setDescription(`**Toplam Başarılı Partner Sayısı:** **${veri}**`);
        return message.reply({ embeds: [veriEmbed] });
    }

    if (cmd === 'partner-liste' || cmd === 'partnerliste') {
        const keys = Object.keys(partners);
        if (keys.length === 0) return message.reply("📁 Henüz kayıtlı partner verisi bulunmuyor.");
        const sirali = keys.sort((a, b) => partners[b].sayi - partners[a].sayi).slice(0, 10);
        const embed = new EmbedBuilder().setColor('#2f3136').setAuthor({ name: '🏆 Top Partner Listesi', iconURL: 'https://images.alphacoders.com/112/1123306.png' }).setTitle('🏆 Sunucuda En Çok Partner Yapanlar');
        let desc = '';
        sirali.forEach((id, index) => { desc += `**${index + 1}.** <@${id}> — **${partners[id].sayi}** Partner\n`; });
        embed.setDescription(desc);
        return message.reply({ embeds: [embed] });
    }

    // --- EKONOMİ KOMUTLARI TASARIM GELİŞTİRME ---
    if (cmd === 'bakiye') {
        const p = profilGetir(message.author.id);
        const bakiyeEmbed = new EmbedBuilder()
            .setColor('#2f3136')
            .setAuthor({ name: 'Ekonomi Merkezi', iconURL: 'https://images.alphacoders.com/797/797828.png' })
            .setTitle(`💰 **${message.author.username}** Cash Bakiyesi`)
            .setDescription(`${message.author}, hesabında tam **${p.bakiye} Cash** var!`);
        return message.reply({ embeds: [bakiyeEmbed] });
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
        const gunlukEmbed = new EmbedBuilder()
            .setColor('#2f3136')
            .setAuthor({ name: 'Ekonomi Merkezi', iconURL: 'https://images.alphacoders.com/797/797828.png' })
            .setTitle(`🎁 Günlük Cash Ödülü`)
            .setDescription(`${message.author}, hesabına tam **1000 Cash** eklendi!`);
        return message.reply({ embeds: [gunlukEmbed] });
    }

    if (cmd === 'market') {
        const marketEmbed = new EmbedBuilder().setColor('#2f3136').setAuthor({ name: 'Ekonomi Merkezi', iconURL: 'https://images.alphacoders.com/797/797828.png' }).setTitle('🛒 Kart Marketi');
        kartlar.slice(0, 5).forEach((k, i) => marketEmbed.addFields({ name: `${i + 1}. ${k.isim} (${k.sinif})`, value: `Fiyat: **1500 Cash**`, inline: false }));
        return message.reply({ embeds: [marketEmbed] });
    }

    if (cmd === 'al') {
        const sira = parseInt(args[0]) - 1;
        if (isNaN(sira) || sira < 0 || sira >= kartlar.length) return message.reply(`⚠️ Geçerli bir sıra belirt! Örn: \`${PREFIX}al 1\``);
        const p = profilGetir(message.author.id);
        if (p.bakiye < 1500) return message.reply("⚠️ Yetersiz bakiye! Kartın fiyatı 1500 Cash.");
        p.bakiye -= 1500; p.envanter.push(kartlar[sira]);
        veriKaydet(EKONOMI_FILE, ekonomi);
        const alEmbed = new EmbedBuilder()
            .setColor('#2f3136')
            .setAuthor({ name: 'Ekonomi Merkezi', iconURL: 'https://images.alphacoders.com/797/797828.png' })
            .setTitle(`✅ Kart Başarıyla Alındı`)
            .setDescription(`**${kartlar[sira].isim}** kartı koleksiyonuna eklendi!`);
        return message.reply({ embeds: [alEmbed] });
    }

    if (cmd === 'envanter') {
        const p = profilGetir(message.author.id);
        const envanterEmbed = new EmbedBuilder().setColor('#2f3136').setAuthor({ name: 'Ekonomi Merkezi', iconURL: 'https://images.alphacoders.com/797/797828.png' }).setTitle(`🎒 ${message.author.username} Envanteri`);
        if (p.envanter.length === 0) envanterEmbed.setDescription("🎒 Envanterin bomboş.");
        else { let desc = ''; p.envanter.forEach((k, i) => { desc += `**${i + 1}.** ${k.isim} (${k.sinif})\n`; }); envanterEmbed.setDescription(desc); }
        return message.reply({ embeds: [envanterEmbed] });
    }

    if (cmd === 'gacha') {
        const p = profilGetir(message.author.id);
        if (p.bakiye < 500) return message.reply("⚠️ Gacha çekmek için **500 Cash** gerekiyor!");
        p.bakiye -= 500; const kart = kartlar[Math.floor(Math.random() * kartlar.length)]; p.envanter.push(kart);
        veriKaydet(EKONOMI_FILE, ekonomi);
        const gachaEmbed = new EmbedBuilder()
            .setColor('#2f3136')
            .setAuthor({ name: 'Ekonomi Merkezi', iconURL: 'https://images.alphacoders.com/797/797828.png' })
            .setTitle(`🔮 Gacha Kristali Çekildi!`)
            .setDescription(`Tebrikler! Kristalden **${kart.isim}** (${kart.sinif}) kartı çıktı!`)
            .setImage(kart.gorsel_link);
        return message.reply({ embeds: [gachaEmbed] });
    }

    // --- MODERASYON KOMUTLARI TASARIM GELİŞTİRME ---
    if (cmd === 'sil') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply("⚠️ Mesajları yönet yetkin yok!");
        const miktar = parseInt(args[0]);
        if (isNaN(miktar) || miktar < 1 || miktar > 100) return message.reply("⚠️ 1 ile 100 arasında bir sayı gir!");
        await message.channel.bulkDelete(miktar, true).catch(() => {});
        const silEmbed = new EmbedBuilder()
            .setColor('#2f3136')
            .setAuthor({ name: 'Moderasyon Merkezi', iconURL: 'https://images.alphacoders.com/132/1325325.png' })
            .setTitle(`✅ Mesajlar Başarıyla Silindi`)
            .setDescription(`Kanalda tam **${miktar}** adet mesaj silindi!`);
        return message.channel.send({ embeds: [silEmbed] }).then(m => setTimeout(() => m.delete(), 3000));
    }

    if (cmd === 'ban') {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) return message.reply("⚠️ Üyeleri yasakla yetkin yok!");
        if (!etiketlenen) return message.reply("⚠️ Yasaklanacak üyeyi etiketlemelisin!");
        if (!etiketlenen.bannable) return message.reply("⚠️ Bu üyeyi yasaklayamıyorum.");
        const sebep = args.slice(1).join(' ') || 'Belirtilmedi';
        await etiketlenen.ban({ reason: sebep }).catch(() => {});
        const banEmbed = new EmbedBuilder()
            .setColor('#2f3136')
            .setAuthor({ name: 'Moderasyon Merkezi', iconURL: 'https://images.alphacoders.com/132/1325325.png' })
            .setTitle(`🔨 Üye Yasaklandı`)
            .setDescription(`**${etiketlenen.user.tag}** sunucudan yasaklandı! Sebep: *${sebep}*`);
        return message.reply({ embeds: [banEmbed] });
    }

    if (cmd === 'kick') {
        if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) return message.reply("⚠️ Üyeleri at yetkin yok!");
        if (!etiketlenen) return message.reply("⚠️ Atılacak üyeyi etiketlemelisin!");
        if (!etiketlenen.kickable) return message.reply("⚠️ Bu üyeyi atamıyorum.");
        const sebep = args.slice(1).join(' ') || 'Belirtilmedi';
        await etiketlenen.kick(sebep).catch(() => {});
        const kickEmbed = new EmbedBuilder()
            .setColor('#2f3136')
            .setAuthor({ name: 'Moderasyon Merkezi', iconURL: 'https://images.alphacoders.com/132/1325325.png' })
            .setTitle(`👢 Üye Atıldı`)
            .setDescription(`**${etiketlenen.user.tag}** sunucudan atıldı! Sebep: *${sebep}*`);
        return message.reply({ embeds: [kickEmbed] });
    }

    if (cmd === 'mute') {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return message.reply("⚠️ Susturma yetkin yok!");
        if (!etiketlenen) return message.reply("⚠️ Susturulacak üyeyi etiketlemelisin!");
        const dakika = parseInt(args[1]);
        if (isNaN(dakika) || dakika < 1) return message.reply("⚠️ Geçerli bir süre (dakika) gir!");
        const sebep = args.slice(2).join(' ') || 'Belirtilmedi';
        await etiketlenen.timeout(dakika * 60 * 1000, sebep).catch(() => {});
        const muteEmbed = new EmbedBuilder()
            .setColor('#2f3136')
            .setAuthor({ name: 'Moderasyon Merkezi', iconURL: 'https://images.alphacoders.com/132/1325325.png' })
            .setTitle(`🔇 Üye Susturuldu`)
            .setDescription(`**${etiketlenen.user.tag}** ${dakika} dakika susturuldu! Sebep: *${sebep}*`);
        return message.reply({ embeds: [muteEmbed] });
    }

    // --- EĞLENCE KOMUTLARI TASARIM GELİŞTİRME ---
    if (cmd === 'ship') {
        if (!etiketlenen) return message.reply("💕 Birini etiketlemelisin!");
        const yuzdeOrani = Math.floor(Math.random() * 101);
        const shipEmbed = new EmbedBuilder()
            .setColor('#2f3136')
            .setAuthor({ name: 'Eğlence Merkezi', iconURL: 'https://images.alphacoders.com/133/1331821.png' })
            .setTitle(`💕 Aşk Uyumu`)
            .setDescription(`**${message.author.username}** x **${etiketlenen.user.username}**\nAşk Yüzdesi: **%${yuzdeOrani}**`);
        return message.reply({ embeds: [shipEmbed] });
    }

    // --- OTOMATİK MOD AYARLARI TASARIM GELİŞTİRME ---
    if (cmd === 'küfürengel' || cmd === 'kufurengel') {
        ayarlar.kufurEngel = !ayarlar.kufurEngel;
        veriKaydet(AYARLAR_FILE, ayarlar);
        const embed = new EmbedBuilder().setColor('#2f3136').setAuthor({ name: 'Kastuhino Bot Otomatik Mod', iconURL: 'https://images.alphacoders.com/133/1331776.png' }).setTitle(`🛠️ Küfür Engelleme Güncellendi`).setDescription(`Küfür Engelleme: **${ayarlar.kufurEngel ? 'Açık' : 'Kapalı'}**`);
        message.reply({ embeds: [embed] });
    }

    if (cmd === 'reklamengel') {
        ayarlar.reklamEngel = !ayarlar.reklamEngel;
        veriKaydet(AYARLAR_FILE, ayarlar);
        const embed = new EmbedBuilder().setColor('#2f3136').setAuthor({ name: 'Kastuhino Bot Otomatik Mod', iconURL: 'https://images.alphacoders.com/133/1331776.png' }).setTitle(`🛠️ Reklam Engelleme Güncellendi`).setDescription(`Reklam Engelleme: **${ayarlar.reklamEngel ? 'Açık' : 'Kapalı'}**`);
        message.reply({ embeds: [embed] });
    }

    if (cmd === 'linkengel') {
        ayarlar.linkEngel = !ayarlar.linkEngel;
        veriKaydet(AYARLAR_FILE, ayarlar);
        const embed = new EmbedBuilder().setColor('#2f3136').setAuthor({ name: 'Kastuhino Bot Otomatik Mod', iconURL: 'https://images.alphacoders.com/133/1331776.png' }).setTitle(`🛠️ Link Engelleme Güncellendi`).setDescription(`Link Engelleme: **${ayarlar.linkEngel ? 'Açık' : 'Kapalı'}**`);
        message.reply({ embeds: [embed] });
    }

    if (cmd === 'capsengel') {
        ayarlar.capsEngel = !ayarlar.capsEngel;
        veriKaydet(AYARLAR_FILE, ayarlar);
        const embed = new EmbedBuilder().setColor('#2f3136').setAuthor({ name: 'Kastuhino Bot Otomatik Mod', iconURL: 'https://images.alphacoders.com/133/1331776.png' }).setTitle(`🛠️ Caps Engelleme Güncellendi`).setDescription(`Caps Engelleme: **${ayarlar.capsEngel ? 'Açık' : 'Kapalı'}**`);
        message.reply({ embeds: [embed] });
    }

    // --- AFK SİSTEMİ TASARIM GELİŞTİRME ---
    if (cmd === 'afk') {
        const sebep = args.join(' ') || 'Belirtilmedi'; afkVeri[message.author.id] = sebep; veriKaydet(AFK_FILE, afkVeri);
        const embed = new EmbedBuilder().setColor('#2f3136').setAuthor({ name: 'AFK Sistemi', iconURL: 'https://images.alphacoders.com/131/1315570.png' }).setTitle(`💤 AFK Modu Aktif`).setDescription(`Artık AFK modundasınız. Sebep: *${sebep}*`);
        message.reply({ embeds: [embed] });
    }

});

client.login(process.env.DISCORD_TOKEN);
