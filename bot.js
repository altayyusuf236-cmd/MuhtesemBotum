const LOG_CHANNEL_ID = "1479934586132758701"; 
const BOT_VERSION = "1.6"; 

// GÜNCELLEME NOTU (Metni değiştirdiğin an bot yeni mesajı atar)
const updateNotes = `**Version ${BOT_VERSION} Official Update**
- 🛡️ **Ultimate Logging:** Tracked every message, voice, role, and server event.
- 📊 **Auto Stats:** Server statistics update automatically every 15 minutes.
- 🤖 **Command Auditor:** Tracking Slash and Prefix commands in real-time.
- 🪝 **Infrastructure Logs:** Webhooks, Invites, and Channel updates are live.
- 🎵 **Music Engine:** Optimized with stable lava.link nodes.
- ⚙️ **Dashboard:** OAuth2 system fully synchronized.`;

require("dotenv").config();
require("module-alias/register");

const { EmbedBuilder, REST, Routes, ActivityType, ChannelType, AuditLogEvent } = require('discord.js');

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
client.logsEnabled = true; // Log Şalteri

client.loadCommands("src/commands");
client.loadContexts("src/contexts");
client.loadEvents("src/events");

process.on("unhandledRejection", (err) => client.logger.error(`Unhandled exception`, err));

// --- YARDIMCI LOG FONKSİYONU ---
async function sendLog(embed) {
    if (!client.logsEnabled) return;
    try {
        const channel = client.channels.cache.get(LOG_CHANNEL_ID) || await client.channels.fetch(LOG_CHANNEL_ID);
        if (channel) await channel.send({ embeds: [embed] });
    } catch (err) { console.log("Log Hatası:", err.message); }
}

// ==========================================
// 🛡️ ULTIMATE LOGGING ENGINE (TAM DETAY) 🛡️
// ==========================================

// 1. KOMUT LOGLARI
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const embed = new EmbedBuilder()
        .setTitle("🤖 Slash Command Used")
        .setColor("Blurple")
        .addFields(
            { name: "User", value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
            { name: "Command", value: `\`/${interaction.commandName}\``, inline: true },
            { name: "Server", value: `${interaction.guild?.name || "DM"}`, inline: true }
        )
        .setTimestamp();
    sendLog(embed);
});

client.on('messageCreate', message => {
    const prefix = client.config?.PREFIX || "!";
    if (message.author.bot || !message.content.startsWith(prefix)) return;
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    
    if (client.commands.has(commandName)) {
        const embed = new EmbedBuilder()
            .setTitle("📝 Prefix Command Used")
            .setColor("DarkVividPink")
            .addFields(
                { name: "User", value: `${message.author.tag}`, inline: true },
                { name: "Command", value: `\`${prefix}${commandName}\``, inline: true },
                { name: "Channel", value: `<#${message.channelId}>`, inline: true }
            )
            .setTimestamp();
        sendLog(embed);
    }
});

// 2. MESAJ LOGLARI
client.on('messageDelete', message => {
    if (message.author?.bot) return;
    const embed = new EmbedBuilder()
        .setTitle("🗑️ Message Deleted")
        .setColor("Red")
        .addFields(
            { name: "Author", value: `${message.author?.tag || "Unknown"}`, inline: true },
            { name: "Channel", value: `<#${message.channelId}>`, inline: true },
            { name: "Content", value: message.content?.substring(0, 1000) || "Empty or Image" }
        )
        .setTimestamp();
    sendLog(embed);
});

client.on('messageUpdate', (oldMessage, newMessage) => {
    if (oldMessage.author?.bot || oldMessage.content === newMessage.content) return;
    const embed = new EmbedBuilder()
        .setTitle("📝 Message Edited")
        .setColor("Orange")
        .addFields(
            { name: "Author", value: `${oldMessage.author.tag}`, inline: true },
            { name: "Channel", value: `<#${oldMessage.channelId}>`, inline: true },
            { name: "Old Content", value: oldMessage.content?.substring(0, 500) || "Empty" },
            { name: "New Content", value: newMessage.content?.substring(0, 500) || "Empty" }
        )
        .setTimestamp();
    sendLog(embed);
});

