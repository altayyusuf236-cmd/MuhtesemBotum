const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('feedback')
        .setDescription('Send your feedback directly to the bot owner')
        .addStringOption(option => 
            option.setName('message')
                .setDescription('Your feedback message')
                .setRequired(true)),
    async execute(interaction) {
        const ownerId = "1469310778518536265";
        const feedbackMessage = interaction.options.getString('message');

        const owner = await interaction.client.users.fetch(ownerId);
        const feedbackEmbed = new EmbedBuilder()
            .setTitle("📩 New Feedback!")
            .setColor("Blue")
            .addFields(
                { name: "User", value: `${interaction.user.tag} (${interaction.user.id})` },
                { name: "Server", value: interaction.guild.name },
                { name: "Message", value: feedbackMessage }
            )
            .setTimestamp();

        try {
            await owner.send({ embeds: [feedbackEmbed] });
            await interaction.reply({ content: "Your feedback has been sent to the owner. Thank you!", ephemeral: true });
        } catch (err) {
            await interaction.reply({ content: "Failed to send DM to the owner.", ephemeral: true });
        }
    },
};