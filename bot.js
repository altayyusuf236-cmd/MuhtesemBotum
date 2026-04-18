const LOG_CHANNEL_ID = "1479934586132758701"; 
const BOT_VERSION = "1.7"; // Versiyonu 1.7 yaptım ki notu kesin atsın

const updateNotes = `**Version ${BOT_VERSION} Ultimate Update**
- 🛡️ **Full Logging:** Messages, Voice, Roles, Channels, and Members.
- 🤖 **Command Auditor:** Tracking all Slash and Prefix commands.
- 📊 **Auto Stats:** Server statistics update every 15 minutes.
- 🪝 **Webhook Tracking:** Now logging webhook updates.
- ⚙️ **Fixes:** Slash commands registration and OAuth2 fully fixed.`;

require("dotenv").config();
require("module-alias/register");

const { EmbedBuilder, REST, Routes, ActivityType, ChannelType, Colors } = require('discord.js');

// Extenders
require("@helpers/extenders/Message");
require("@helpers/extenders/Guild");
require("@helpers/extenders/GuildChannel");

const { initializeMongoose } = require("@src/database/mongoose");
const { BotClient } = require("@src/structures");
const { validateConfiguration } = require("@helpers/Validator");

validateConfiguration();

const client = new BotClient();
client.logsEnabled = true; 

client.loadCommands("src/commands");
client.loadContexts("src/contexts");
client.loadEvents("src/events");

// ==========================================
// 🛡️ GELİŞMİŞ LOG FONKSİYONU (Konsol + Discord)
// ==========================================
async function sendLog(embed, type = 'info') {
    // Konsol logları (Renkli)
    const timestamp = new Date().toLocaleTimeString('tr-TR', { hour12: false });
    const logColors = {
        info: '\x1b[36m',    // Cyan
        success: '\x1b[32m', // Green
        warn: '\x1b[33m',    // Yellow
        error: '\x1b[31m',   // Red
        cmd: '\x1b[35m',     // Magenta
        reset: '\x1b[0m'
    };
    
    const color = logColors[type] || logColors.info;
    const title = embed.data?.title || 'Log';
    console.log(`${color}[${timestamp}] [${type.toUpperCase()}] ${title}${logColors.reset}`);

    // Discord log kanalı
    if (!client.logsEnabled) return;
    try {
        const channel = client.channels.cache.get(LOG_CHANNEL_ID) || await client.channels.fetch(LOG_CHANNEL_ID);
        if (channel) {
            await channel.send({ embeds: [embed] });
        } else {
            console.log(`\x1b[31m[LOG HATASI]: Kanal bulunamadı! ID: ${LOG_CHANNEL_ID}\x1b[0m`);
        }
    } catch (err) { 
        console.log(`\x1b[31m[LOG HATASI]: ${err.message}\x1b[0m`); 
    }
}

// ==========================================
// 🛡️ FULL + FULL LOG EVENTLERİ 🛡️
// ==========================================

// 1. KOMUT LOGLARI
client.on('interactionCreate', async i => {
    if (!i.isChatInputCommand()) return;
    await sendLog(
        new EmbedBuilder()
            .setTitle("🤖 Slash Command Used")
            .setColor(Colors.Blurple)
            .setTimestamp()
            .addFields(
                { name: "👤 User", value: `${i.user.tag} (${i.user.id})`, inline: true }, 
                { name: "⌨️ Command", value: `\`/${i.commandName}\``, inline: true },
                { name: "🌐 Guild", value: i.guild ? `${i.guild.name} (${i.guild.id})` : 'DM', inline: true }
            ), 
        'cmd'
    );
});

client.on('messageCreate', m => {
    const prefix = client.config?.PREFIX || "!";
    if (m.author.bot || !m.content.startsWith(prefix)) return;
    sendLog(
        new EmbedBuilder()
            .setTitle("📝 Prefix Command Used")
            .setColor(Colors.DarkVividPink)
            .setTimestamp()
            .addFields(
                { name: "👤 User", value: `${m.author.tag}`, inline: true }, 
                { name: "💬 Content", value: `\`${m.content.substring(0, 1000)}\``, inline: true }
            ),
        'cmd'
    );
});

