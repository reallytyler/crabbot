const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ActivityType } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Bot configuration - ONLY FROM ENVIRONMENT
const config = {
    prefix: '!',
    token: process.env.TOKEN, // Only from secrets
    ownerId: process.env.OWNER_ID || 'YOUR_USER_ID_HERE'
};

// Check if token exists
if (!config.token) {
    console.error('❌ ERROR: TOKEN not found in environment variables!');
    console.error('💡 Set TOKEN in GitHub Codespaces secrets');
    process.exit(1);
}

// Initialize client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions
    ]
});

// Data storage
const dataDir = './data';
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// Load data functions
function loadJSON(filename, defaultData = {}) {
    try {
        return JSON.parse(fs.readFileSync(path.join(dataDir, filename), 'utf8'));
    } catch {
        return defaultData;
    }
}

function saveJSON(filename, data) {
    fs.writeFileSync(path.join(dataDir, filename), JSON.stringify(data, null, 2));
}

// Data structures
let guildData = loadJSON('guilds.json', {});
let userData = loadJSON('users.json', {});
let serverConfigs = loadJSON('server_configs.json', {});

// Crab data
const CRAB_IMAGES = [
    "https://media.istockphoto.com/id/544453032/photo/crab-close-up-cuba.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Sally_Lightfoot_Crab_2019.jpg/1200px-Sally_Lightfoot_Crab_2019.jpg",
    "https://plus.unsplash.com/premium_photo-1667864262393-b5319164c532",
    "https://images.unsplash.com/photo-1580841129862-bc2a2d113c45",
    "https://images.unsplash.com/photo-1527681192512-bca34fd580bb"
];

const CRAB_FACTS = [
    "🦀 Crabs have 10 legs and walk sideways!",
    "🦀 There are over 4,500 species of crabs worldwide.",
    "🦀 The Japanese spider crab has the largest leg span of any arthropod.",
    "🦀 Crabs can regenerate lost limbs during molting.",
    "🦀 Some crabs can live up to 100 years!",
    "🦀 Crabs communicate by drumming or waving their claws.",
    "🦀 The coconut crab is the largest land-living arthropod.",
    "🦀 Crabs have excellent vision and can see in multiple directions."
];

const APPEARANCE_MESSAGES = [
    "🦀 A crab just scuttled into the server! Click the button to catch it!",
    "🦀 Look! A crab appeared! Quick, catch it!",
    "🦀 Crab alert! A crab has been spotted!",
    "🦀 Pinch, pinch! A crab is here! Catch it before it runs away!",
    "🦀 Sideways walking friend appeared! Catch it!"
];

// Crab appearance system
const activeCrabs = new Map();

function spawnCrab(guildId, channelId) {
    const crabId = `crab_${guildId}_${Date.now()}`;
    const crab = {
        id: crabId,
        guildId,
        channelId,
        spawnTime: Date.now(),
        caught: false,
        value: Math.floor(Math.random() * 15) + 5
    };
    
    activeCrabs.set(crabId, crab);
    
    // Auto-remove after 5 minutes
    setTimeout(() => {
        if (activeCrabs.has(crabId) && !activeCrabs.get(crabId).caught) {
            activeCrabs.delete(crabId);
        }
    }, 5 * 60 * 1000);
    
    return crab;
}

// User economy system
function getUserData(userId) {
    const id = userId.toString();
    if (!userData[id]) {
        userData[id] = {
            crabs: 0,
            coins: 0,
            level: 1,
            xp: 0,
            inventory: [],
            totalCaught: 0
        };
        saveJSON('users.json', userData);
    }
    return userData[id];
}

function saveUserData(userId, data) {
    userData[userId.toString()] = data;
    saveJSON('users.json', userData);
}

