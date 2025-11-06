const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ActivityType, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Bot configuration from .env
const config = {
    token: process.env.TOKEN,
    ownerId: process.env.OWNER_ID,
    defaultPrefix: 'c!'
};

// Validate required environment variables
if (!config.token) {
    console.error('❌ ERROR: TOKEN not found in .env file!');
    console.error('💡 Create a .env file with: TOKEN=your_bot_token_here');
    console.error('💡 Make sure to install dotenv: npm install dotenv');
    process.exit(1);
}

if (!config.ownerId) {
    console.warn('⚠️ WARNING: OWNER_ID not set in .env file!');
    console.warn('💡 Add to .env: OWNER_ID=your_discord_user_id');
    console.warn('🔒 Some admin features will be restricted');
}

// Initialize client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Data storage
const dataDir = './data';
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

function loadData(filename, defaultData = {}) {
    try {
        return JSON.parse(fs.readFileSync(path.join(dataDir, filename), 'utf8'));
    } catch {
        return defaultData;
    }
}

function saveData(filename, data) {
    fs.writeFileSync(path.join(dataDir, filename), JSON.stringify(data, null, 2));
}

let users = loadData('users.json', {});
let servers = loadData('servers.json', {});
let activeCrabs = loadData('activeCrabs.json', {});

// Crab data - now with local images
const CRAB_TYPES = [
    { name: "Red Crab", rarity: "common", value: 10, image: "red_crab.png" },
    { name: "Blue Crab", rarity: "uncommon", value: 15, image: "blue_crab.png" },
    { name: "Hermit Crab", rarity: "common", value: 8, image: "hermit_crab.png" },
    { name: "King Crab", rarity: "rare", value: 25, image: "king_crab.png" },
    { name: "Spider Crab", rarity: "epic", value: 40, image: "spider_crab.png" },
    { name: "Coconut Crab", rarity: "legendary", value: 75, image: "coconut_crab.png" },
    { name: "Ghost Crab", rarity: "epic", value: 45, image: "ghost_crab.png" },
    { name: "Fiddler Crab", rarity: "uncommon", value: 12, image: "fiddler_crab.png" }
];

// Emoji for dancing crab
const DANCING_CRAB_EMOJI = '<a:dancingcrab:1436036204150788259>';

// Slash commands
const commands = [
    {
        name: 'help',
        description: 'Show all commands'
    },
    {
        name: 'crab',
        description: 'Catch a crab that appears!'
    },
    {
        name: 'profile',
        description: 'Check your crab profile',
        options: [{
            name: 'user',
            description: 'User to check',
            type: 6,
            required: false
        }]
    },
    {
        name: 'shop',
        description: 'Browse the crab shop'
    },
    {
        name: 'buy',
        description: 'Buy items from shop',
        options: [{
            name: 'item',
            description: 'Item to buy',
            type: 3,
            required: true,
            choices: [
                { name: 'Rare Crab', value: 'rare crab' },
                { name: 'Crab House', value: 'crab house' },
                { name: 'Golden Net', value: 'golden net' },
                { name: 'Crab Crown', value: 'crab crown' }
            ]
        }]
    },
    {
        name: 'inventory',
        description: 'Check your inventory'
    },
    {
        name: 'leaderboard',
        description: 'View crab leaderboard'
    },
    {
        name: 'setup',
        description: 'Setup crab channel',
        options: [{
            name: 'channel',
            description: 'Channel for crabs',
            type: 7,
            required: true
        }]
    },
    {
        name: 'prefix',
        description: 'Change bot prefix for this server',
        options: [{
            name: 'new_prefix',
            description: 'New prefix (up to 5 characters)',
            type: 3,
            required: true
        }]
    },
    {
        name: 'serverinfo',
        description: 'Show server configuration'
    },
    {
        name: 'test',
        description: 'Run bot tests (Owner only)'
    },
    {
        name: 'stats',
        description: 'Show bot statistics'
    },
    {
        name: 'crabs',
        description: 'View your caught crabs collection'
    }
];

// User management
function getUser(userId) {
    const id = userId.toString();
    if (!users[id]) {
        users[id] = {
            crabs: 0,
            coins: 100,
            level: 1,
            xp: 0,
            inventory: [],
            total: 0,
            crabCollection: {}, // Track individual crab types
            firstCatch: Date.now()
        };
        saveData('users.json', users);
    }
    return users[id];
}

