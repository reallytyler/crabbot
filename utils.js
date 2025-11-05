const crabTypes = require('../config/crabTypes');
const messages = require('../config/messages');

const activeCrabs = new Map();

function spawnCrab(guildId, channelId) {
    const crabId = `crab_${guildId}_${Date.now()}`;
    
    // Random crab type with rarity
    const randomCrab = crabTypes[Math.floor(Math.random() * crabTypes.length)];
    const rarityMultiplier = {
        common: 1,
        uncommon: 1.5,
        rare: 2,
        epic: 3,
        legendary: 5
    };
    
    const crab = {
        id: crabId,
        guildId,
        channelId,
        spawnTime: Date.now(),
        caught: false,
        type: randomCrab.name,
        rarity: randomCrab.rarity,
        image: randomCrab.image,
        value: Math.floor(Math.random() * 15 * rarityMultiplier[randomCrab.rarity]) + 5
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

function getCrab(crabId) {
    return activeCrabs.get(crabId);
}

function removeCrab(crabId) {
    activeCrabs.delete(crabId);
}

function getRandomAppearanceMessage() {
    return messages.appearance[Math.floor(Math.random() * messages.appearance.length)];
}

function getRandomCatchMessage(username) {
    const message = messages.catchMessages[Math.floor(Math.random() * messages.catchMessages.length)];
    return message.replace('{user}', username);
}

function getRandomLevelUpMessage(level) {
    const message = messages.levelUp[Math.floor(Math.random() * messages.levelUp.length)];
    return message.replace('{level}', level);
}

module.exports = {
    spawnCrab,
    getCrab,
    removeCrab,
    getRandomAppearanceMessage,
    getRandomCatchMessage,
    getRandomLevelUpMessage
};
