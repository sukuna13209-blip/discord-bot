const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, REST, Routes, SlashCommandBuilder } = require('discord.js');
const fs = require('fs');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Dosyaları yüklüyoruz
let kartlar = [];
try { kartlar = JSON.parse(fs.readFileSync('./kartlar.json', 'utf8')); } catch (e) { console.log("kartlar.json okunamadı!"); }

let partnerler = [];
try { partnerler = JSON.parse(fs.readFileSync('./partners.json', 'utf8')); } catch (e) { console.log("partners.json okunamadı!"); }

// Anime Sözleri ve Önerileri
const animeSozleri = [
    "“İnsanlar ancak acı çektiklerinde gerçekten değişebilirler.” - Kaneki Ken",
    "“Geleceğini değiştirmek istiyorsan, zayıflığından kurtul.” - Roronoa Zoro",
    "“Eğer risk almazsan, geleceğin olamaz.” - Monkey D. Luffy",
    "“Dünyada adalet diye bir şey yok, adalet yaratanların elindedir.” - Uchiha Itachi"
];

const animeOnerileri = [
    "**Steins;Gate** - Zaman yolculuğu ve psikolojik gerilim başyapıtı.",
    "**Hunter x Hunter** - Macera ve avcılık dünyasının en iyilerinden.",
    "**Vinland Saga** - Savaş, intikam ve kefaret üzerine muazzam bir hikaye.",
    "**Mob Psycho 100** - Hem aksiyonlu hem de çok eğlenceli bir anime."
];

// Slash Komutlarını Tanımlıyoruz
const commands = [
    new SlashCommandBuilder().setName('yardim').setDescription('Kastuhino Bot açılır menülü yardım panelini açar.'),
    new SlashCommandBuilder().setName('gacha').setDescription('Şansına kutudan rastgele anime karakteri düşürür.'),
    new SlashCommandBuilder().setName('kart-cek').setDescription('Kastuhino Setiinden rastgele kart çeker.'),
    new SlashCommandBuilder().setName('partner').setDescription('Değerli partner sunucularımızı gösterir.'),
    new SlashCommandBuilder().setName('anime-soz').setDescription('Efsaneleşmiş rastgele anime sözleri atar.'),
    new SlashCommandBuilder().setName('anime-oner').setDescription('İzlemen için rastgele kaliteli bir anime önerir.'),
    new SlashCommandBuilder().setName('waifu-puanla').setDescription('Waifu veya husbando skorunuzu hesaplar.'),
    new SlashCommandBuilder().setName('saril').setDescription('Etiketlediğin kişiye sıcak bir sarılma yollar.').addUserOption(o => o.setName('uye').setDescription('Sarılmak istediğin üye').setRequired(true)),
    new SlashCommandBuilder().setName('tokat').setDescription('Etiketlediğin kişiye eğlenceli bir tokat atar.').addUserOption(o => o.setName('uye').setDescription('Tokat atmak istediğin üye').setRequired(true))
].map(command => command.toJSON());

client.on('ready', async () => {
    console.log(`${client.user.tag} başarıyla giriş yaptı ve aktif!`);

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        console.log('Slash (/) komutları yükleniyor...');
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Slash (/) komutları başarıyla yüklendi!');
    } catch (error) {
        console.error(error);
    }
});

// Yardım Menüsünü Oluşturan Fonksiyon
function yardimMenusuOlustur() {
    const embed = new EmbedBuilder()
        .setColor('#2F3136')
        .setTitle('🛡️ Kastuhino Bot — Kapsamlı Yardım & Kontrol Paneli')
        .setDescription('Kastuhino Bot komut rehberine hoş geldin.\n\n🔹 **Bot Ön Eki (Prefix):** `k!` veya `/`\n\nAşağıdaki açılır menüyü kullanarak kategoriler arasında geçiş yapabilirsiniz.\n\n📂 **Kategoriler:**\n• 🛡️ **Moderatörlük:** Ban, kick, mute, yavaş mod ve mesaj temizleme\n• 🎉 **Eğlence ve Oyunlar:** Anime tahmin, karakter bulmaca, gacha, sarıl ve tokat\n• 📚 **Bilgi ve Sistemler:** Yardım paneli ve partner istatistik sistemleri');

    const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('yardim_menu')
            .setPlaceholder('Menüden bir kategori seç...')
            .addOptions([
                { label: 'Moderatörlük Komutları', description: 'Sunucu yönetim ve temizlik araçları', value: 'mod_menu', emoji: '🛡️' },
                { label: 'Eğlence ve Oyunlar', description: 'Anime tahmin, karakter bulmaca, gacha ve dahası', value: 'eglence_menu', emoji: '🎉' },
                { label: 'Bilgi Komutları', description: 'Yardım ve partner istatistik sistemleri', value: 'bilgi_menu', emoji: '📚' }
            ])
    );

    return { embeds: [embed], components: [row] };
}