function saveUser(userId, data) {
    users[userId.toString()] = data;
    saveData('users.json', users);
}

function getServer(guildId) {
    const id = guildId.toString();
    if (!servers[id]) {
        servers[id] = {
            prefix: config.defaultPrefix,
            channel: null,
            enabled: false
        };
        saveData('servers.json', servers);
    }
    return servers[id];
}

function saveServer(guildId, data) {
    servers[guildId.toString()] = data;
    saveData('servers.json', servers);
}

// Crab spawning - NEW SYSTEM
function spawnCrab(guildId, channelId) {
    const crabId = `${guildId}_${Date.now()}`;
    const crabType = CRAB_TYPES[Math.floor(Math.random() * CRAB_TYPES.length)];
    
    activeCrabs[crabId] = {
        id: crabId,
        guildId,
        channelId,
        type: crabType.name,
        rarity: crabType.rarity,
        value: crabType.value,
        image: crabType.image,
        spawnTime: Date.now(),
        caught: false,
        catchWord: 'crab' // The word users need to type
    };
    
    saveData('activeCrabs.json', activeCrabs);
    
    // Remove crab after 5 minutes if not caught
    setTimeout(() => {
        if (activeCrabs[crabId] && !activeCrabs[crabId].caught) {
            delete activeCrabs[crabId];
            saveData('activeCrabs.json', activeCrabs);
        }
    }, 300000); // 5 minutes
    
    return activeCrabs[crabId];
}

// Bot ready
client.once('ready', async () => {
    console.log(`🦀 ${client.user.tag} is ready! v4.0-CATCH`);
    console.log(`👑 Owner ID: ${config.ownerId || 'Not set'}`);
    console.log(`🌐 Servers: ${client.guilds.cache.size}`);
    console.log(`🎯 Catch System: Type "crab" to catch!`);
    
    // Register commands
    try {
        const rest = new REST({ version: '10' }).setToken(config.token);
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✅ Slash commands registered');
    } catch (error) {
        console.error('❌ Error registering commands:', error);
    }
    
    client.user.setActivity('Type "crab" to catch! | /help', { type: ActivityType.Watching });
    
    // Crab spawning loop - every 3 minutes
    setInterval(() => {
        Object.values(servers).forEach(server => {
            if (server.enabled && server.channel) {
                const channel = client.channels.cache.get(server.channel);
                if (channel && Math.random() < 0.8) { // 80% chance to spawn
                    const crab = spawnCrab(channel.guild.id, server.channel);
                    sendCrab(channel, crab);
                }
            }
        });
    }, 180000); // 3 minutes
});

// NEW: Send crab appearance message
async function sendCrab(channel, crab) {
    const embed = new EmbedBuilder()
        .setTitle(`${DANCING_CRAB_EMOJI} ${crab.type} has appeared!`)
        .setDescription(`**Type \`"crab"\` to catch it!**`)
        .setColor(0xFF6B6B)
        .setImage(`attachment://${crab.image}`)
        .addFields(
            { name: 'Rarity', value: crab.rarity, inline: true },
            { name: 'Value', value: `${crab.value} coins`, inline: true }
        )
        .setFooter({ text: 'You have 5 minutes to catch this crab! ⏰' });

    try {
        // Send with local image attachment
        await channel.send({
            embeds: [embed],
            files: [`./images/${crab.image}`]
        });
    } catch (error) {
        console.error('Error sending crab image:', error);
        // Fallback without image
        await channel.send({
            embeds: [embed]
        });
    }
}

// NEW: Message handler for catching crabs
client.on('messageCreate', async message => {
    // Ignore bot messages and DMs
    if (message.author.bot || !message.guild) return;
    
    const content = message.content.toLowerCase().trim();
    
    // Check if message is "crab" (case insensitive)
    if (content === 'crab' || content === '"crab"') {
        await handleCrabCatch(message);
    }
});