function addCatch(userId, coins = 0, xp = 0) {
    const user = getUserData(userId);
    user.crabs++;
    user.totalCaught++;
    user.coins += coins;
    user.xp += xp;
    
    // Level up system
    const xpNeeded = user.level * 100;
    if (user.xp >= xpNeeded) {
        user.level++;
        user.xp = 0;
        saveUserData(userId, user);
        return { user, leveledUp: true };
    }
    
    saveUserData(userId, user);
    return { user, leveledUp: false };
}

// Server configuration
function getServerConfig(guildId) {
    const id = guildId.toString();
    if (!serverConfigs[id]) {
        serverConfigs[id] = {
            prefix: '!',
            crabChannel: null,
            enabled: false
        };
        saveJSON('server_configs.json', serverConfigs);
    }
    return serverConfigs[id];
}

function saveServerConfig(guildId, config) {
    serverConfigs[guildId.toString()] = config;
    saveJSON('server_configs.json', serverConfigs);
}

// Bot events
client.once('ready', () => {
    console.log(`🦀 ${client.user.tag} is ready!`);
    console.log(`🦀 Serving ${client.guilds.cache.size} servers`);
    console.log(`🌐 Running in: ${process.env.CODESPACES ? 'GitHub Codespaces' : 'Local'}`);
    
    client.user.setActivity('for crabs 🦀', { type: ActivityType.Watching });
    
    // Start crab spawning interval
    setInterval(() => {
        for (const [guildId, config] of Object.entries(serverConfigs)) {
            if (config.enabled && config.crabChannel) {
                const channel = client.channels.cache.get(config.crabChannel);
                if (channel && Math.random() < 0.7) { // 70% chance
                    const crab = spawnCrab(guildId, config.crabChannel);
                    sendCrabAppearance(channel, crab);
                }
            }
        }
    }, 10 * 60 * 1000); // Every 10 minutes
});

async function sendCrabAppearance(channel, crab) {
    const embed = new EmbedBuilder()
        .setTitle('🦀 A Crab Appeared!')
        .setDescription(APPEARANCE_MESSAGES[Math.floor(Math.random() * APPEARANCE_MESSAGES.length)])
        .setImage(CRAB_IMAGES[Math.floor(Math.random() * CRAB_IMAGES.length)])
        .setColor(0xFF6B6B)
        .setFooter({ text: 'Click the button below to catch it!' });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`catch_${crab.id}`)
                .setLabel('🎣 Catch Crab!')
                .setStyle(ButtonStyle.Success)
        );

    await channel.send({ embeds: [embed], components: [row] });
}

// Button interactions
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    if (interaction.customId.startsWith('catch_')) {
        const crabId = interaction.customId.replace('catch_', '');
        const crab = activeCrabs.get(crabId);
        
        if (!crab) {
            await interaction.reply({ content: '🦀 This crab has already been caught or disappeared!', ephemeral: true });
            return;
        }
        
        if (crab.caught) {
            await interaction.reply({ content: '🦀 Someone already caught this crab!', ephemeral: true });
            return;
        }
        
        // Mark as caught
        crab.caught = true;
        activeCrabs.delete(crabId);
        
        const coins = crab.value;
        const xp = Math.floor(Math.random() * 3) + 1;
        const result = addCatch(interaction.user.id, coins, xp);
        
        const embed = new EmbedBuilder()
            .setTitle('🦀 Crab Caught!')
            .setDescription(`**${interaction.user.displayName}** caught the crab!`)
            .setColor(0x00FF00)
            .addFields(
                { name: '🪙 Crab Coins', value: `+${coins}`, inline: true },
                { name: '⭐ XP', value: `+${xp}`, inline: true },
                { name: '📊 Total Crabs', value: result.user.totalCaught.toString(), inline: true }
            );
        
        if (result.leveledUp) {
            embed.setFooter({ text: `🎉 Level up! You're now level ${result.user.level}!` });
        } else {
            embed.setFooter({ text: `You now have ${result.user.coins} Crab Coins` });
        }
        
        // Disable the button
        const disabledRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`catch_${crab.id}`)
                    .setLabel('✅ Caught!')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
            );
        
        await interaction.update({ embeds: [embed], components: [disabledRow] });
    }
});

