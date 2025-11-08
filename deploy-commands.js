const { REST, Routes } = require('discord.js');
require('dotenv').config();

const commands = [
  {
    name: 'setup',
    description: 'Set up Crab Bot in this server (Admin only)'
  },
  {
    name: 'forget',
    description: 'Reset all Crab Bot data for this server (Admin only)'
  },
  {
    name: 'forcespawn',
    description: 'Force a crab to spawn (Admin only)'
  },
  {
    name: 'catch',
    description: 'Catch the current crab in this channel'
  },
  {
    name: 'coins',
    description: 'Check your coin balance'
  },
  {
    name: 'profile',
    description: 'View your crab hunting profile'
  },
  {
    name: 'avatar',
    description: 'Get a user\'s avatar',
    options: [
      {
        name: 'user',
        type: 6,
        description: 'The user to get the avatar of',
        required: false
      }
    ]
  },
  {
    name: '8ball',
    description: 'Ask the magic 8-ball a question',
    options: [
      {
        name: 'question',
        type: 3,
        description: 'Your question for the magic 8-ball',
        required: true
      }
    ]
  },
  {
    name: 'wyr',
    description: 'Would you rather - choose between options',
    options: [
      {
        name: 'option1',
        type: 3,
        description: 'First option',
        required: true
      },
      {
        name: 'option2',
        type: 3,
        description: 'Second option',
        required: true
      }
    ]
  },
  {
    name: 'meme',
    description: 'Get a random meme'
  },
  {
    name: 'help',
    description: 'Show all Crab Bot commands'
  }
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('🔄 Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands },
    );

    console.log('✅ Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('❌ Error deploying commands:', error);
  }
})();