// NEW: Handle crab catching
async function handleCrabCatch(message) {
    const server = getServer(message.guild.id);
    
    // Find active crab in this channel
    const activeCrab = Object.values(activeCrabs).find(
        crab => crab.channelId === message.channel.id && !crab.caught
    );
    
    if (!activeCrab) {
        // No crab to catch, but give friendly response
        if (Math.random() < 0.3) { // 30% chance for fun response
            await message.reply('No crab here! Keep looking! 🦀');
        }
        return;
    }
    
    const user = getUser(message.author.id);
    const catchTime = Date.now() - activeCrab.spawnTime;
    const catchTimeSeconds = Math.floor(catchTime / 1000);
    
    // Mark crab as caught
    activeCrab.caught = true;
    activeCrab.caughtBy = message.author.id;
    activeCrab.catchTime = catchTime;
    
    // Update user stats
    user.coins += activeCrab.value;
    user.xp += Math.floor(Math.random() * 5) + 1;
    user.total++;
    
    // Update crab collection
    if (!user.crabCollection) user.crabCollection = {};
    if (!user.crabCollection[activeCrab.type]) {
        user.crabCollection[activeCrab.type] = 0;
    }
    user.crabCollection[activeCrab.type]++;
    
    // Level up check
    if (user.xp >= user.level * 100) {
        user.level++;
        user.xp = 0;
    }
    
    saveUser(message.author.id, user);
    saveData('activeCrabs.json', activeCrabs);
    
    // Send catch message
    const embed = new EmbedBuilder()
        .setTitle('🎣 CRAB CAUGHT!')
        .setDescription(`**${message.author.displayName}** caught ${DANCING_CRAB_EMOJI} **${activeCrab.type}**!!!!1!`)
        .setColor(0x00FF00)
        .addFields(
            { 
                name: 'Collection', 
                value: `You now have **${user.crabCollection[activeCrab.type]}** ${activeCrab.type}s!!!`, 
                inline: true 
            },
            { 
                name: 'Coins Earned', 
                value: `+${activeCrab.value} 🪙`, 
                inline: true 
            },
            { 
                name: 'Catch Time', 
                value: `This fella was caught in **${catchTimeSeconds} seconds**!!!!`, 
                inline: false 
            }
        )
        .setThumbnail(`attachment://${activeCrab.image}`);
    
    if (user.xp === 0) {
        embed.addFields({ 
            name: '🎉 Level Up!', 
            value: `You're now level ${user.level}!`, 
            inline: false 
        });
    }
    
    try {
        await message.reply({
            embeds: [embed],
            files: [`./images/${activeCrab.image}`]
        });
    } catch (error) {
        await message.reply({ embeds: [embed] });
    }
}

// Interactions for other commands
client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        await handleCommand(interaction);
    }
});

// Command handlers (updated)
async function handleCommand(interaction) {
    const { commandName, options } = interaction;

    try {
        switch (commandName) {
            case 'help': await cmdHelp(interaction); break;
            case 'crab': await cmdCrab(interaction); break;
            case 'profile': await cmdProfile(interaction, options); break;
            case 'shop': await cmdShop(interaction); break;
            case 'buy': await cmdBuy(interaction, options); break;
            case 'inventory': await cmdInventory(interaction); break;
            case 'leaderboard': await cmdLeaderboard(interaction); break;
            case 'setup': await cmdSetup(interaction, options); break;
            case 'prefix': await cmdPrefix(interaction, options); break;
            case 'serverinfo': await cmdServerInfo(interaction); break;
            case 'test': await cmdTest(interaction); break;
            case 'stats': await cmdStats(interaction); break;
            case 'crabs': await cmdCrabs(interaction); break;
        }
    } catch (error) {
        console.error('Command error:', error);
        await interaction.reply({ content: '🦀 Error executing command', ephemeral: true });
    }
}

// NEW: Crabs collection command
async function cmdCrabs(interaction) {
    const user = getUser(interaction.user.id);
    
    if (!user.crabCollection || Object.keys(user.crabCollection).length === 0) {
        await interaction.reply({ 
            content: '🦀 You haven\'t caught any crabs yet! Wait for them to appear and type "crab" to catch!', 
            ephemeral: true 
        });
        return;
    }
    
    const embed = new EmbedBuilder()
        .setTitle(`🦀 ${interaction.user.displayName}'s Crab Collection`)
        .setColor(0xFF6B6B)
        .setDescription('Your amazing crab collection:');
    
    Object.entries(user.crabCollection).forEach(([crabType, count]) => {
        const crabData = CRAB_TYPES.find(c => c.name === crabType);
        const rarityEmoji = getRarityEmoji(crabData.rarity);
        embed.addFields({
            name: `${rarityEmoji} ${crabType}`,
            value: `**${count}** caught`,
            inline: true
        });
    });
    
    embed.setFooter({ text: `Total crabs caught: ${user.total}` });
    
    await interaction.reply({ embeds: [embed] });
}