// Ortak Komut İşleme Mantığı
function komutIsle(isim, user, hedefUye = null) {
    const embed = new EmbedBuilder().setTimestamp();

    if (isim === 'yardim') {
        return yardimMenusuOlustur();
    }

    if (isim === 'gacha' || isim === 'kart-cek' || isim === 'kart') {
        if (kartlar.length === 0) return { content: "Henüz veritabanında hiç kart bulunmuyor!" };
        const secilenKart = kartlar[Math.floor(Math.random() * kartlar.length)];
        embed.setColor('#3498DB')
             .setTitle(`🎴 ${secilenKart.isim}`)
             .setDescription(`**Sınıfı / Nadirliği:** ${secilenKart.sinif}\n\nKastuhino Koleksiyon Seti'nden yeni bir kart çıkardın!`)
             .setImage(secilenKart.gorsel_link)
             .setFooter({ text: `${user.username} tarafından çekildi.`, iconURL: user.displayAvatarURL() });
        return { embeds: [embed] };
    }

    if (isim === 'partner') {
        if (partnerler.length === 0) return { content: "Şu an kayıtlı bir partner sunucu bulunmuyor." };
        embed.setColor('#2ECC71').setTitle('🤝 Kastuhino | Partner Sunucular').setDescription('Sunucumuzun değerli partnerleri:');
        partnerler.forEach(p => embed.addFields({ name: p.isim, value: `[Davet Linki](${p.link})`, inline: false }));
        return { embeds: [embed] };
    }

    if (isim === 'anime-soz') {
        const soz = animeSozleri[Math.floor(Math.random() * animeSozleri.length)];
        embed.setColor('#E67E22').setTitle('💬 Anime Sözü').setDescription(soz);
        return { embeds: [embed] };
    }

    if (isim === 'anime-oner') {
        const onerilen = animeOnerileri[Math.floor(Math.random() * animeOnerileri.length)];
        embed.setColor('#9B59B6').setTitle('📺 Anime Önerisi').setDescription(onerilen);
        return { embeds: [embed] };
    }

    if (isim === 'waifu-puanla') {
        const puan = Math.floor(Math.random() * 101);
        embed.setColor('#E91E63').setTitle('💖 Waifu / Husbando Skoru').setDescription(`${user} için hesaplanan skor: **%${puan}** 🌸`);
        return { embeds: [embed] };
    }

    if (isim === 'saril') {
        const hedef = hedefUye || user;
        embed.setColor('#FF69B4').setTitle('🤗 Sıcak Bir Sarılma!').setDescription(`${user}, ${hedef} kişisine sımsıkı sarıldı! ❤️`);
        return { embeds: [embed] };
    }

    if (isim === 'tokat') {
        const hedef = hedefUye || user;
        embed.setColor('#FF0000').setTitle('👋 Pat Sana Tokat!').setDescription(`${user}, ${hedef} kişisine şrak diye bir tokat yapıştırdı! 💥`);
        return { embeds: [embed] };
    }
}

// Etkileşimler (Slash Komutları ve Menü Seçimleri)
client.on('interactionCreate', async interaction => {
    if (interaction.isStringSelectMenu() && interaction.customId === 'yardim_menu') {
        const secim = interaction.values[0];
        const resEmbed = new EmbedBuilder().setColor('#3498DB').setTimestamp();

        if (secim === 'mod_menu') {
            resEmbed.setTitle('🛡️ Moderatörlük Komutları').setDescription('• `k!ban / /ban` - Üyeyi sunucudan yasaklar\n• `k!kick / /kick` - Üyeyi sunucudan atar\n• `k!mute / /mute` - Üyeyi susturur\n• `k!temizle / /temizle` - Belirtilen miktarda mesajı siler');
        } else if (secim === 'eglence_menu') {
            resEmbed.setTitle('🎉 Eğlence ve Oyun Komutları').setDescription('• `k!gacha / /gacha` - Şansına kutudan kart düşürür\n• `k!kart çek` - Kastuhino seti kartı çeker\n• `k!anime-soz / /anime-soz` - Rastgele anime sözü atar\n• `k!saril / /saril` - İstediğin kişiye sarılır');
        } else if (secim === 'bilgi_menu') {
            resEmbed.setTitle('📚 Bilgi ve Sistem Komutları').setDescription('• `k!partner / /partner` - Partner sunucuları listeler\n• `k!yardim / /yardim` - Yardım menüsünü açar');
        }

        return interaction.update({ embeds: [resEmbed], components: interaction.message.components });
    }

    if (!interaction.isChatInputCommand()) return;
    const commandName = interaction.commandName;
    const hedefUye = interaction.options.getUser('uye');

    const sonuc = komutIsle(commandName, interaction.user, hedefUye);
    await interaction.reply(sonuc);
});

// Klasik (k!) Komutlar
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    const content = message.content.trim().toLowerCase();
    if (!content.startsWith('k!')) return;

    const parts = content.slice(2).trim().split(' ');
    const komutAdi = parts[0];
    const ikinciKelime = parts[1];
    let hedefUye = message.mentions.users.first();

    let mappedName = komutAdi;
    if (komutAdi === 'kart' && ikinciKelime === 'çek') mappedName = 'kart-cek';
    if (komutAdi === 'yardim') mappedName = 'yardim';

    const sonuc = komutIsle(mappedName, message.author, hedefUye);
    if (sonuc) {
        await message.reply(sonuc);
    }
});

client.login(process.env.TOKEN);