// Command handling
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    
    const serverConfig = getServerConfig(message.guild?.id);
    const prefix = serverConfig.prefix;
    
    if (!message.content.startsWith(prefix)) return;
    
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    
    try {
        switch (command) {
            case 'crab':
                await crabCommand(message);
                break;
            case 'profile':
                await profileCommand(message, args);
                break;
            case 'shop':
                await shopCommand(message);
                break;
            case 'buy':
                await buyCommand(message, args);
                break;
            case 'inventory':
                await inventoryCommand(message);
                break;
            case 'leaderboard':
                await leaderboardCommand(message);
                break;
            case 'setup':
                await setupCommand(message, args);
                break;
            case 'prefix':
                await prefixCommand(message, args);
                break;
            case 'help':
                await helpCommand(message);
                break;
            case 'ping':
                await pingCommand(message);
                break;
            case 'about':
                await aboutCommand(message);
                break;
        }
    } catch (error) {
        console.error('Command error:', error);
        await message.reply('🦀 An error occurred while executing that command.');
    }
});

// Command implementations
async function crabCommand(message) {
    const embed = new EmbedBuilder()
        .setTitle('🦀 Crab!')
        .setImage(CRAB_IMAGES[Math.floor(Math.random() * CRAB_IMAGES.length)])
        .setColor(0xFF6B6B)
        .setFooter({ text: 'Use !help for all commands' });
    
    await message.reply({ embeds: [embed] });
}

async function profileCommand(message, args) {
    const target = message.mentions.users.first() || message.author;
    const user = getUserData(target.id);
    const serverConfig = getServerConfig(message.guild.id);
    
    const embed = new EmbedBuilder()
        .setTitle(`🦀 ${target.displayName}'s Crab Profile`)
        .setThumbnail(target.displayAvatarURL())
        .setColor(0x7289DA)
        .addFields(
            { name: '📊 Level', value: user.level.toString(), inline: true },
            { name: '⭐ XP', value: `${user.xp}/${user.level * 100}`, inline: true },
            { name: '🦀 Crabs Caught', value: user.totalCaught.toString(), inline: true },
            { name: '🪙 Crab Coins', value: user.coins.toString(), inline: true },
            { name: '🎒 Inventory', value: `${user.inventory.length} items`, inline: true },
            { name: '🔤 Server Prefix', value: serverConfig.prefix, inline: true }
        );
    
    await message.reply({ embeds: [embed] });
}

async function shopCommand(message) {
    const embed = new EmbedBuilder()
        .setTitle('🦀 Crab Shop')
        .setDescription('Spend your Crab Coins here!')
        .setColor(0xFFD700)
        .addFields(
            { name: '🦀 Rare Crab', value: 'A special rare crab for your collection - 50 coins', inline: false },
            { name: '🏠 Crab House', value: 'A cozy home for your crabs - 100 coins', inline: false },
            { name: '🎣 Golden Net', value: 'Increases catch chance - 200 coins', inline: false },
            { name: '👑 Crab Crown', value: 'Become the crab king/queen - 500 coins', inline: false },
            { name: '💎 Crystal Crab', value: 'Legendary shiny crab - 1000 coins', inline: false }
        )
        .setFooter({ text: 'Use !buy [item] to purchase items' });
    
    await message.reply({ embeds: [embed] });
}

