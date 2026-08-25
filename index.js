const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Kartlar ve Partner dosyalarını yüklüyoruz
let kartlar = [];
try {
    kartlar = JSON.parse(fs.readFileSync('./kartlar.json', 'utf8'));
} catch (error) {
    console.log("kartlar.json dosyası okunamadı!");
}

let partnerler = [];
try {
    partnerler = JSON.parse(fs.readFileSync('./partners.json', 'utf8'));
} catch (error) {
    console.log("partners.json dosyası okunamadı veya boş!");
}

client.on('ready', () => {
    console.log(`${client.user.tag} başarıyla giriş yaptı ve aktif!`);
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const args = message.content.trim().toLowerCase();

    // Kart çekme komutu
    if (args === 'k! kart çek') {
        if (kartlar.length === 0) {
            return message.reply("Henüz veritabanında hiç kart bulunmuyor!");
        }

        const secilenKart = kartlar[Math.floor(Math.random() * kartlar.length)];

        const kartEmbed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle(`🎴 ${secilenKart.isim}`)
            .setDescription(`**Sınıfı / Nadirliği:** ${secilenKart.sinif}\n\nKastuhino Koleksiyon Seti'nden yeni bir kart çıkardın!`)
            .setImage(secilenKart.gorsel_link)
            .setFooter({ text: `${message.author.username} tarafından çekildi.`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        return message.reply({ embeds: [kartEmbed] });
    }

    // Partner sistemi komutu (Önceden düzelttiğimiz yapı)
    if (args === 'k! partner') {
        if (partnerler.length === 0) {
            return message.reply("Şu an kayıtlı bir partner sunucu bulunmuyor.");
        }

        // Partner listesini düzenli bir şekilde gösteren embed
        const partnerEmbed = new EmbedBuilder()
            .setColor('#2ECC71')
            .setTitle('🤝 Kastuhino | Partner Sunucular')
            .setDescription('Sunucumuzun değerli partnerleri aşağıda listelenmiştir:')
            .setTimestamp();

        partnerler.forEach(p => {
            partnerEmbed.addFields({ name: p.isim, value: `[Davet Linki İçin Tıkla](${p.link})`, inline: false });
        });

        return message.reply({ embeds: [partnerEmbed] });
    }
});

// Token'ı güvenli bir şekilde gizli değişkenlerden alıyoruz
client.login(process.env.TOKEN);
