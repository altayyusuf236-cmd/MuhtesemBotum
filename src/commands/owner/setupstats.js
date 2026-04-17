const { PermissionFlagsBits, ChannelType } = require("discord.js");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "setupstats",
  description: "Setup server statistic channels",
  category: "OWNER",
  userPermissions: ["Administrator"],
  command: {
    enabled: true,
    usage: "",
  },
  slashCommand: {
    enabled: true,
  },

  async messageRun(message, args) {
     return this.interactionRun(message);
  },

  async interactionRun(context) {
    const guild = context.guild;
    const user = context.author || context.user;
    const ownerId = "1469310778518536265";

    if (user.id !== ownerId) return context.reply({ content: "Owner only!", ephemeral: true });

    try {
      // 1. Kategori Oluştur
      const category = await guild.channels.create({
        name: "📊 SERVER STATS",
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionFlagsBits.Connect], // Kimse girmesin, sadece görsün
          },
        ],
      });

      // 2. Kanalları Oluştur
      const totalMembers = await guild.channels.create({
        name: `Total Members: ${guild.memberCount}`,
        type: ChannelType.GuildVoice,
        parent: category.id,
      });

      const humanMembers = await guild.channels.create({
        name: `Humans: ${guild.members.cache.filter(m => !m.user.bot).size}`,
        type: ChannelType.GuildVoice,
        parent: category.id,
      });

      const botMembers = await guild.channels.create({
        name: `Bots: ${guild.members.cache.filter(m => m.user.bot).size}`,
        type: ChannelType.GuildVoice,
        parent: category.id,
      });

      const msg = "✅ Server statistic channels have been created!";
      return context.reply ? context.reply({ content: msg, ephemeral: true }) : context.safeReply(msg);

    } catch (err) {
      console.error(err);
      return context.reply({ content: "Failed to create channels. Check my permissions!", ephemeral: true });
    }
  },
};