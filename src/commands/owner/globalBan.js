const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gban')
        .setDescription('Bans a user from all servers (Owner Only)')
        .addStringOption(option => option.setName('user_id').setDescription('Target User ID').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Reason for the global ban')),
    async execute(interaction) {
        const ownerId = "1469310778518536265";
        if (interaction.user.id !== ownerId) return interaction.reply({ content: "Only the owner can use this!", ephemeral: true });

        const targetId = interaction.options.getString('user_id');
        const reason = interaction.options.getString('reason') || "No reason provided (Global Ban)";

        await interaction.reply({ content: `Global ban process started for **${targetId}**...`, ephemeral: true });

        let successCount = 0;
        interaction.client.guilds.cache.forEach(async (guild) => {
            try {
                await guild.members.ban(targetId, { reason: reason });
                successCount++;
            } catch (err) { /* Skip errors */ }
        });
    },
};