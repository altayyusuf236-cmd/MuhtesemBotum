const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dm')
        .setDescription('Send a DM to a user by selecting them or using their ID (Owner Only)')
        // Mesaj içeriği (Zorunlu)
        .addStringOption(option => 
            option.setName('message')
                .setDescription('The message you want to send')
                .setRequired(true))
        // Kullanıcı seçme (Opsiyonel)
        .addUserOption(option => 
            option.setName('target')
                .setDescription('Select a user from the server list'))
        // ID ile yazma (Opsiyonel)
        .addStringOption(option => 
            option.setName('user_id')
                .setDescription('Or paste the User ID here')),

    async execute(interaction) {
        // --- AYARLAR ---
        const ownerId = "1469310778518536265"; // Kendi ID'ni buraya yapıştır
        
        // Yetki Kontrolü
        if (interaction.user.id !== ownerId) {
            return interaction.reply({ 
                content: "❌ Access Denied: This command is restricted to the bot owner.", 
                ephemeral: true 
            });
        }

        const messageContent = interaction.options.getString('message');
        const targetUser = interaction.options.getUser('target');
        const targetId = interaction.options.getString('user_id');

        let user;

        // Öncelik: Eğer listeden kullanıcı seçildiyse onu kullan
        if (targetUser) {
            user = targetUser;
        } 
        // Eğer listeden seçilmediyse ama ID girildiyse ID ile bulmaya çalış
        else if (targetId) {
            try {
                user = await interaction.client.users.fetch(targetId);
            } catch (error) {
                return interaction.reply({ content: "❌ Invalid User ID. I couldn't find anyone with that ID.", ephemeral: true });
            }
        } 
        // İkisi de girilmediyse hata ver
        else {
            return interaction.reply({ content: "❌ You must either select a user or provide a User ID!", ephemeral: true });
        }

        try {
            // Şık bir Embed hazırlayalım
            const dmEmbed = new EmbedBuilder()
                .setTitle("📩 New Message from Support")
                .setDescription(messageContent)
                .setColor("#7289DA")
                .setFooter({ text: `Sent by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            await user.send({ embeds: [dmEmbed] });

            // Onay mesajı
            await interaction.reply({ 
                content: `✅ Successfully sent the message to **${user.tag}**!`, 
                ephemeral: true 
            });

        } catch (error) {
            console.error(error);
            await interaction.reply({ 
                content: `❌ I couldn't DM **${user.tag}**. Their DMs might be closed or they have blocked the bot.`, 
                ephemeral: true 
            });
        }
    },
};