// 2. MESAJ LOGLARI
client.on('messageDelete', async m => {
    if (!m.author || m.author.bot) return;
    await sendLog(
        new EmbedBuilder()
            .setTitle("🗑️ Message Deleted")
            .setColor(Colors.Red)
            .setTimestamp()
            .addFields(
                { name: "👤 Author", value: m.author.tag, inline: true }, 
                { name: "📍 Channel", value: `<#${m.channelId}>`, inline: true }, 
                { name: "📝 Content", value: m.content?.substring(0, 1000) || "Empty/Image/Embed" }
            ),
        'info'
    );
});

client.on('messageUpdate', (o, n) => {
    if (!o.author || o.author.bot || o.content === n.content) return;
    sendLog(
        new EmbedBuilder()
            .setTitle("📝 Message Edited")
            .setColor(Colors.Orange)
            .setTimestamp()
            .addFields(
                { name: "👤 Author", value: o.author.tag, inline: true }, 
                { name: "📍 Channel", value: `<#${o.channelId}>`, inline: true },
                { name: "⬅️ Old", value: o.content?.substring(0, 500) || "Empty" }, 
                { name: "➡️ New", value: n.content?.substring(0, 500) || "Empty" }
            ),
        'info'
    );
});

// 3. SES KANALI LOGLARI
client.on('voiceStateUpdate', (o, n) => {
    const u = n.member.user; 
    const eb = new EmbedBuilder().setTimestamp().setFooter({ text: u.tag });
    if (!o.channelId && n.channelId) {
        sendLog(eb.setTitle("🎤 Voice: Joined").setDescription(`**${u.tag}** joined <#${n.channelId}>`).setColor(Colors.Green), 'info');
    } else if (o.channelId && !n.channelId) {
        sendLog(eb.setTitle("🎤 Voice: Left").setDescription(`**${u.tag}** left <#${o.channelId}>`).setColor(Colors.Red), 'info');
    } else if (o.channelId && n.channelId && o.channelId !== n.channelId) {
        sendLog(eb.setTitle("🎤 Voice: Moved").setDescription(`**${u.tag}** moved from <#${o.channelId}> to <#${n.channelId}>`).setColor(Colors.Yellow), 'info');
    }
});

// 4. KANAL, ROL, WEBHOOK LOGLARI
client.on('channelCreate', c => 
    sendLog(new EmbedBuilder().setTitle("🆕 Channel Created").setDescription(`Name: **${c.name}**\nType: **${c.type}**\nID: \`${c.id}\``).setColor(Colors.Cyan).setTimestamp(), 'success')
);

client.on('channelDelete', c => 
    sendLog(new EmbedBuilder().setTitle("🗑️ Channel Deleted").setDescription(`Name: **${c.name}**\nID: \`${c.id}\``).setColor(Colors.DarkRed).setTimestamp(), 'error')
);

client.on('roleCreate', r => 
    sendLog(new EmbedBuilder().setTitle("🎨 Role Created").setDescription(`Name: **${r.name}**\nColor: \`${r.hexColor}\`\nID: \`${r.id}\``).setColor(Colors.Purple).setTimestamp(), 'success')
);

client.on('roleDelete', r => 
    sendLog(new EmbedBuilder().setTitle("🗑️ Role Deleted").setDescription(`Name: **${r.name}**\nID: \`${r.id}\``).setColor(Colors.DarkRed).setTimestamp(), 'error')
);

client.on('webhookUpdate', ch => 
    sendLog(new EmbedBuilder().setTitle("🪝 Webhook Updated").setDescription(`Channel: <#${ch.id}> (${ch.name})`).setColor(Colors.Gold).setTimestamp(), 'warn')
);

// 5. GUILD (SUNUCU) LOGLARI
client.on('guildCreate', guild => {
    sendLog(
        new EmbedBuilder()
            .setTitle("➕ Added to Guild")
            .setDescription(`**${guild.name}** (\`${guild.id}\`)\nMembers: ${guild.memberCount}\nOwner: <@${guild.ownerId}>`)
            .setColor(Colors.Green)
            .setTimestamp(),
        'success'
    );
});

