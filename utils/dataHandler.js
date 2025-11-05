const fs = require('fs');
const path = require('path');

const dataDir = './data';
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

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

let guildData = loadJSON('guilds.json', {});
let userData = loadJSON('users.json', {});
let serverConfigs = loadJSON('serverConfigs.json', {});

module.exports = {
    getUserData: (userId) => {
        const id = userId.toString();
        if (!userData[id]) {
            userData[id] = {
                crabs: 0,
                coins: 100,
                level: 1,
                xp: 0,
                inventory: [],
                totalCaught: 0,
                crabCollection: {}
            };
            saveJSON('users.json', userData);
        }
        return userData[id];
    },
    
    saveUserData: (userId, data) => {
        userData[userId.toString()] = data;
        saveJSON('users.json', userData);
    },
    
    getServerConfig: (guildId) => {
        const id = guildId.toString();
        if (!serverConfigs[id]) {
            serverConfigs[id] = {
                prefix: '!',
                crabChannel: null,
                enabled: false,
                frequency: 10,
                claimMessage: "caught the crab!"
            };
            saveJSON('serverConfigs.json', serverConfigs);
        }
        return serverConfigs[id];
    },
    
    saveServerConfig: (guildId, config) => {
        serverConfigs[guildId.toString()] = config;
        saveJSON('serverConfigs.json', serverConfigs);
    },
    
    getAllUsers: () => userData,
    
    addCatch: (userId, coins = 0, xp = 0, crabType = "common") => {
        const user = module.exports.getUserData(userId);
        user.crabs++;
        user.totalCaught++;
        user.coins += coins;
        user.xp += xp;
        
        // Add to crab collection
        if (!user.crabCollection[crabType]) {
            user.crabCollection[crabType] = 0;
        }
        user.crabCollection[crabType]++;
        
        // Level up system
        const xpNeeded = user.level * 100;
        if (user.xp >= xpNeeded) {
            user.level++;
            user.xp = 0;
            module.exports.saveUserData(userId, user);
            return { user, leveledUp: true };
        }
        
        module.exports.saveUserData(userId, user);
        return { user, leveledUp: false };
    }
};