// 3. SES KANALI LOGLARI
client.on('voiceStateUpdate', (oldState, newState) => {
    const user = newState.member.user;
    const embed = new EmbedBuilder().setTimestamp().setFooter({ text: user.tag });

    if (!oldState.channelId && newState.channelId) {
        embed.setTitle("🎤 Voice: Joined").setDescription(`**${user.tag}** joined <#${newState.channelId}>`).setColor("Green");
    } else if (oldState.channelId && !newState.channelId) {
        embed.setTitle("🎤 Voice: Left").setDescription(`**${user.tag}** left <#${oldState.channelId}>`).setColor("Red");
    } else if (oldState.channelId !== newState.channelId) {
        embed.setTitle("🎤 Voice: Moved").setDescription(`Moved from <#${oldState.channelId}> to <#${newState.channelId}>`).setColor("Blue");
    } else if (oldState.selfMute !== newState.selfMute) {
        embed.setTitle(newState.selfMute ? "🔇 Voice: Muted" : "🔊 Voice: Unmuted").setColor("Grey");
    } else if (oldState.selfDeaf !== newState.selfDeaf) {
        embed.setTitle(newState.selfDeaf ? "🎧 Voice: Deafened" : "👂 Voice: Undeafened").setColor("DarkGrey");
    } else return;

    sendLog(embed);
});

// 4. ÜYE VE BAN LOGLARI
client.on('guildMemberAdd', member => {
    const embed = new EmbedBuilder()
        .setTitle("📥 Member Joined")
        .setDescription(`**${member.user.tag}** joined the server.`)
        .setColor("Green")
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();
    sendLog(embed);
});

client.on('guildMemberRemove', member => {
    const embed = new EmbedBuilder()
        .setTitle("📤 Member Left")
        .setDescription(`**${member.user.tag}** has left the server.`)
        .setColor("DarkRed")
        .setTimestamp();
    sendLog(embed);
});

client.on('guildBanAdd', ban => {
    const embed = new EmbedBuilder()
        .setTitle("🔨 Member Banned")
        .setDescription(`**${ban.user.tag}** was banned.\nReason: ${ban.reason || "No reason provided"}`)
        .setColor("Black")
        .setTimestamp();
    sendLog(embed);
});

client.on('guildBanRemove', ban => {
    const embed = new EmbedBuilder()
        .setTitle("🔓 Ban Removed")
        .setDescription(`**${ban.user.tag}** ban has been lifted.`)
        .setColor("Blue")
        .setTimestamp();
    sendLog(embed);
});

client.on('guildMemberUpdate', (oldMember, newMember) => {
    if (oldMember.nickname !== newMember.nickname) {
        const embed = new EmbedBuilder()
            .setTitle("👤 Nickname Change")
            .setDescription(`**${newMember.user.tag}** nickname updated.`)
            .addFields(
                { name: "Old", value: oldMember.nickname || "None", inline: true },
                { name: "New", value: newMember.nickname || "None", inline: true }
            )
            .setColor("Yellow")
            .setTimestamp();
        sendLog(embed);
    }
});

// 5. KANAL, ROL VE WEBHOOK LOGLARI
client.on('channelCreate', channel => {
    const embed = new EmbedBuilder().setTitle("🆕 Channel Created").setDescription(`Name: **${channel.name}**\nType: ${channel.type}`).setColor("Cyan").setTimestamp();
    sendLog(embed);
});

client.on('channelDelete', channel => {
    const embed = new EmbedBuilder().setTitle("❌ Channel Deleted").setDescription(`Name: **${channel.name}**`).setColor("DarkRed").setTimestamp();
    sendLog(embed);
});

client.on('roleCreate', role => {
    const embed = new EmbedBuilder().setTitle("🎨 Role Created").setDescription(`Name: **${role.name}**\nID: ${role.id}`).setColor("Purple").setTimestamp();
    sendLog(embed);
});

client.on('roleDelete', role => {
    const embed = new EmbedBuilder().setTitle("🗑️ Role Deleted").setDescription(`Name: **${role.name}**`).setColor("DarkGrey").setTimestamp();
    sendLog(embed);
});

