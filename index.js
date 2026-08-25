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
try { kartlar = JSON.parse(fs.readFileSync('./kartlar.json', 'utf8')); } catch (e) { console.log("⚠️ kartlar.json okunamadı veya boş!"); }

let partnerler = [];
try { partnerler = JSON.parse(fs.readFileSync('./partners.json', 'utf8')); } catch (e) { console.log("⚠️ partners.json okunamadı veya boş!"); }

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

// --- DENGELİ KART SEÇİM SİSTEMİ ---
function rastgeleKartSec() {
    if (kartlar.length === 0) return null;

    const efsaneviler = kartlar.filter(k => k.sinif && (k.sinif.toLowerCase().includes('efsanevi') || k.sinif.toLowerCase().includes('legendary')));
    const nadirler = kartlar.filter(k => k.sinif && (k.sinif.toLowerCase().includes('nadir') || k.sinif.toLowerCase().includes('rare')));
    const normaller = kartlar.filter(k => !efsaneviler.includes(k) && !nadirler.includes(k));

    const sans = Math.random() * 100;

    if (sans < 60 && normaller.length > 0) {
        return normaller[Math.floor(Math.random() * normaller.length)];
    } else if (sans < 90 && nadirler.length > 0) {
        return nadirler[Math.floor(Math.random() * nadirler.length)];
    } else if (efsaneviler.length > 0) {
        return efsaneviler[Math.floor(Math.random() * efsaneviler.length)];
    }

    return kartlar[Math.floor(Math.random() * kartlar.length)];
}

// --- 3 SAATTE BİR YENİLENEN MARKET ---
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
    console.log("🛒 Kart marketi güncellendi!");
}
setInterval(marketiYenile, 3 * 60 * 60 * 1000);
marketiYenile();

// --- SLASH KOMUTLARI TANIMLAMASI ---
const commands = [
    new SlashCommandBuilder().setName('yardim').setDescription('Yardım panelini açar.'),
    new SlashCommandBuilder().setName('bakiye').setDescription('Cüzdanındaki Anime Cash miktarını gösterir.'),
    new SlashCommandBuilder().setName('gunluk').setDescription('Günlük Anime Cash ödülünü alırsın.'),
    new SlashCommandBuilder().setName('market').setDescription('3 saatte bir yenilenen kart marketini gösterir.'),
    new SlashCommandBuilder().setName('kart-al').setDescription('Marketten kart satın alır.').addIntegerOption(o => o.setName('no').setDescription('Market sırası (1, 2 veya 3)').setRequired(true)),
    new SlashCommandBuilder().setName('envanter').setDescription('Sahip olduğun kartları listeler.'),
    new SlashCommandBuilder().setName('gacha').setDescription('Şansına kutudan rastgele anime karakteri düşürür (Ücretli: 300 Cash).'),
    new SlashCommandBuilder().setName('kart-bilgi').setDescription('Veritabanındaki tüm kartları listeler.'),
    new SlashCommandBuilder().setName('partner').setDescription('Partner sunucuları gösterir.')
].map(command => command.toJSON());

client.on('ready', async () => {
    console.log(`${client.user.tag} aktif ve hazır!`);
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✨ Slash komutları başarıyla yüklendi.');
    } catch (e) { console.error(e); }
});

// --- YARDIM MENÜSÜ GÖRSELİ (4 Kategorili) ---
function yardimMenusuOlustur() {
    const embed = new EmbedBuilder()
        .setColor('#2F3136')
        .setTitle('🛡️ Kastuhino Bot — Kapsamlı Yardım & Kontrol Paneli')
        .setDescription('Kastuhino Bot komut rehberine hoş geldin.\n\n🔹 **Ön Ek:** `k!` veya `/`\n\nAşağıdaki açılır menüden kategorileri seçerek komutları inceleyebilirsin.');

    const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('yardim_menu')
            .setPlaceholder('Menüden bir kategori seç...')
            .addOptions([
                { label: 'Moderatörlük Komutları', description: 'Sunucu yönetim ve temizlik araçları', value: 'mod_menu', emoji: '🛡️' },
                { label: 'Ekonomi ve Kart Koleksiyonu', description: 'Bakiye, günlük ödül, market ve envanter', value: 'ekonomi_koleksiyon_menu', emoji: '💰' },
                { label: 'Eğlence ve Oyunlar', description: 'Gacha, anime tahmin, sarıl ve tokat', value: 'eglence_menu', emoji: '🎉' },
                { label: 'Bilgi Komutları', description: 'Yardım ve partner sistemleri', value: 'bilgi_menu', emoji: '📚' }
            ])
    );
    return { embeds: [embed], components: [row] };
}

