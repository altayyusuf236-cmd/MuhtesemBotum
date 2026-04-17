const LOG_CHANNEL_ID = "1479934586132758701";
const BOT_VERSION = "1.5"; 

const updateNotes = `**Version ${BOT_VERSION}**
- ⚙️ **Log Sistemi:** Log açma kapama ve detaylı log eklendi.
- 🎵 **Music Sistemi:** Müzik Sistemi güncellendi.`;

require("dotenv").config();
require("module-alias/register");
const { EmbedBuilder, REST, Routes, ActivityType } = require('discord.js');

// Extenders
require("@helpers/extenders/Message");
require("@helpers/extenders/Guild");
require("@helpers/extenders/GuildChannel");

const { checkForUpdates } = require("@helpers/BotUtils");
const { initializeMongoose } = require("@src/database/mongoose");
const { BotClient } = require("@src/structures");
const { validateConfiguration } = require("@helpers/Validator");

validateConfiguration();
const client = new BotClient();

// --- LOG ŞALTERİ ---
client.logsEnabled = true; 

client.loadCommands("src/commands");
client.loadContexts("src/contexts");
client.loadEvents("src/events");

process.on("unhandledRejection", (err) => client.logger.error(`Unhandled exception`, err));

// --- YARDIMCI LOG FONKSİYONU (Aç/Kapat Kontrollü) ---
async function sendLog(embed) {
    if (!client.logsEnabled) return; // Şalter kapalıysa gönderme
    try {
        const channel = await client.channels.fetch(LOG_CHANNEL_ID);
        if (channel) channel.send({ embeds: [embed] });
    } catch (err) { }
}

// --- 🛡️ FULL + FULL LOG SİSTEMİ 🛡️ ---

// 1. KOMUTLAR
client.on('interactionCreate', async i => {
    if (!i.isChatInputCommand()) return;
    sendLog(new EmbedBuilder().setTitle("🤖 Slash Command").addFields({ name: "User", value: `${i.user.tag}`, inline: true }, { name: "Command", value: `\`/${i.commandName}\``, inline: true }).setColor("Blurple").setTimestamp());
});

// 2. WEBHOOK & KANAL LOGLARI
client.on('webhookUpdate', (channel) => {
    sendLog(new EmbedBuilder().setTitle("🪝 Webhook Updated").setDescription(`A webhook was created, deleted or updated in <#${channel.id}>`).setColor("Yellow").setTimestamp());
});

client.on('channelCreate', c => sendLog(new EmbedBuilder().setTitle("🆕 Channel Created").setDescription(`Name: ${c.name}\nType: ${c.type}`).setColor("Aqua").setTimestamp()));
client.on('channelDelete', c => sendLog(new EmbedBuilder().setTitle("❌ Channel Deleted").setDescription(`Name: ${c.name}`).setColor("DarkRed").setTimestamp()));

// 3. MESAJ LOGLARI
client.on('messageDelete', m => {
    if (m.author?.bot) return;
    sendLog(new EmbedBuilder().setTitle("🗑️ Message Deleted").setDescription(`**Author:** ${m.author?.tag}\n**Channel:** <#${m.channelId}>\n**Content:** ${m.content || "Image/Embed"}`).setColor("Red").setTimestamp());
});

client.on('messageUpdate', (o, n) => {
    if (o.author?.bot || o.content === n.content) return;
    sendLog(new EmbedBuilder().setTitle("📝 Message Edited").addFields({ name: "Author", value: o.author.tag }, { name: "Old", value: o.content.substring(0, 500) || "Empty" }, { name: "New", value: n.content.substring(0, 500) || "Empty" }).setColor("Orange").setTimestamp());
});

// 4. SES LOGLARI
client.on('voiceStateUpdate', (o, n) => {
    const u = n.member.user;
    const eb = new EmbedBuilder().setTimestamp().setFooter({ text: u.tag });
    if (!o.channelId && n.channelId) sendLog(eb.setTitle("🎤 Voice Join").setDescription(`<#${n.channelId}>`).setColor("Green"));
    else if (o.channelId && !n.channelId) sendLog(eb.setTitle("🎤 Voice Leave").setDescription(`<#${o.channelId}>`).setColor("Red"));
    else if (o.channelId !== n.channelId) sendLog(eb.setTitle("🎤 Voice Move").setDescription(`<#${o.channelId}> -> <#${n.channelId}>`).setColor("Blue"));
});

// 5. ÜYE & BAN LOGLARI
client.on('guildMemberAdd', m => sendLog(new EmbedBuilder().setTitle("📥 Member Joined").setDescription(`${m.user.tag} joined.`).setColor("Green").setTimestamp()));
client.on('guildMemberRemove', m => sendLog(new EmbedBuilder().setTitle("📤 Member Left").setDescription(`${m.user.tag} left.`).setColor("DarkRed").setTimestamp()));
client.on('guildBanAdd', b => sendLog(new EmbedBuilder().setTitle("🔨 Member Banned").setDescription(`${b.user.tag} banned.`).setColor("Black").setTimestamp()));

// 6. ROL & SUNUCU LOGLARI
client.on('roleCreate', r => sendLog(new EmbedBuilder().setTitle("🛡️ Role Created").setDescription(`Name: ${r.name}`).setColor("Purple").setTimestamp()));
client.on('roleDelete', r => sendLog(new EmbedBuilder().setTitle("🗑️ Role Deleted").setDescription(`Name: ${r.name}`).setColor("Grey").setTimestamp()));
client.on('guildUpdate', (o, n) => { if (o.name !== n.name) sendLog(new EmbedBuilder().setTitle("🏰 Server Name Changed").setDescription(`${o.name} -> ${n.name}`).setColor("Gold").setTimestamp()); });

// --- ANA BAŞLATICI ---
(async () => {
  await checkForUpdates();
  if (client.config.DASHBOARD.enabled) {
    try { const { launch } = require("@root/dashboard/app"); await launch(client); } catch (ex) { }
  } else { await initializeMongoose(); }

  client.once('ready', async () => {
      console.log(`✅ ${client.user.tag} Online!`);
      client.user.setActivity(`${BOT_VERSION} | Logs Active`, { type: ActivityType.Watching });

      // SLASH REGISTRATION
      const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
      try {
          const commands = [];
          client.commands.forEach(cmd => {
              if (cmd.slashCommand?.enabled || cmd.data) {
                  commands.push({ name: cmd.name, description: cmd.description || "No description", options: cmd.slashCommand?.options || [] });
              }
          });
          await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
          console.log(`✅ Registered ${commands.length} commands.`);
      } catch (err) { }

      // SMART UPDATE NOTES
      try {
          const channel = await client.channels.fetch(LOG_CHANNEL_ID);
          if (channel) {
              const messages = await channel.messages.fetch({ limit: 15 });
              const alreadyPosted = messages.some(m => m.author.id === client.user.id && m.embeds[0]?.description === updateNotes);
              if (!alreadyPosted) {
                  await channel.send({ embeds: [new EmbedBuilder().setTitle("📢 New Bot Update!").setDescription(updateNotes).setColor("#00ff00").setTimestamp().setThumbnail(client.user.displayAvatarURL())] });
                  console.log("🚀 Update notes posted!");
              }
          }
      } catch (err) { }
  });

  await client.login(process.env.BOT_TOKEN);
})();