async function buyCommand(message, args) {
    if (!args.length) {
        await message.reply('🦀 Please specify an item to buy. Use `!shop` to see available items.');
        return;
    }
    
    const item = args.join(' ').toLowerCase();
    const user = getUserData(message.author.id);
    
    const prices = {
        'rare crab': 50,
        'crab house': 100,
        'golden net': 200,
        'crab crown': 500,
        'crystal crab': 1000
    };
    
    if (!prices[item]) {
        await message.reply('🦀 That item doesn\'t exist in the shop! Use `!shop` to see available items.');
        return;
    }
    
    const price = prices[item];
    
    if (user.coins < price) {
        await message.reply(`🦀 You need ${price} Crab Coins to buy that! You have ${user.coins}.`);
        return;
    }
    
    user.coins -= price;
    user.inventory.push(item);
    saveUserData(message.author.id, user);
    
    const embed = new EmbedBuilder()
        .setTitle('🦀 Purchase Successful!')
        .setDescription(`You bought **${item}** for ${price} Crab Coins!`)
        .setColor(0x00FF00)
        .setFooter({ text: `You have ${user.coins} Crab Coins remaining` });
    
    await message.reply({ embeds: [embed] });
}

async function inventoryCommand(message) {
    const user = getUserData(message.author.id);
    
    if (!user.inventory.length) {
        await message.reply('🦀 Your inventory is empty! Catch some crabs and buy items from the shop.');
        return;
    }
    
    const itemCounts = {};
    user.inventory.forEach(item => {
        itemCounts[item] = (itemCounts[item] || 0) + 1;
    });
    
    const embed = new EmbedBuilder()
        .setTitle('🎒 Your Inventory')
        .setColor(0x964B00);
    
    for (const [item, count] of Object.entries(itemCounts)) {
        embed.addFields({ 
            name: item.charAt(0).toUpperCase() + item.slice(1), 
            value: `Quantity: ${count}`, 
            inline: true 
        });
    }
    
    await message.reply({ embeds: [embed] });
}

async function leaderboardCommand(message) {
    const topUsers = Object.entries(userData)
        .filter(([_, data]) => data.totalCaught > 0)
        .sort((a, b) => b[1].totalCaught - a[1].totalCaught)
        .slice(0, 10);
    
    const embed = new EmbedBuilder()
        .setTitle('🏆 Crab Leaderboard')
        .setColor(0xFFD700);
    
    if (!topUsers.length) {
        embed.setDescription('No crabs caught yet! Be the first to catch one!');
    } else {
        for (let i = 0; i < topUsers.length; i++) {
            const [userId, data] = topUsers[i];
            try {
                const user = await client.users.fetch(userId);
                const medal = i < 3 ? ['🥇', '🥈', '🥉'][i] : `${i + 1}.`;
                embed.addFields({
                    name: `${medal} ${user.displayName}`,
                    value: `🦀 ${data.totalCaught} crabs | ⭐ Lvl ${data.level}`,
                    inline: false
                });
            } catch {
                // Skip if user not found
            }
        }
    }
    
    await message.reply({ embeds: [embed] });
}

async function setupCommand(message, args) {
    if (!message.member.permissions.has('ADMINISTRATOR')) {
        await message.reply('🦀 You need **Administrator** permissions to set up the bot.');
        return;
    }
    
    const channel = message.mentions.channels.first();
    if (!channel) {
        await message.reply('🦀 Please mention a channel where crabs should appear. Example: `!setup #general`');
        return;
    }
    
    const serverConfig = getServerConfig(message.guild.id);
    serverConfig.crabChannel = channel.id;
    serverConfig.enabled = true;
    saveServerConfig(message.guild.id, serverConfig);
    
    const embed = new EmbedBuilder()
        .setTitle('🦀 Crab Bot Setup Complete!')
        .setDescription(`Crab appearances enabled in ${channel}`)
        .setColor(0x00FF00)
        .addFields(
            { name: 'Crab Frequency', value: 'Every 10 minutes', inline: true },
            { name: 'Server Prefix', value: serverConfig.prefix, inline: true }
        )
        .setFooter({ text: `Use ${serverConfig.prefix}help for all commands` });
    
    await message.reply({ embeds: [embed] });
}