client.on('webhookUpdate', channel => {
    const embed = new EmbedBuilder().setTitle("🪝 Webhook Updated").setDescription(`A webhook was modified in <#${channel.id}>`).setColor("Gold").setTimestamp();
    sendLog(embed);
});

// 6. SUNUCU VE DAVET LOGLARI
client.on('inviteCreate', invite => {
    const embed = new EmbedBuilder().setTitle("📩 Invite Created").setDescription(`By: **${invite.inviter?.tag}**\nCode: \`${invite.code}\``).setColor("Yellow").setTimestamp();
    sendLog(embed);
});

client.on('guildUpdate', (oldGuild, newGuild) => {
    if (oldGuild.name !== newGuild.name) {
        const embed = new EmbedBuilder().setTitle("🏰 Server Name Changed").setDescription(`Old: ${oldGuild.name}\nNew: ${newGuild.name}`).setColor("Gold").setTimestamp();
        sendLog(embed);
    }
});

// ==========================================
// 📊 OTOMATİK İSTATİSTİK GÜNCELLEYİCİ 📊
// ==========================================
const updateStats = async () => {
    client.guilds.cache.forEach(async (guild) => {
        try {
            const totalChannel = guild.channels.cache.find(c => c.name.startsWith("Total Members:"));
            const humanChannel = guild.channels.cache.find(c => c.name.startsWith("Humans:"));
            const botChannel = guild.channels.cache.find(c => c.name.startsWith("Bots:"));

            if (totalChannel) await totalChannel.setName(`Total Members: ${guild.memberCount}`);
            if (humanChannel) await humanChannel.setName(`Humans: ${guild.members.cache.filter(m => !m.user.bot).size}`);
            if (botChannel) await botChannel.setName(`Bots: ${guild.members.cache.filter(m => m.user.bot).size}`);
        } catch (err) { }
    });
};

// ==========================================
// 🚀 ANA ÇALIŞTIRICI & BAŞLATMA 🚀
// ==========================================

(async () => {
  await checkForUpdates();

  if (client.config.DASHBOARD.enabled) {
    try {
      const { launch } = require("@root/dashboard/app");
      await launch(client);
    } catch (ex) { console.error("Dashboard failed", ex); }
  } else {
    await initializeMongoose();
  }

  client.once('ready', async () => {
      console.log(`\n✅ ${client.user.tag} ONLINE!\n`);
      client.user.setActivity(`${BOT_VERSION} | muhtesembotum.onrender.com`, { type: ActivityType.Watching });

      // 1. SLASH KOMUTLARINI KAYDET
      const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
      try {
          const commands = [];
          client.commands.forEach(cmd => { 
              if (cmd.slashCommand?.enabled || cmd.data) {
                  commands.push({ name: cmd.name, description: cmd.description || "No description", options: cmd.slashCommand?.options || [] });
              }
          });
          await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
          console.log(`✅ Loaded ${commands.length} slash commands.`);
      } catch (err) { console.error("Slash register error:", err.message); }

      // 2. AKILLI GÜNCELLEME NOTU SİSTEMİ
      try {
          const channel = await client.channels.fetch(LOG_CHANNEL_ID);
          if (channel) {
              const messages = await channel.messages.fetch({ limit: 15 });
              const alreadyPosted = messages.some(m => m.author.id === client.user.id && m.embeds[0]?.description === updateNotes);

              if (!alreadyPosted) {
                  const updateEmbed = new EmbedBuilder()
                      .setTitle("📢 New Bot Update!")
                      .setDescription(updateNotes)
                      .setColor("#00ff00")
                      .setThumbnail(client.user.displayAvatarURL())
                      .setTimestamp();
                  await channel.send({ embeds: [updateEmbed] });
                  console.log("🚀 Update note posted!");
              }
          }
      } catch (err) { }

      // 3. İSTATİSTİKLERİ BAŞLAT (15 Dakikada Bir)
      await updateStats();
      setInterval(updateStats, 15 * 60 * 1000); 
  });

  await client.login(process.env.BOT_TOKEN);
})();