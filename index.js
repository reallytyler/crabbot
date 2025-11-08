// 🦀 Crab Bot — Slash Command Version with Per-Server Data
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActivityType,
  PermissionsBitField,
} = require("discord.js");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
  console.error("❌ Missing TOKEN or CLIENT_ID in .env");
  process.exit(1);
}

// ------------------ Data Files ------------------
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const serversFile = path.join(dataDir, 'servers.json');
const activeCrabsFile = path.join(dataDir, 'activeCrabs.json');
const coinsFile = path.join(dataDir, 'coins.json');

function load(file, def) {
  try { 
    if (!fs.existsSync(file)) {
      console.log(`📁 Creating ${path.basename(file)}...`);
      fs.writeFileSync(file, JSON.stringify(def, null, 2));
      return def;
    }
    const data = fs.readFileSync(file, "utf8");
    if (!data.trim()) return def;
    return JSON.parse(data);
  } catch (error) { 
    console.log(`❌ Error loading ${path.basename(file)}:`, error.message);
    return def; 
  }
}

function save(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (error) {
    console.log(`❌ Error saving ${path.basename(file)}:`, error.message);
  }
}

let servers = load(serversFile, {});
let activeCrabs = load(activeCrabsFile, {});
let coins = load(coinsFile, {});

// ------------------ Crab Types ------------------
const CRAB_TYPES = [
  { name: "Common Crab", rarity: "Common", value: 5, emoji: "🦀", color: 0x808080 },
  { name: "Blue Crab", rarity: "Uncommon", value: 15, emoji: "🔵", color: 0x0099FF },
  { name: "Golden Crab", rarity: "Rare", value: 50, emoji: "🌟", color: 0xFFD700 },
  { name: "Crystal Crab", rarity: "Epic", value: 100, emoji: "💎", color: 0x9370DB },
  { name: "Galaxy Crab", rarity: "Legendary", value: 250, emoji: "🌌", color: 0xFF4500 }
];

// ------------------ Bot Client ------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// ------------------ Helper Functions ------------------
function spawnCrab(guildId, channelId) {
  // Clean up old crabs first
  if (activeCrabs[guildId]) {
    activeCrabs[guildId] = activeCrabs[guildId].filter(
      crab => crab.caught || (Date.now() - crab.spawn < 10 * 60 * 1000)
    );
  }

  // Stop if one already active
  const alreadyActive = (activeCrabs[guildId] || []).find(c => !c.caught);
  if (alreadyActive) return null;

  const type = CRAB_TYPES[Math.floor(Math.random() * CRAB_TYPES.length)];
  const crab = {
    id: `${guildId}_${Date.now()}`,
    guildId,
    channelId,
    type: type.name,
    rarity: type.rarity,
    value: type.value,
    emoji: type.emoji,
    color: type.color,
    spawn: Date.now(),
    caught: false,
    caughtBy: null
  };

  if (!activeCrabs[guildId]) activeCrabs[guildId] = [];
  activeCrabs[guildId].push(crab);
  save(activeCrabsFile, activeCrabs);
  return crab;
}

function getRandomCoins() {
  const roll = Math.floor(Math.random() * 100) + 1;
  if (roll === 100) return 100;
  if (roll >= 60) return 60 + Math.floor(Math.random() * 31);
  return Math.floor(Math.random() * 59) + 1;
}

function updateBotStatus() {
  const guildCount = client.guilds.cache.size;
  client.user.setActivity({
    name: `crabbing in ${guildCount} servers`,
    type: ActivityType.Playing
  });
  console.log(`🦀 Status updated: crabbing in ${guildCount} servers`);
}

