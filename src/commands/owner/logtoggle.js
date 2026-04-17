/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "logtoggle",
  description: "Enable or disable the logging system",
  category: "OWNER",
  command: {
    enabled: true,
    usage: "",
  },
  slashCommand: {
    enabled: true,
  },

  async messageRun(message, args) {
    const ownerId = "1469310778518536265";
    if (message.author.id !== ownerId) return message.safeReply("Owner only command.");

    message.client.logsEnabled = !message.client.logsEnabled;
    const status = message.client.logsEnabled ? "ENABLED ✅" : "DISABLED ❌";
    return message.safeReply(`Logging system is now **${status}**.`);
  },

  async interactionRun(interaction) {
    const ownerId = "1469310778518536265";
    if (interaction.user.id !== ownerId) {
      return interaction.reply({ content: "Owner only command.", ephemeral: true });
    }

    interaction.client.logsEnabled = !interaction.client.logsEnabled;
    const status = interaction.client.logsEnabled ? "ENABLED ✅" : "DISABLED ❌";
    return interaction.reply({ content: `Logging system is now **${status}**.` });
  },
};