async function prefixCommand(message, args) {
    if (!message.member.permissions.has('ADMINISTRATOR')) {
        await message.reply('🦀 You need **Administrator** permissions to change the prefix.');
        return;
    }
    
    if (!args.length || args[0].length > 3) {
        await message.reply('🦀 Please provide a new prefix (1-3 characters). Example: `!prefix $`');
        return;
    }
    
    const newPrefix = args[0];
    const serverConfig = getServerConfig(message.guild.id);
    const oldPrefix = serverConfig.prefix;
    serverConfig.prefix = newPrefix;
    saveServerConfig(message.guild.id, serverConfig);
    
    const embed = new EmbedBuilder()
        .setTitle('✅ Prefix Updated!')
        .setDescription(`Server prefix changed from \`${oldPrefix}\` to \`${newPrefix}\``)
        .setColor(0x00FF00)
        .addFields({ name: 'Example', value: `Now use \`${newPrefix}crab\` instead of \`${oldPrefix}crab\`` })
        .setFooter({ text: 'This change only affects this server!' });
    
    await message.reply({ embeds: [embed] });
}

async function pingCommand(message) {
    const embed = new EmbedBuilder()
        .setTitle('🏓 Pong!')
        .setDescription(`Latency: ${Date.now() - message.createdTimestamp}ms\nAPI Latency: ${Math.round(client.ws.ping)}ms`)
        .setColor(0x00FF00);
    
    await message.reply({ embeds: [embed] });
}

async function aboutCommand(message) {
    const embed = new EmbedBuilder()
        .setTitle('🦀 About Crab Bot')
        .setDescription('A fun Discord bot where crabs randomly appear and users can catch them to earn coins, level up, and buy items from the shop!')
        .setColor(0x7289DA)
        .addFields(
            { name: '📊 Servers', value: client.guilds.cache.size.toString(), inline: true },
            { name: '👥 Users', value: Object.keys(userData).length.toString(), inline: true },
            { name: '⚡ Version', value: '2.1.0', inline: true },
            { name: '🎨 Inspiration', value: '[cat-bot](https://github.com/milenakos/cat-bot)', inline: false },
            { name: '⚖️ License', value: 'AGPL-3.0', inline: false }
        )
        .setFooter({ text: 'Made with ❤️ and 🦀' });
    
    await message.reply({ embeds: [embed] });
}

async function helpCommand(message) {
    const serverConfig = getServerConfig(message.guild.id);
    const prefix = serverConfig.prefix;
    
    const embed = new EmbedBuilder()
        .setTitle('🦀 Crab Bot Help')
        .setDescription(`**Server:** ${message.guild.name}\n**Prefix:** \`${prefix}\``)
        .setColor(0x7289DA)
        .addFields(
            { 
                name: '⚙️ Server Commands', 
                value: `\`${prefix}setup #channel\` - Set up crab channel (Admin)\n\`${prefix}prefix <new>\` - Change prefix (Admin)\n\`${prefix}help\` - This help message`,
                inline: false 
            },
            { 
                name: '🎮 Core Commands', 
                value: `\`${prefix}crab\` - Get crab image\n\`${prefix}profile\` - Check profile\n\`${prefix}shop\` - Browse shop\n\`${prefix}buy <item>\` - Buy items\n\`${prefix}inventory\` - Check inventory\n\`${prefix}leaderboard\` - View leaderboard`,
                inline: true 
            },
            {
                name: 'ℹ️ Info Commands',
                value: `\`${prefix}ping\` - Check latency\n\`${prefix}about\` - About the bot`,
                inline: true
            }
        )
        .setFooter({ text: 'Inspired by cat-bot | AGPL-3.0 License' });
    
    await message.reply({ embeds: [embed] });
}

// Error handling
client.on('error', console.error);
process.on('unhandledRejection', console.error);

// Start the bot
console.log('🦀 Starting Crab Bot...');
console.log('🌐 Environment:', process.env.CODESPACES ? 'GitHub Codespaces' : 'Local');
console.log('⚖️ License: AGPL-3.0');

client.login(config.token).catch(error => {
    console.error('❌ Failed to login:', error);
    process.exit(1);
});