// ------------------ Interaction Handling ------------------
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, guild, channel, member, user, options } = interaction;
  const guildId = guild.id;
  const channelId = channel.id;
  const isAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);

  // Initialize server if not exists
  if (!servers[guildId]) {
    servers[guildId] = { 
      channel: channelId, 
      enabled: true, 
      prefix: "/" 
    };
    save(serversFile, servers);
  }

  // Defer reply to avoid timeout
  await interaction.deferReply();

  try {
    switch (commandName) {
      case 'setup':
        if (!isAdmin) {
          return interaction.editReply({ content: '❌ This command is for administrators only!' });
        }
        
        servers[guildId] = { 
          channel: channelId, 
          enabled: true, 
          prefix: "/" 
        };
        save(serversFile, servers);
        
        const setupEmbed = new EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle('✅ Crab Bot Setup Complete!')
          .setDescription('Crabs will now spawn in this channel!')
          .addFields(
            { name: 'Spawn Channel', value: `<#${channelId}>`, inline: true },
            { name: 'Status', value: '🟢 Enabled', inline: true },
            { name: 'Prefix', value: '`/`', inline: true }
          )
          .setFooter({ text: 'Use /help to see all commands' })
          .setTimestamp();
        
        return interaction.editReply({ embeds: [setupEmbed] });

      case 'forget':
        if (!isAdmin) {
          return interaction.editReply({ content: '❌ This command is for administrators only!' });
        }
        
        delete activeCrabs[guildId];
        delete coins[guildId];
        servers[guildId].enabled = false;
        
        save(activeCrabsFile, activeCrabs);
        save(coinsFile, coins);
        save(serversFile, servers);
        
        return interaction.editReply({ 
          content: '🗑️ All Crab Bot data has been reset for this server! The bot will remain but crabs are disabled. Use `/setup` to re-enable.' 
        });

      case 'forcespawn':
        if (!isAdmin) {
          return interaction.editReply({ content: '❌ This command is for administrators only!' });
        }
        
        const crab = spawnCrab(guildId, channelId);
        if (!crab) {
          return interaction.editReply({ content: '⚠️ There is already an active crab in this channel! Catch it first with `/catch`.' });
        }

        const crabEmbed = new EmbedBuilder()
          .setColor(crab.color)
          .setTitle(`${crab.emoji} A wild ${crab.type} has appeared!`)
          .setDescription(`**Rarity:** ${crab.rarity}\n**Value:** ${crab.value} coins\n\nUse \`/catch\` to catch it!`)
          .setFooter({ text: 'Hurry up before it runs away!' })
          .setTimestamp();
        
        return interaction.editReply({ embeds: [crabEmbed] });

      case 'catch':
        const activeCrab = (activeCrabs[guildId] || []).find(c => !c.caught && c.channelId === channelId);
        if (!activeCrab) {
          return interaction.editReply({ content: '❌ No crab to catch in this channel right now! Wait for one to spawn naturally or ask an admin to use `/forcespawn`.' });
        }

        activeCrab.caught = true;
        activeCrab.caughtBy = user.id;
        
        if (!coins[guildId]) coins[guildId] = {};
        const earned = getRandomCoins() + activeCrab.value;
        coins[guildId][user.id] = (coins[guildId][user.id] || 0) + earned;

        save(activeCrabsFile, activeCrabs);
        save(coinsFile, coins);

        const catchEmbed = new EmbedBuilder()
          .setColor(activeCrab.color)
          .setTitle(`🎣 ${user.username} caught a ${activeCrab.type}! ${activeCrab.emoji}`)
          .setDescription(`**Rarity:** ${activeCrab.rarity}\n**Base Value:** ${activeCrab.value} coins\n**Bonus:** ${earned - activeCrab.value} coins\n**Total Earned:** ${earned} coins!`)
          .setFooter({ text: `New balance: ${coins[guildId][user.id].toLocaleString()} coins` })
          .setTimestamp();
        
        return interaction.editReply({ embeds: [catchEmbed] });

      case 'coins':
        if (!coins[guildId]) coins[guildId] = {};
        const balance = coins[guildId][user.id] || 0;
        
        const coinsEmbed = new EmbedBuilder()
          .setColor(0xFFD700)
          .setTitle(`💰 ${user.username}'s Coins`)
          .setDescription(`**Balance:** ${balance.toLocaleString()} coins`)
          .setThumbnail(user.displayAvatarURL())
          .setFooter({ text: `Server: ${guild.name}` })
          .setTimestamp();
        
        return interaction.editReply({ embeds: [coinsEmbed] });

      case 'profile':
        if (!coins[guildId]) coins[guildId] = {};
        const userCoins = coins[guildId][user.id] || 0;
        const crabsCaught = (activeCrabs[guildId] || []).filter(c => c.caughtBy === user.id).length;
        
        const profileEmbed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle(`🦀 ${user.username}'s Profile`)
          .setThumbnail(user.displayAvatarURL())
          .addFields(
            { name: '💰 Coins', value: userCoins.toLocaleString(), inline: true },
            { name: '🎣 Crabs Caught', value: crabsCaught.toString(), inline: true },
            { name: '🏆 Level', value: '1', inline: true },
            { name: '⭐ XP', value: '0/100', inline: true },
            { name: '📈 Rank', value: '#1', inline: true },
            { name: '🕒 Member Since', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true }
          )
          .setFooter({ text: 'Crab Bot Profile' })
          .setTimestamp();
        
        return interaction.editReply({ embeds: [profileEmbed] });

      case 'avatar':
        const targetUser = options.getUser('user') || user;
        
        const avatarEmbed = new EmbedBuilder()
          .setColor(0x0099FF)
          .setTitle(`${targetUser.username}'s Avatar`)
          .setImage(targetUser.displayAvatarURL({ size: 512, extension: 'png' }))
          .setFooter({ text: `Requested by ${user.username}` })
          .setTimestamp();
        
        return interaction.editReply({ embeds: [avatarEmbed] });

      case '8ball':
        const question = options.getString('question');
        const answers = [
          "Yes", "No", "Maybe", "Definitely", 
          "Ask again later", "Absolutely", "Never",
          "Without a doubt", "Very doubtful", "Signs point to yes",
          "Don't count on it", "Outlook good", "My sources say no"
        ];
        const response = answers[Math.floor(Math.random() * answers.length)];
        
        const ballEmbed = new EmbedBuilder()
          .setColor(0x800080)
          .setTitle('🎱 Magic 8-Ball')
          .addFields(
            { name: 'Question', value: question },
            { name: 'Answer', value: `**${response}**` }
          )
          .setFooter({ text: 'The magic 8-ball has spoken!' })
          .setTimestamp();
        
        return interaction.editReply({ embeds: [ballEmbed] });

      case 'wyr':
        const option1 = options.getString('option1');
        const option2 = options.getString('option2');
        const choices = [option1, option2];
        const pick = choices[Math.floor(Math.random() * choices.length)];
        
        const wyrEmbed = new EmbedBuilder()
          .setColor(0xFF69B4)
          .setTitle('🤔 Would You Rather')
          .setDescription(`I choose: **${pick}**`)
          .addFields(
            { name: 'Option A', value: option1, inline: true },
            { name: 'Option B', value: option2, inline: true }
          )
          .setFooter({ text: 'That was a tough choice!' })
          .setTimestamp();
        
        return interaction.editReply({ embeds: [wyrEmbed] });

      case 'meme':
        const memes = [
          "https://i.imgur.com/8pm8t0s.jpg",
          "https://i.imgur.com/9g1q7e1.jpg", 
          "https://i.imgur.com/a1b2c3d4.jpg",
          "https://i.imgur.com/abc123.jpg"
        ];
        const meme = memes[Math.floor(Math.random() * memes.length)];
        
        const memeEmbed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('😂 Random Meme')
          .setImage(meme)
          .setFooter({ text: 'Courtesy of Crab Bot' })
          .setTimestamp();
        
        return interaction.editReply({ embeds: [memeEmbed] });

      case 'help':
        const helpEmbed = new EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle('🦀 Crab Bot Commands')
          .setDescription('All commands use slash (`/`) prefix!')
          .addFields(
            { 
              name: '🎣 Crab Commands', 
              value: '`/catch` - Catch the current crab\n`/coins` - Check your coin balance\n`/profile` - View your profile' 
            },
            { 
              name: '🛠️ Admin Commands', 
              value: '`/setup` - Set up the bot\n`/forget` - Reset bot data\n`/forcespawn` - Spawn a crab' 
            },
            { 
              name: '🎉 Fun Commands', 
              value: '`/avatar [user]` - Get user avatar\n`/8ball <question>` - Magic 8-ball\n`/wyr <option1> <option2>` - Would you rather\n`/meme` - Random meme' 
            }
          )
          .setFooter({ text: 'Crab Bot v4.3.0 - Full funsies!' })
          .setTimestamp();
        
        return interaction.editReply({ embeds: [helpEmbed] });

      default:
        return interaction.editReply({ content: '❌ Unknown command. Use `/help` to see all commands.' });
    }
  } catch (error) {
    console.error('❌ Error handling command:', error);
    return interaction.editReply({ content: '❌ An error occurred while processing your command.' });
  }
});

