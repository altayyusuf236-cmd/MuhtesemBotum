const LOG_CHANNEL_ID = "1479934586132758701";

// --- EXPRESS (RENDER UPTIME) ---
const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('Bot Aktif! ✅'));
app.listen(process.env.PORT || 10000);

require("dotenv").config();
require("module-alias/register");

// Discord.js bileşenlerini en üstte tanımlıyoruz (Çökmemesi için şart)
const { EmbedBuilder } = require('discord.js');

// register extenders
require("@helpers/extenders/Message");
require("@helpers/extenders/Guild");
require("@helpers/extenders/GuildChannel");

const { checkForUpdates } = require("@helpers/BotUtils");
const { initializeMongoose } = require("@src/database/mongoose");
const { BotClient } = require("@src/structures");
const { validateConfiguration } = require("@helpers/Validator");

validateConfiguration();

// initialize client
const client = new BotClient();
client.loadCommands("src/commands");
client.loadContexts("src/contexts");
client.loadEvents("src/events");

// find unhandled promise rejections
process.on("unhandledRejection", (err) => client.logger.error(`Unhandled exception`, err));

// --- YARDIMCI LOG FONKSİYONU ---
async function sendLog(embed) {
    try {
        const channel = await client.channels.fetch(LOG_CHANNEL_ID);
        if (channel) channel.send({ embeds: [embed] });
    } catch (err) { console.error("Log gönderilemedi:", err); }
}

// --- LOG EVENTLERİ ---

// 1. SES KANALI AKTİVİTELERİ
client.on('voiceStateUpdate', (oldState, newState) => {
    const user = newState.member.user;
    let embed = new EmbedBuilder().setTimestamp().setColor("Blue");

    if (!oldState.channelId && newState.channelId) {
        embed.setTitle("🎤 Voice: Joined").setDescription(`**${user.tag}** joined <#${newState.channelId}>`).setColor("Green");
    } else if (oldState.channelId && !newState.channelId) {
        embed.setTitle("🎤 Voice: Left").setDescription(`**${user.tag}** left <#${oldState.channelId}>`).setColor("Red");
    } else if (oldState.channelId !== newState.channelId) {
        embed.setTitle("🎤 Voice: Moved").setDescription(`**${user.tag}** moved from <#${oldState.channelId}> to <#${newState.channelId}>`);
    } else return;

    sendLog(embed);
});

// 2. KANAL İŞLEMLERİ
client.on('channelCreate', channel => {
    const embed = new EmbedBuilder()
        .setTitle("📁 Channel Created")
        .setDescription(`Name: **${channel.name}**\nType: ${channel.type}\nID: ${channel.id}`)
        .setColor("Green").setTimestamp();
    sendLog(embed);
});

client.on('channelDelete', channel => {
    const embed = new EmbedBuilder()
        .setTitle("🗑️ Channel Deleted")
        .setDescription(`Name: **${channel.name}**\nID: ${channel.id}`)
        .setColor("Red").setTimestamp();
    sendLog(embed);
});

// 3. MESAJ SİLME VE DÜZENLEME
client.on('messageDelete', message => {
    if (message.author?.bot) return;
    const embed = new EmbedBuilder()
        .setTitle("🚫 Message Deleted")
        .addFields(
            { name: "Author", value: `${message.author?.tag || "Unknown"}`, inline: true },
            { name: "Channel", value: `<#${message.channelId}>`, inline: true },
            { name: "Content", value: message.content || "Empty/Image" }
        )
        .setColor("Orange").setTimestamp();
    sendLog(embed);
});

client.on('messageUpdate', (oldMsg, newMsg) => {
    if (oldMsg.author?.bot || oldMsg.content === newMsg.content) return;
    const embed = new EmbedBuilder()
        .setTitle("📝 Message Edited")
        .addFields(
            { name: "Author", value: `${oldMsg.author.tag}`, inline: true },
            { name: "Old", value: oldMsg.content || "None" },
            { name: "New", value: newMsg.content || "None" }
        )
        .setColor("Yellow").setTimestamp();
    sendLog(embed);
});

// 4. SUNUCUYA KATILAN / AYRILAN
client.on('guildMemberAdd', member => {
    const embed = new EmbedBuilder()
        .setTitle("👤 Member Joined")
        .setDescription(`**${member.user.tag}** joined **${member.guild.name}**`)
        .setThumbnail(member.user.displayAvatarURL())
        .setColor("Green").setTimestamp();
    sendLog(embed);
});

client.on('guildMemberRemove', member => {
    const embed = new EmbedBuilder()
        .setTitle("🏃 Member Left")
        .setDescription(`**${member.user.tag}** left **${member.guild.name}**`)
        .setColor("Red").setTimestamp();
    sendLog(embed);
});

// 5. KOMUT LOGLARI
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const embed = new EmbedBuilder()
        .setTitle("🤖 Command Executive")
        .addFields(
            { name: "User", value: interaction.user.tag, inline: true },
            { name: "Command", value: `/${interaction.commandName}`, inline: true },
            { name: "Server", value: interaction.guild?.name || "DM", inline: true }
        )
        .setColor("Blurple").setTimestamp();
    sendLog(embed);
});

// --- ANA ÇALIŞTIRICI ---
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

  // --- AKILLI GÜNCELLEME SİSTEMİ ---
  const updateSettings = {
      channelId: "1479934586132758701", 
      notes: "v1.2: Added Global Ban, Feedback system, and Announcement system.", 
  };

  client.once('ready', async () => {
      console.log(`${client.user.tag} is online!`);
      try {
          const channel = await client.channels.fetch(updateSettings.channelId);
          if (!channel) return;
          const messages = await channel.messages.fetch({ limit: 5 });
          const lastBotMessage = messages.find(m => m.author.id === client.user.id && m.embeds.length > 0);

          if (lastBotMessage && lastBotMessage.embeds[0].description === updateSettings.notes) {
              console.log("⚠️ Güncelleme notu zaten paylaşılmış.");
              return; 
          }

          const updateEmbed = new EmbedBuilder()
              .setTitle("📢 New Bot Update!")
              .setDescription(updateSettings.notes)
              .setColor("#00ff00")
              .setThumbnail(client.user.displayAvatarURL())
              .setTimestamp()
              .setFooter({ text: "Latest Update Log" });

          await channel.send({ embeds: [updateEmbed] });
          console.log("✅ Yeni güncelleme notu paylaşıldı!");
      } catch (error) {
          console.error("Güncelleme kontrol hatası:", error);
      }
  });

  await client.login(process.env.BOT_TOKEN);
})();