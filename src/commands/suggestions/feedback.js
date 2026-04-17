const { EmbedBuilder, ApplicationCommandOptionType } = require('discord.js');

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "feedback",
  description: "Send your feedback directly to the bot owner",
  category: "UTILITY",
  botPermissions: ["EmbedLinks"],
  command: {
    enabled: true,
    usage: "<message>",
    minArgsCount: 1,
  },
  slashCommand: {
    enabled: true,
    options: [
      {
        name: "message",
        description: "Your feedback message",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },

  async messageRun(message, args) {
    const feedbackMessage = args.join(" ");
    await sendFeedback(message, feedbackMessage);
  },

  async interactionRun(interaction) {
    const feedbackMessage = interaction.options.getString("message");
    await sendFeedback(interaction, feedbackMessage);
  },
};

async function sendFeedback(context, feedbackMessage) {
  const ownerId = "1469310778518536265";
  const client = context.client;
  const user = context.author || context.user;

  const owner = await client.users.fetch(ownerId);
  const feedbackEmbed = new EmbedBuilder()
    .setTitle("📩 New Feedback Received!")
    .setColor("Blue")
    .addFields(
      { name: "User", value: `${user.tag} (${user.id})` },
      { name: "Server", value: context.guild.name },
      { name: "Message", value: feedbackMessage }
    )
    .setTimestamp();

  try {
    await owner.send({ embeds: [feedbackEmbed] });
    const successMsg = "Your feedback has been sent to the owner. Thank you!";
    if (context.reply) return context.reply({ content: successMsg, ephemeral: true });
    return context.safeReply(successMsg);
  } catch (err) {
    const errorMsg = "Failed to send DM to the owner. Their DMs might be closed.";
    if (context.reply) return context.reply({ content: errorMsg, ephemeral: true });
    return context.safeReply(errorMsg);
  }
}