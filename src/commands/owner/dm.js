const { EmbedBuilder, ApplicationCommandOptionType } = require("discord.js");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "dm",
  description: "Send a DM to a user (Owner Only)",
  category: "OWNER",
  botPermissions: ["EmbedLinks"],
  command: {
    enabled: true,
    minArgsCount: 2,
    usage: "<userId> <message>",
  },
  slashCommand: {
    enabled: true,
    options: [
      {
        name: "message",
        description: "The message you want to send",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "user_id",
        description: "Paste the User ID here",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },

  async messageRun(message, args) {
    const ownerId = "1469310778518536265";
    if (message.author.id !== ownerId) return message.safeReply("Owner only command.");

    const targetId = args[0];
    const content = args.slice(1).join(" ");
    return runDm(message, targetId, content);
  },

  async interactionRun(interaction) {
    const ownerId = "1469310778518536265";
    if (interaction.user.id !== ownerId) {
      return interaction.reply({ content: "Owner only command.", ephemeral: true });
    }

    const content = interaction.options.getString("message");
    const targetId = interaction.options.getString("user_id");
    return runDm(interaction, targetId, content);
  },
};

async function runDm(ctx, targetId, content) {
  try {
    const user = await ctx.client.users.fetch(targetId);
    const author = ctx.author || ctx.user;

    const dmEmbed = new EmbedBuilder()
      .setTitle("📩 New Message from Support")
      .setDescription(content)
      .setColor("#7289DA")
      .setFooter({ text: `Sent by ${author.tag}`, iconURL: author.displayAvatarURL() })
      .setTimestamp();

    await user.send({ embeds: [dmEmbed] });
    const success = `✅ Message successfully sent to **${user.tag}**!`;
    return ctx.reply ? ctx.reply({ content: success, ephemeral: true }) : ctx.safeReply(success);
  } catch (error) {
    const fail = "❌ Failed to DM user. Their DMs might be closed.";
    return ctx.reply ? ctx.reply({ content: fail, ephemeral: true }) : ctx.safeReply(fail);
  }
}