function getRarityEmoji(rarity) {
    const emojis = {
        common: '⚪',
        uncommon: '🟢',
        rare: '🔵',
        epic: '🟣',
        legendary: '🟡'
    };
    return emojis[rarity] || '⚪';
}

// Updated help command
async function cmdHelp(interaction) {
    const server = getServer(interaction.guild.id);
    
    const embed = new EmbedBuilder()
        .setTitle('🦀 Crab Bot Commands - CATCH SYSTEM')
        .setDescription(`Crabs appear randomly! Type \`"crab"\` when you see one to catch it!\n**Server Prefix:** \`${server.prefix}\``)
        .setColor(0x7289DA)
        .addFields(
            { name: '🎯 Catching System', value: 'When a crab appears, type `"crab"` in chat to catch it!', inline: false },
            { name: '📊 Profile Commands', value: '`/profile` - Check stats\n`/crabs` - Your collection\n`/inventory` - Your items\n`/leaderboard` - Rankings', inline: true },
            { name: '🛍️ Shop Commands', value: '`/shop` - Browse shop\n`/buy` - Purchase items', inline: true },
            { name: '⚙️ Admin Commands', value: '`/setup` - Set crab channel\n`/prefix` - Change prefix\n`/serverinfo` - Server config', inline: true }
        )
        .setFooter({ text: 'v4.0-CATCH - Type "crab" to catch! 🎣' });

    await interaction.reply({ embeds: [embed] });
}

// Updated crab command to show info
async function cmdCrab(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('🦀 Crab Catching Guide')
        .setDescription('When a crab appears in the channel, type `"crab"` to catch it!')
        .setColor(0xFF6B6B)
        .addFields(
            { name: 'How to Catch', value: '1. Wait for crab to appear\n2. Type `"crab"` in chat\n3. Collect your reward!', inline: false },
            { name: 'Crab Rarities', value: 'Common ⚪ | Uncommon 🟢 | Rare 🔵\nEpic 🟣 | Legendary 🟡', inline: false }
        )
        .setFooter({ text: 'Keep an eye on the channel for crab appearances!' });

    await interaction.reply({ embeds: [embed] });
}

// Updated profile command
async function cmdProfile(interaction, options) {
    const target = options.getUser('user') || interaction.user;
    const user = getUser(target.id);

    const embed = new EmbedBuilder()
        .setTitle(`🦀 ${target.displayName}'s Crab Profile`)
        .setThumbnail(target.displayAvatarURL())
        .setColor(0x4FC3F7)
        .addFields(
            { name: '📊 Level', value: user.level.toString(), inline: true },
            { name: '⭐ XP', value: `${user.xp}/${user.level * 100}`, inline: true },
            { name: '🪙 Coins', value: user.coins.toString(), inline: true },
            { name: '🦀 Total Caught', value: user.total.toString(), inline: true },
            { name: '🎯 Unique Crabs', value: user.crabCollection ? Object.keys(user.crabCollection).length.toString() : '0', inline: true }
        );

    await interaction.reply({ embeds: [embed] });
}

// Keep other command functions the same as before (shop, buy, inventory, leaderboard, setup, prefix, serverinfo, test, stats)
// [Previous command implementations remain the same...]

// Error handling
client.on('error', console.error);
process.on('unhandledRejection', console.error);

// Start bot
console.log('🦀 Starting Crab Bot v4.0-CATCH...');
console.log('🔐 Using token from .env...');
console.log('👑 Owner ID:', config.ownerId || 'Not set');
console.log('🎯 Catch System: Type "crab" to catch crabs!');

client.login(config.token).catch(error => {
    console.error('❌ Failed to login:', error);
    process.exit(1);
});