client.on('guildDelete', guild => {
    sendLog(
        new EmbedBuilder()
            .setTitle("➖ Removed from Guild")
            .setDescription(`**${guild.name}** (\`${guild.id}\`)\nMembers: ${guild.memberCount}`)
            .setColor(Colors.Red)
            .setTimestamp(),
        'warn'
    );
});

// ==========================================
// 📊 OTOMATİK İSTATİSTİK DÖNGÜSÜ
// ==========================================
const updateStats = async () => {
    try {
        let updated = 0;
        client.guilds.cache.forEach(async (guild) => {
            try {
                const total = guild.channels.cache.find(c => c.name.startsWith("Total Members:"));
                if (total) {
                    await total.setName(`Total Members: ${guild.memberCount}`);
                    updated++;
                }
            } catch (err) { }
        });
        if (updated > 0) console.log(`\x1b[36m[STATS]\x1b[0m Updated ${updated} guild stats`);
    } catch (err) {
        console.error(`\x1b[31m[STATS ERROR]\x1b[0m`, err);
    }
};

// ==========================================
// 🚀 READY EVENT (HER ŞEYİN BAŞLADIĞI YER)
// ==========================================

client.once('ready', async () => {
    console.log(`\n\x1b[32m╔════════════════════════════════════════════════════════╗\x1b[0m`);
    console.log(`\x1b[32m║\x1b[0m  ✅ BOT BAŞARILI BİR ŞEKİLDE BAŞLATILDI!               \x1b[32m║\x1b[0m`);
    console.log(`\x1b[32m╠════════════════════════════════════════════════════════╣\x1b[0m`);
    console.log(`\x1b[32m║\x1b[0m  🤖 Bot: ${client.user.tag}                             \x1b[32m║\x1b[0m`);
    console.log(`\x1b[32m║\x1b[0m  📊 Sunucu: ${client.guilds.cache.size} | Kullanıcı: ${client.users.cache.size}          \x1b[32m║\x1b[0m`);
    console.log(`\x1b[32m║\x1b[0m  ⌨️  Komut: ${client.commands.size} | Context: ${client.contexts?.size || 0}             \x1b[32m║\x1b[0m`);
    console.log(`\x1b[32m║\x1b[0m  🔧 Node.js: ${process.version} | DJS: v${require('discord.js').version}        \x1b[32m║\x1b[0m`);
    console.log(`\x1b[32m║\x1b[0m  💾 Memory: ${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB RSS              \x1b[32m║\x1b[0m`);
    console.log(`\x1b[32m╚════════════════════════════════════════════════════════╝\x1b[0m\n`);

    client.user.setActivity(`${BOT_VERSION} | muhtesembotum.onrender.com`, { type: ActivityType.Watching });

    // --- 🧹 ESKİ SLASH KOMUTLARINI TEMİZLE (100 Limiti Çözümü) ---
    const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
    try {
        console.log('\x1b[33m[🧹] Eski global slash komutları temizleniyor...\x1b[0m');
        
        // Önce mevcut kaç komut var gör (debug)
        const currentCommands = await rest.get(Routes.applicationCommands(client.user.id));
        console.log(`\x1b[36m[ℹ️]  Mevcut ${currentCommands.length} global komut bulundu. Siliniyor...\x1b[0m`);
        
        // Tüm global komutları sil (boş array ile PUT)
        await rest.put(Routes.applicationCommands(client.user.id), { body: [] });
        
        console.log('\x1b[32m[✅] Tüm eski global slash komutları başarıyla silindi!\x1b[0m');
        console.log('\x1b[33m[⏳] Yeni komutlar ready.js tarafından yüklenecek...\x1b[0m');
        
        // Log kanalına da bildir
        await sendLog(
            new EmbedBuilder()
                .setTitle("🧹 Slash Commands Cleaned")
                .setDescription(`Eski komutlar temizlendi. Mevcut komut sayısı: **${currentCommands.length}**\nYeni komutlar yüklenmeye hazır.`)
                .setColor(Colors.Yellow)
                .setTimestamp(),
            'warn'
        );
        
    } catch (err) { 
        console.error(`\x1b[31m[❌] Komut temizleme hatası: ${err.message}\x1b[0m`);
        await sendLog(
            new EmbedBuilder()
                .setTitle("❌ Slash Command Clean Error")
                .setDescription(`\`\`\`${err.message}\`\`\``)
                .setColor(Colors.Red)
                .setTimestamp(),
            'error'
        );
    }

    // --- 📢 GÜNCELLEME NOTU ---
    try {
        const channel = await client.channels.fetch(LOG_CHANNEL_ID);
        if (channel) {
            const messages = await channel.messages.fetch({ limit: 10 });
            const alreadyPosted = messages.some(m => 
                m.author.id === client.user.id && 
                m.embeds[0]?.data?.description === updateNotes
            );
            if (!alreadyPosted) {
                await channel.send({ 
                    embeds: [new EmbedBuilder()
                        .setTitle("📢 New Bot Update!")
                        .setDescription(updateNotes)
                        .setColor(Colors.Green)
                        .setTimestamp()
                        .setThumbnail(client.user.displayAvatarURL())] 
                });
                console.log('\x1b[32m[📢] Güncelleme notu log kanalına gönderildi!\x1b[0m');
            } else {
                console.log('\x1b[36m[ℹ️] Güncelleme notu zaten gönderilmiş, atlanıyor.\x1b[0m');
            }
        } else {
            console.log('\x1b[31m[⚠️] Log kanalı bulunamadı! ID: ' + LOG_CHANNEL_ID + '\x1b[0m');
        }
    } catch (err) { 
        console.log('\x1b[31m[❌] Update Note Error:', err.message + '\x1b[0m'); 
    }

    // --- 📊 İSTATİSTİKLER ---
    await updateStats();
    setInterval(updateStats, 15 * 60 * 1000);
    console.log('\x1b[32m[📊] Otomatik istatistik sistemi başlatıldı (15dk aralık)\x1b[0m');
});