// --- MERKEZİ KOMUT İŞLEME MANTIĞI ---
function komutIsle(isim, user, args = []) {
    const embed = new EmbedBuilder().setTimestamp();
    const userProfil = profilGetir(user.id);

    if (isim === 'yardim') return yardimMenusuOlustur();

    if (isim === 'bakiye') {
        embed.setColor('#F1C40F').setTitle('💰 Cüzdan Durumu').setDescription(`${user}, cüzdanında **${userProfil.bakiye} Anime Cash** var! 🌸`);
        return { embeds: [embed] };
    }

    if (isim === 'gunluk') {
        userProfil.bakiye += 1000;
        ekonomiKaydet();
        embed.setColor('#2ECC71').setTitle('🎁 Günlük Ödül').setDescription(`${user}, günlük ödülün olan **1000 Anime Cash** cüzdanına eklendi!`);
        return { embeds: [embed] };
    }

    if (isim === 'market') {
        if (marketKartlari.length === 0) return { content: "Şu an markette kart kalmadı, lütfen birazdan tekrar dene." };
        embed.setColor('#9B59B6').setTitle('🛒 Kastuhino | 3 Saatte Bir Değişen Kart Marketi').setDescription('Satıştaki kartlar (Satın almak için `k!al <1-3>` veya `/kart-al` yaz):');
        marketKartlari.forEach((k, idx) => {
            embed.addFields({ name: `${idx + 1}. ${k.isim} (${k.sinif || 'Standart'})`, value: `Fiyat: **${k.fiyat} Anime Cash**\n[Görsel Bağlantısı](${k.gorsel_link})`, inline: false });
        });
        return { embeds: [embed] };
    }

    if (isim === 'kart-al' || isim === 'al') {
        const secim = parseInt(args[0]) - 1;
        if (isNaN(secim) || secim < 0 || secim >= marketKartlari.length) {
            return { content: "Geçerli bir market numarası belirtmelisin! Örnek: `k!al 1`" };
        }
        const alinacakKart = marketKartlari[secim];
        if (userProfil.bakiye < alinacakKart.fiyat) {
            return { content: `Yeterli Anime Cash'in yok! Gereken: **${alinacakKart.fiyat}**, Senin paran: **${userProfil.bakiye}**` };
        }

        userProfil.bakiye -= alinacakKart.fiyat;
        userProfil.envanter.push(alinacakKart);
        ekonomiKaydet();

        embed.setColor('#2ECC71').setTitle('🎉 Kart Satın Alındı!').setDescription(`${user}, marketten başarıyla **${alinacakKart.isim}** kartını satın aldın!`);
        return { embeds: [embed] };
    }

    if (isim === 'envanter') {
        if (userProfil.envanter.length === 0) return { content: "Envanterinde henüz hiç kart yok! `k!market` veya `k!gacha` ile kart edinebilirsin." };
        embed.setColor('#3498DB').setTitle(`🎒 ${user.username} - Kart Envanteri`).setDescription('Sahip olduğun kartlar:');
        userProfil.envanter.forEach((k, idx) => {
            embed.addFields({ name: `${idx + 1}. ${k.isim}`, value: `**Sınıfı:** ${k.sinif || 'Bilinmiyor'}`, inline: true });
        });
        return { embeds: [embed] };
    }

    if (isim === 'gacha' || isim === 'kart-cek') {
        if (userProfil.bakiye < 300) return { content: "Gacha çevirmek için en az **300 Anime Cash** gerekiyor! Günlük ödül almak için `k!gunluk` yazabilirsin." };
        userProfil.bakiye -= 300;

        if (kartlar.length === 0) return { content: "Veritabanında (`kartlar.json`) hiç kart bulunmuyor!" };
        
        const secilenKart = rastgeleKartSec();
        userProfil.envanter.push(secilenKart);
        ekonomiKaydet();

        embed.setColor('#3498DB')
             .setTitle(`🎴 Gacha Çekilişi — ${secilenKart.isim}`)
             .setDescription(`300 Cash harcadın ve yeni kart kazandın!\n**Sınıfı:** ${secilenKart.sinif || 'Standart'}`)
             .setImage(secilenKart.gorsel_link)
             .setFooter({ text: `${user.username} tarafından çekildi. Kalan Bakiye: ${userProfil.bakiye} Cash` });
        return { embeds: [embed] };
    }

    if (isim === 'kart-bilgi') {
        if (kartlar.length === 0) return { content: "Veritabanında kart bulunmuyor!" };
        embed.setColor('#F1C40F').setTitle('🃏 Veritabanındaki Tüm Kartlar');
        kartlar.forEach((k, index) => {
            embed.addFields({ name: `${index + 1}. ${k.isim}`, value: `**Sınıfı:** ${k.sinif || 'Standart'}`, inline: false });
        });
        return { embeds: [embed] };
    }

    if (isim === 'partner') {
        if (partnerler.length === 0) return { content: "Kayıtlı partner sunucu bulunmuyor." };
        embed.setColor('#2ECC71').setTitle('🤝 Partner Sunucular');
        partnerler.forEach(p => embed.addFields({ name: p.isim, value: `[Davet Linki](${p.link})`, inline: false }));
        return { embeds: [embed] };
    }
}

