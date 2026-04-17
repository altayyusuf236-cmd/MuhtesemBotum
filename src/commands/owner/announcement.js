const { ApplicationCommandOptionType } = require("discord.js");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "announce",
  description: "Sends an announcement to a specific channel (Owner Only)",
  category: "OWNER",
  command: {
    enabled: true,
    minArgsCount: 3,
    usage: "<guildId> <channelId> <message>",
  },
  slashCommand: {
    enabled: true,
    options: [
      {
        name: "guild_id",
        description: "Target Server ID",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "channel_id",
        description: "Target Channel ID",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "message",
        description: "Announcement text",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },

  async messageRun(message, args) {
    const ownerId = "1469310778518536265";
    if (message.author.id !== ownerId) return message.safeReply("Owner only command.");

    const gId = args[0];
    const cId = args[1];
    const msg = args.slice(2).join(" ");
    return runAnnounce(message, gId, cId, msg);
  },

  async interactionRun(interaction) {
    const ownerId = "1469310778518536265";
    if (interaction.user.id !== ownerId) {
      return interaction.reply({ content: "Owner only command.", ephemeral: true });
    }

    const gId = interaction.options.getString("guild_id");
    const cId = interaction.options.getString("channel_id");
    const msg = interaction.options.getString("message");
    return runAnnounce(interaction, gId, cId, msg);
  },
};

async function runAnnounce(ctx, guildId, channelId, msg) {
  try {
    const guild = await ctx.client.guilds.fetch(guildId);
    const channel = await guild.channels.fetch(channelId);

    if (!channel || !channel.isTextBased()) throw new Error();

    await channel.send(msg);
    const success = "Announcement sent successfully!";
    return ctx.reply ? ctx.reply({ content: success, ephemeral: true }) : ctx.safeReply(success);
  } catch (err) {
    const error = "Error: Check if IDs are correct and if the bot has access to that channel.";
    return ctx.reply ? ctx.reply({ content: error, ephemeral: true }) : ctx.safeReply(error);
  }
}