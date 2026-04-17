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

const { EmbedBuilder, REST, Routes, ActivityType, ChannelType } = require('discord.js');

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

process.on("unhandledRejection", (err) => console.error(`[Unhandled Rejection]:`, err));

// --- 🛡️ GELİŞMİŞ LOG FONKSİYONU ---
async function sendLog(embed) {
    if (!client.logsEnabled) return;
    try {
        const channel = client.channels.cache.get(LOG_CHANNEL_ID) || await client.channels.fetch(LOG_CHANNEL_ID);
        if (channel) {
            await channel.send({ embeds: [embed] });
        } else {
            console.log(`[LOG HATASI]: Kanal bulunamadı! ID: ${LOG_CHANNEL_ID}`);
        }
    } catch (err) { console.log("[LOG HATASI]:", err.message); }
}

// ==========================================
// 🛡️ FULL + FULL LOG EVENTLERİ 🛡️
// ==========================================

// 1. KOMUT LOGLARI
client.on('interactionCreate', async i => {
    if (!i.isChatInputCommand()) return;
    sendLog(new EmbedBuilder().setTitle("🤖 Slash Command Used").setColor("Blurple").setTimestamp()
        .addFields({ name: "User", value: `${i.user.tag}`, inline: true }, { name: "Command", value: `\`/${i.commandName}\``, inline: true }));
});

client.on('messageCreate', m => {
    const prefix = client.config?.PREFIX || "!";
    if (m.author.bot || !m.content.startsWith(prefix)) return;
    sendLog(new EmbedBuilder().setTitle("📝 Prefix Command Used").setColor("DarkVividPink").setTimestamp()
        .addFields({ name: "User", value: `${m.author.tag}`, inline: true }, { name: "Content", value: `\`${m.content}\``, inline: true }));
});

// 2. MESAJ LOGLARI
client.on('messageDelete', m => {
    if (!m.author || m.author.bot) return;
    sendLog(new EmbedBuilder().setTitle("🗑️ Message Deleted").setColor("Red").setTimestamp()
        .addFields({ name: "Author", value: m.author.tag, inline: true }, { name: "Channel", value: `<#${m.channelId}>`, inline: true }, { name: "Content", value: m.content?.substring(0, 1000) || "Empty/Image" }));
});

client.on('messageUpdate', (o, n) => {
    if (!o.author || o.author.bot || o.content === n.content) return;
    sendLog(new EmbedBuilder().setTitle("📝 Message Edited").setColor("Orange").setTimestamp()
        .addFields({ name: "Author", value: o.author.tag, inline: true }, { name: "Old", value: o.content?.substring(0, 500) || "Empty" }, { name: "New", value: n.content?.substring(0, 500) || "Empty" }));
});

// 3. SES KANALI LOGLARI
client.on('voiceStateUpdate', (o, n) => {
    const u = n.member.user; const eb = new EmbedBuilder().setTimestamp().setFooter({ text: u.tag });
    if (!o.channelId && n.channelId) sendLog(eb.setTitle("🎤 Voice: Joined").setDescription(`**${u.tag}** -> <#${n.channelId}>`).setColor("Green"));
    else if (o.channelId && !n.channelId) sendLog(eb.setTitle("🎤 Voice: Left").setDescription(`**${u.tag}** left <#${o.channelId}>`).setColor("Red"));
});

// 4. KANAL, ROL, WEBHOOK
client.on('channelCreate', c => sendLog(new EmbedBuilder().setTitle("🆕 Channel Created").setDescription(`Name: **${c.name}**`).setColor("Cyan").setTimestamp()));
client.on('roleCreate', r => sendLog(new EmbedBuilder().setTitle("🎨 Role Created").setDescription(`Name: **${r.name}**`).setColor("Purple").setTimestamp()));
client.on('webhookUpdate', ch => sendLog(new EmbedBuilder().setTitle("🪝 Webhook Updated").setDescription(`Channel: <#${ch.id}>`).setColor("Gold").setTimestamp()));

// ==========================================
// 📊 OTOMATİK İSTATİSTİK DÖNGÜSÜ
// ==========================================
const updateStats = async () => {
    client.guilds.cache.forEach(async (guild) => {
        try {
            const total = guild.channels.cache.find(c => c.name.startsWith("Total Members:"));
            if (total) await total.setName(`Total Members: ${guild.memberCount}`);
        } catch (err) { }
    });
};

// ==========================================
// 🚀 READY EVENT (HER ŞEYİN BAŞLADIĞI YER)
// ==========================================

client.once('ready', async () => {
    console.log(`\n✅ LOGGED IN: ${client.user.tag}\n`);
    client.user.setActivity(`${BOT_VERSION} | muhtesembotum.onrender.com`, { type: ActivityType.Watching });

    // --- 1. SLASH KOMUTLARINI KAYDET (GARANTİ YÖNTEM) ---
    const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
    try {
        console.log('🔄 Registering Slash Commands...');
        const commands = [];
        // Botunun tüm komut listesini tara
        client.commands.forEach(cmd => {
            commands.push({
                name: cmd.name,
                description: cmd.description || "No description",
                options: cmd.slashCommand?.options || []
            });
        });

        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log(`✅ ${commands.length} Slash Commands Registered!`);
    } catch (err) { console.error("❌ Slash Error:", err.message); }

    // --- 2. GÜNCELLEME NOTU ---
    try {
        const channel = await client.channels.fetch(LOG_CHANNEL_ID);
        if (channel) {
            const messages = await channel.messages.fetch({ limit: 10 });
            const alreadyPosted = messages.some(m => m.author.id === client.user.id && m.embeds[0]?.description === updateNotes);
            if (!alreadyPosted) {
                await channel.send({ embeds: [new EmbedBuilder().setTitle("📢 New Bot Update!").setDescription(updateNotes).setColor("#00ff00").setTimestamp().setThumbnail(client.user.displayAvatarURL())] });
                console.log("🚀 Update note posted!");
            }
        }
    } catch (err) { console.log("Update Note Error:", err.message); }

    // --- 3. İSTATİSTİKLER ---
    await updateStats();
    setInterval(updateStats, 15 * 60 * 1000);
});

// --- BAŞLATMA ---
(async () => {
  if (client.config.DASHBOARD.enabled) {
    try {
      const { launch } = require("@root/dashboard/app");
      await launch(client);
    } catch (ex) { console.error("Dashboard failed", ex); }
  } else {
    await initializeMongoose();
  }
  await client.login(process.env.BOT_TOKEN);
})();