// --- ETKİLEŞİM YÖNETİMİ (Slash Komutları ve Menüler) ---
client.on('interactionCreate', async interaction => {
    if (interaction.isStringSelectMenu() && interaction.customId === 'yardim_menu') {
        const secim = interaction.values[0];
        const resEmbed = new EmbedBuilder().setColor('#3498DB').setTimestamp();

        if (secim === 'mod_menu') {
            resEmbed.setTitle('🛡️ Moderatörlük Komutları').setDescription('• `k!ban` - Üyeyi sunucudan yasaklar\n• `k!kick` - Üyeyi sunucudan atar\n• `k!mute` - Üyeyi susturur\n• `k!temizle` - Mesajları temizler');
        } else if (secim === 'ekonomi_koleksiyon_menu') {
            resEmbed.setTitle('💰 Ekonomi ve Kart Koleksiyonu').setDescription(
                '• `k!bakiye` - Cüzdanındaki Anime Cash miktarını gösterir\n' +
                '• `k!gunluk` - Her gün 1000 Anime Cash ödül alır\n' +
                '• `k!market` - 3 saatte bir yenilenen kart marketini gösterir\n' +
                '• `k!al <no>` - Marketten sıradaki kartı satın alır\n' +
                '• `k!envanter` - Sahip olduğun kart koleksiyonunu listeler\n' +
                '• `k!gacha` - Şansına kutudan kart düşürür (300 Cash)'
            );
        } else if (secim === 'eglence_menu') {
            resEmbed.setTitle('🎉 Eğlence ve Oyunlar').setDescription(
                '• `k!gacha` - Şansına kart düşürür\n• `k!anime-tahmin` - Animeyi bilmece oyunu\n• `k!karakter-tahmin` - Karakter bulmaca oyunu\n• `k!saril` / `k!tokat` - Etkileşim komutları'
            );
        } else if (secim === 'bilgi_menu') {
            resEmbed.setTitle('📚 Bilgi ve Sistemler').setDescription('• `k!kart-bilgi` - Tüm kartları ve sınıflarını listeler\n• `k!partner` - Değerli partner sunucuları gösterir\n• `k!yardim` - Yardım panelini açar');
        }

        return interaction.update({ embeds: [resEmbed], components: interaction.message.components });
    }

    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction.commandName;
    const argNo = interaction.options.getInteger('no');
    
    const sonuc = komutIsle(cmd, interaction.user, [argNo]);
    if (sonuc) {
        await interaction.reply(sonuc);
    }
});

// --- KLASİK MESAJ KOMUTLARI (k!) ---
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    const content = message.content.trim().toLowerCase();
    if (!content.startsWith('k!')) return;

    const parts = content.slice(2).trim().split(/\s+/);
    const cmd = parts[0];
    const arg1 = parts[1];

    let islenenKomut = cmd;
    if (cmd === 'kart' && arg1 === 'çek') islenenKomut = 'gacha';
    if (cmd === 'kart' && arg1 === 'bilgi') islenenKomut = 'kart-bilgi';

    const sonuc = komutIsle(islenenKomut, message.author, [arg1]);
    if (sonuc) {
        await message.reply(sonuc);
    }
});

client.login(process.env.TOKEN);
