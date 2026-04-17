const LOG_CHANNEL_ID = "1479934586132758701";
const BOT_VERSION = "1.3"; // Versiyonu her değiştirdiğinde yeni notu paylaşır

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
client.loadCommands("src/commands");
client.loadContexts("src/contexts");
client.loadEvents("src/events");

process.on("unhandledRejection", (err) => client.logger.error(`Unhandled exception`, err));

// --- YARDIMCI LOG FONKSİYONU ---
async function sendLog(embed) {
    try {
        const channel = await client.channels.fetch(LOG_CHANNEL_ID);
        if (channel) channel.send({ embeds: [embed] });
    } catch (err) { console.error("Log hatası:", err); }
}

// --- DEVASA LOG SİSTEMİ (HER ŞEY) ---

// 1. SES KANALI LOGLARI
client.on('voiceStateUpdate', (oldState, newState) => {
    const user = newState.member.user;
    const embed = new EmbedBuilder().setTimestamp().setFooter({ text: `ID: ${user.id}` });

    if (!oldState.channelId && newState.channelId) {
        embed.setTitle("🎤 Voice Joined").setDescription(`**${user.tag}** joined <#${newState.channelId}>`).setColor("Green");
    } else if (oldState.channelId && !newState.channelId) {
        embed.setTitle("🎤 Voice Left").setDescription(`**${user.tag}** left <#${oldState.channelId}>`).setColor("Red");
    } else if (oldState.channelId !== newState.channelId) {
        embed.setTitle("🎤 Voice Moved").setDescription(`**${user.tag}** moved from <#${oldState.channelId}> to <#${newState.channelId}>`).setColor("Blue");
    } else return;
    sendLog(embed);
});

// 2. MESAJ LOGLARI (SİLME/DÜZENLEME)
client.on('messageDelete', message => {
    if (message.author?.bot || !message.content) return;
    const embed = new EmbedBuilder()
        .setTitle("🗑️ Message Deleted")
        .addFields(
            { name: "Author", value: `${message.author.tag}`, inline: true },
            { name: "Channel", value: `<#${message.channelId}>`, inline: true },
            { name: "Content", value: message.content.substring(0, 1024) }
        )
        .setColor("Red").setTimestamp();
    sendLog(embed);
});

client.on('messageUpdate', (oldMsg, newMsg) => {
    if (oldMsg.author?.bot || oldMsg.content === newMsg.content) return;
    const embed = new EmbedBuilder()
        .setTitle("📝 Message Edited")
        .addFields(
            { name: "Author", value: `${oldMsg.author.tag}`, inline: true },
            { name: "Channel", value: `<#${oldMsg.channelId}>`, inline: true },
            { name: "Old Content", value: oldMsg.content || "None" },
            { name: "New Content", value: newMsg.content || "None" }
        )
        .setColor("Orange").setTimestamp();
    sendLog(embed);
});

// 3. SUNUCU & ÜYE LOGLARI
client.on('guildMemberAdd', member => {
    const embed = new EmbedBuilder()
        .setTitle("📥 New Member Joined")
        .setDescription(`${member.user.tag} has joined the server.`)
        .setThumbnail(member.user.displayAvatarURL())
        .setColor("Green").setTimestamp();
    sendLog(embed);
});

client.on('guildMemberRemove', member => {
    const embed = new EmbedBuilder()
        .setTitle("📤 Member Left/Kicked")
        .setDescription(`${member.user.tag} left the server.`)
        .setColor("Red").setTimestamp();
    sendLog(embed);
});

client.on('guildBanAdd', ban => {
    const embed = new EmbedBuilder()
        .setTitle("🔨 User Banned")
        .setDescription(`**${ban.user.tag}** was banned from **${ban.guild.name}**\nReason: ${ban.reason || "No reason provided"}`)
        .setColor("DarkRed").setTimestamp();
    sendLog(embed);
});

// 4. KANAL & ROL LOGLARI
client.on('channelCreate', ch => {
    sendLog(new EmbedBuilder().setTitle("🆕 Channel Created").setDescription(`Name: **${ch.name}**\nType: ${ch.type}`).setColor("Cyan").setTimestamp());
});

client.on('roleCreate', role => {
    sendLog(new EmbedBuilder().setTitle("🎨 Role Created").setDescription(`Name: **${role.name}**\nID: ${role.id}`).setColor("Blue").setTimestamp());
});

client.on('roleDelete', role => {
    sendLog(new EmbedBuilder().setTitle("🔥 Role Deleted").setDescription(`Name: **${role.name}**`).setColor("Black").setTimestamp());
});

// 5. KOMUT LOGLARI
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const embed = new EmbedBuilder()
        .setTitle("🚀 Command Executed")
        .addFields(
            { name: "User", value: interaction.user.tag, inline: true },
            { name: "Command", value: `/${interaction.commandName}`, inline: true },
            { name: "Server", value: interaction.guild?.name || "DM", inline: true }
        )
        .setColor("Purple").setTimestamp();
    sendLog(embed);
});

// --- ANA BAŞLATICI ---
(async () => {
  await checkForUpdates();

  if (client.config.DASHBOARD.enabled) {
    client.logger.log("Launching dashboard");
    try {
      const { launch } = require("@root/dashboard/app");
      await launch(client);
    } catch (ex) {
      client.logger.error("Failed to launch dashboard", ex);
    }
  } else {
    await initializeMongoose();
  }

  // --- READY EVENTİ (SLASH & GÜNCELLEME NOTU) ---
  client.once('ready', async () => {
      console.log(`✅ Logged in as ${client.user.tag}`);
      
      // Durum Ayarla
      client.user.setActivity(`${BOT_VERSION} | muhtesembotum.onrender.com`, { type: ActivityType.Watching });

      // 1. SLASH KOMUTLARINI GÜNCELLE
      const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
      try {
          const commands = [];
          client.commands.forEach(cmd => {
              if (cmd.slashCommand?.enabled) {
                  // Botunun yapısına göre data oluşturuluyor
                  commands.push({
                      name: cmd.name,
                      description: cmd.description,
                      options: cmd.slashCommand.options || []
                  });
              }
          });

          await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
          console.log('Successfully reloaded application (/) commands.');
      } catch (err) { console.error("Slash register error:", err); }

      // 2. AKILLI GÜNCELLEME NOTU SİSTEMİ
      const updateNotes = `**Version ${BOT_VERSION}** Feedback, globalban, dm, announcement, eklendi. Dashboard kuruldu, log sistemi geliştirildi.
      - Müzik sistemi eklendi.`;
      
      try {
          const channel = await client.channels.fetch(LOG_CHANNEL_ID);
          if (channel) {
              const messages = await channel.messages.fetch({ limit: 10 });
              // Daha önce bu versiyon paylaşılmış mı kontrol et
              const alreadyPosted = messages.some(m => m.embeds[0]?.title === "📢 New Bot Update!" && m.embeds[0]?.description.includes(`Version ${BOT_VERSION}`));

              if (!alreadyPosted) {
                  const updateEmbed = new EmbedBuilder()
                      .setTitle("📢 New Bot Update!")
                      .setDescription(updateNotes)
                      .setColor("#00ff00")
                      .setThumbnail(client.user.displayAvatarURL())
                      .setTimestamp();
                  await channel.send({ embeds: [updateEmbed] });
                  console.log("✅ New update note posted!");
              } else {
                  console.log("⚠️ This version update is already posted.");
              }
          }
      } catch (err) { console.error("Update log error:", err); }
  });

  await client.login(process.env.BOT_TOKEN);
})();