// ------------------ Auto Spawn Loop ------------------
setInterval(() => {
  for (const [guildId, serverConfig] of Object.entries(servers)) {
    if (!serverConfig.enabled || !serverConfig.channel) continue;
    
    const active = (activeCrabs[guildId] || []).find(c => !c.caught);
    if (active) continue;
    
    // 70% chance to spawn a crab
    if (Math.random() < 0.7) {
      const channel = client.channels.cache.get(serverConfig.channel);
      if (channel) {
        const crab = spawnCrab(guildId, serverConfig.channel);
        if (crab) {
          const embed = new EmbedBuilder()
            .setColor(crab.color)
            .setTitle(`${crab.emoji} A wild ${crab.type} has appeared!`)
            .setDescription(`**Rarity:** ${crab.rarity}\n**Value:** ${crab.value} coins\n\nUse \`/catch\` to catch it!`)
            .setFooter({ text: 'Crab Bot • Auto-spawn' })
            .setTimestamp();
          
          channel.send({ embeds: [embed] }).catch(error => {
            console.error(`❌ Error sending crab in guild ${guildId}:`, error.message);
          });
        }
      }
    }
  }
}, 180000); // 3 minutes

// ------------------ Client Events ------------------
client.once('ready', () => {
  console.log(`🦀 Logged in as ${client.user.tag}`);
  console.log(`📊 Serving ${client.guilds.cache.size} servers`);
  updateBotStatus();
  
  // Update status every 30 minutes
  setInterval(updateBotStatus, 30 * 60 * 1000);
});

client.on('guildCreate', (guild) => {
  console.log(`✅ Joined new guild: ${guild.name} (${guild.id})`);
  updateBotStatus();
});

client.on('guildDelete', (guild) => {
  console.log(`❌ Left guild: ${guild.name} (${guild.id})`);
  updateBotStatus();
});

// ------------------ Error Handling ------------------
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
});

// ------------------ Login ------------------
client.login(TOKEN).catch(error => {
  console.error('❌ Failed to login:', error);
  process.exit(1);
});