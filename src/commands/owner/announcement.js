const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('announce')
        .setDescription('Sends an announcement to a specific channel (Owner Only)')
        .addStringOption(option => option.setName('guild_id').setDescription('Target Server ID').setRequired(true))
        .addStringOption(option => option.setName('channel_id').setDescription('Target Channel ID').setRequired(true))
        .addStringOption(option => option.setName('message').setDescription('Announcement text').setRequired(true)),
    async execute(interaction) {
        const ownerId = "1469310778518536265";
        if (interaction.user.id !== ownerId) return interaction.reply({ content: "Owner only!", ephemeral: true });

        const gId = interaction.options.getString('guild_id');
        const cId = interaction.options.getString('channel_id');
        const msg = interaction.options.getString('message');

        try {
            const guild = await interaction.client.guilds.fetch(gId);
            const channel = await guild.channels.fetch(cId);
            await channel.send(msg);
            await interaction.reply({ content: "Announcement sent successfully!", ephemeral: true });
        } catch (err) {
            await interaction.reply({ content: "Error: Check IDs or Bot permissions.", ephemeral: true });
        }
    },
};