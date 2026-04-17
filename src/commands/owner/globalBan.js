const { ApplicationCommandOptionType } = require("discord.js");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "gban",
  description: "Bans a user from all servers (Owner Only)",
  category: "OWNER",
  command: {
    enabled: true,
    minArgsCount: 1,
    usage: "<userId> [reason]",
  },
  slashCommand: {
    enabled: true,
    options: [
      {
        name: "user_id",
        description: "Target User ID",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "reason",
        description: "Reason for the global ban",
        type: ApplicationCommandOptionType.String,
        required: false,
      },
    ],
  },

  async messageRun(message, args) {
    const ownerId = "1469310778518536265";
    if (message.author.id !== ownerId) return message.safeReply("Access denied: Bot owner only.");

    const targetId = args[0];
    const reason = args.slice(1).join(" ") || "No reason provided (Global Ban)";
    return runGlobalBan(message, targetId, reason);
  },

  async interactionRun(interaction) {
    const ownerId = "1469310778518536265";
    if (interaction.user.id !== ownerId) {
      return interaction.reply({ content: "Access denied: Bot owner only.", ephemeral: true });
    }

    const targetId = interaction.options.getString("user_id");
    const reason = interaction.options.getString("reason") || "No reason provided (Global Ban)";
    return runGlobalBan(interaction, targetId, reason);
  },
};

async function runGlobalBan(ctx, targetId, reason) {
  if (!/^\d{17,20}$/.test(targetId)) {
    const msg = "Invalid User ID provided.";
    return ctx.reply ? ctx.reply({ content: msg, ephemeral: true }) : ctx.safeReply(msg);
  }

  const startMsg = `Global ban process started for ID: **${targetId}**...`;
  ctx.reply ? await ctx.reply({ content: startMsg, ephemeral: true }) : await ctx.safeReply(startMsg);

  let success = 0;
  let failed = 0;

  for (const guild of ctx.client.guilds.cache.values()) {
    try {
      await guild.members.ban(targetId, { reason });
      success++;
    } catch {
      failed++;
    }
  }

  const result = `Global Ban Completed.\n✅ Success: **${success}** servers\n❌ Failed: **${failed}** servers (Missing permissions)`;
  return ctx.followUp ? ctx.followUp({ content: result, ephemeral: true }) : ctx.safeReply(result);
}