// --- HATA YAKALAMA (Detaylı) ---
process.on("unhandledRejection", (err) => {
    console.error(`\x1b[31m[Unhandled Rejection]\x1b[0m`, err);
    if (client.isReady()) {
        sendLog(
            new EmbedBuilder()
                .setTitle("⚠️ Unhandled Rejection")
                .setDescription(`\`\`\`${err.stack || err.message || err}\`\`\``.substring(0, 4000))
                .setColor(Colors.Red)
                .setTimestamp(),
            'error'
        ).catch(() => {});
    }
});

process.on("uncaughtException", (err) => {
    console.error(`\x1b[31m[Uncaught Exception]\x1b[0m`, err);
    if (client.isReady()) {
        sendLog(
            new EmbedBuilder()
                .setTitle("🚨 Uncaught Exception")
                .setDescription(`\`\`\`${err.stack || err.message}\`\`\``.substring(0, 4000))
                .setColor(Colors.DarkRed)
                .setTimestamp(),
            'error'
        ).catch(() => {});
    }
});

// --- BAŞLATMA ---
(async () => {
  try {
      console.log('\x1b[36m[🔄] Bot başlatma işlemi başlıyor...\x1b[0m');
      
      if (client.config.DASHBOARD.enabled) {
        try {
          console.log('\x1b[36m[🌐] Dashboard başlatılıyor...\x1b[0m');
          const { launch } = require("@root/dashboard/app");
          await launch(client);
          console.log('\x1b[32m[✅] Dashboard başarıyla başlatıldı!\x1b[0m');
        } catch (ex) { 
          console.error("\x1b[31m[❌] Dashboard başlatılamadı:\x1b[0m", ex.message); 
        }
      } else {
        console.log('\x1b[36m[🍃] MongoDB bağlantısı başlatılıyor...\x1b[0m');
        await initializeMongoose();
        console.log('\x1b[32m[✅] MongoDB bağlantısı başarılı!\x1b[0m');
      }
      
      console.log('\x1b[36m[🔑] Discord API\'ye bağlanılıyor...\x1b[0m');
      await client.login(process.env.BOT_TOKEN);
      
  } catch (error) {
      console.error('\x1b[31m[🚨] Kritik Başlatma Hatası:\x1b[0m', error);
      process.exit(1);
  }
})();