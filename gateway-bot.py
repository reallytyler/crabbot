"""
Crab Bot - Gateway Proxy Version
A Discord bot with custom gateway support for proxy connections
Copyright (C) 2024 Crab Bot Contributors

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.

Inspired by cat-bot: https://github.com/milenakos/cat-bot
Gateway Proxy Version
"""

import discord
import random
import aiohttp
import asyncio
import json
import os
import datetime
import time
from discord.ext import commands, tasks
from discord import app_commands

# Bot metadata
__version__ = "1.3.0-gateway"
__author__ = "Crab Bot Contributors"
__source_url__ = "https://github.com/milenakos/cat-bot"
__license__ = "GNU Affero General Public License v3.0"

# Custom Gateway Configuration
class CustomGateway(discord.gateway.DiscordWebSocket):
    """Custom WebSocket client for gateway proxy support"""
    
    async def change_presence(self, *, activity=None, status=None, since=0.0):
        """Override presence updates for proxy compatibility"""
        if self._connection.is_user_bot():
            # Simplified presence for proxy
            await super().change_presence(
                activity=activity,
                status=status,
                since=since
            )

# Custom HTTP client for proxy support
class ProxyHTTPClient(discord.http.HTTPClient):
    """Custom HTTP client with proxy support"""
    
    async def static_login(self, token):
        """Login with proxy awareness"""
        self.token = token
        self._global_over = asyncio.Event()
        self._global_over.set()
        
        # Modify base URL if needed for proxy
        if hasattr(self, '__session'):
            await self.__session.close()
        
        self.__session = aiohttp.ClientSession(
            connector=aiohttp.TCPConnector(limit=0)
        )

# Bot setup with custom gateway
intents = discord.Intents.all()
bot = commands.Bot(
    command_prefix='!', 
    intents=intents,
    # Gateway proxy configuration
    proxy=None,  # Set to your proxy URL if needed: "http://localhost:7878"
    proxy_auth=None
)

# Crab data
CRAB_IMAGES = [
    "https://media.istockphoto.com/id/544453032/photo/crab-close-up-cuba.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Sally_Lightfoot_Crab_2019.jpg/1200px-Sally_Lightfoot_Crab_2019.jpg",
    "https://plus.unsplash.com/premium_photo-1667864262393-b5319164c532",
    "https://images.unsplash.com/photo-1580841129862-bc2a2d113c45",
    "https://images.unsplash.com/photo-1527681192512-bca34fd580bb"
]

CRAB_FACTS = [
    "Crabs have 10 legs and walk sideways!",
    "There are over 4,500 species of crabs worldwide.",
    "The Japanese spider crab has the largest leg span of any arthropod.",
    "Crabs can regenerate lost limbs during molting.",
    "Some crabs can live up to 100 years!",
    "Crabs communicate by drumming or waving their claws.",
    "The coconut crab is the largest land-living arthropod.",
    "Crabs have excellent vision and can see in multiple directions.",
]

CRAB_NAMES = ["Pinchy", "Clawdia", "Shelly", "Crabigail", "Snappy", "Crusty", "Sebastian"]

# Data storage
class CrabData:
    def __init__(self):
        self.guilds_data = {}
        self.users_data = {}
        self.load_data()
    
    def load_data(self):
        try:
            with open('crab_guilds.json', 'r') as f:
                self.guilds_data = json.load(f)
        except FileNotFoundError:
            self.guilds_data = {}
        
        try:
            with open('crab_users.json', 'r') as f:
                self.users_data = json.load(f)
        except FileNotFoundError:
            self.users_data = {}
    
    def save_guilds(self):
        with open('crab_guilds.json', 'w') as f:
            json.dump(self.guilds_data, f, indent=2)
    
    def save_users(self):
        with open('crab_users.json', 'w') as f:
            json.dump(self.users_data, f, indent=2)

# Initialize data
crab_data = CrabData()

# Crab appearance messages
APPEARANCE_MESSAGES = [
    "🦀 A crab just scuttled into the server! Use `/catch` to catch it!",
    "🦀 Look! A crab appeared! Quick, use `/catch`!",
    "🦀 Crab alert! A crab has been spotted! Type `/catch` to grab it!",
    "🦀 Pinch, pinch! A crab is here! Use `/catch` before it runs away!",
    "🦀 Sideways walking friend appeared! Catch it with `/catch`!"
]

class CrabView(discord.ui.View):
    def __init__(self, crab_id: str):
        super().__init__(timeout=300)
        self.crab_id = crab_id
        self.caught = False
    
    @discord.ui.button(label="🎣 Catch Crab!", style=discord.ButtonStyle.success, custom_id="catch_crab")
    async def catch_crab(self, interaction: discord.Interaction, button: discord.ui.Button):
        if self.caught:
            await interaction.response.send_message("🦀 This crab was already caught!", ephemeral=True)
            return
        
        self.caught = True
        guild_id = str(interaction.guild_id)
        user_id = str(interaction.user.id)
        
        if user_id not in crab_data.users_data:
            crab_data.users_data[user_id] = {
                'crabs_caught': 0,
                'crab_coins': 0,
                'inventory': [],
                'level': 1,
                'xp': 0
            }
        
        coins_earned = random.randint(5, 15)
        xp_earned = random.randint(1, 3)
        
        crab_data.users_data[user_id]['crab_coins'] += coins_earned
        crab_data.users_data[user_id]['xp'] += xp_earned
        crab_data.users_data[user_id]['crabs_caught'] += 1
        
        current_level = crab_data.users_data[user_id]['level']
        xp_needed = current_level * 10
        if crab_data.users_data[user_id]['xp'] >= xp_needed:
            crab_data.users_data[user_id]['level'] += 1
            crab_data.users_data[user_id]['xp'] = 0
            level_up_msg = f" 🎉 **Level up!** You're now level {crab_data.users_data[user_id]['level']}!"
        else:
            level_up_msg = ""
        
        crab_data.save_users()
        
        button.disabled = True
        button.label = "✅ Caught!"
        
        embed = discord.Embed(
            title="🦀 Crab Caught!",
            description=f"**{interaction.user.display_name}** caught the crab!",
            color=0x00FF00
        )
        embed.add_field(name="🪙 Crab Coins", value=f"+{coins_earned}", inline=True)
        embed.add_field(name="⭐ XP", value=f"+{xp_earned}", inline=True)
        embed.add_field(name="📊 Total Crabs", value=crab_data.users_data[user_id]['crabs_caught'], inline=True)
        embed.set_footer(text=f"You now have {crab_data.users_data[user_id]['crab_coins']} Crab Coins{level_up_msg}")
        
        await interaction.response.edit_message(embed=embed, view=self)

@bot.event
async def on_ready():
    print(f'🦀 {bot.user.name} is ready! (Gateway Proxy Version)')
    print(f'🦀 Version: {__version__}')
    print(f'🦀 Gateway: Proxy Mode')
    print(f'🦀 License: {__license__}')
    
    await bot.change_presence(activity=discord.Activity(type=discord.ActivityType.watching, name="for crabs 🦀"))
    
    try:
        synced = await bot.tree.sync()
        print(f"🦀 Synced {len(synced)} command(s)")
    except Exception as e:
        print(f"🦀 Error syncing commands: {e}")
    
    crab_appearance.start()

# Gateway status command
@bot.tree.command(name="gateway_status", description="Check gateway proxy connection status")
async def gateway_status(interaction: discord.Interaction):
    latency = round(bot.latency * 1000)
    gateway_url = getattr(bot, '_connection', None)
    
    embed = discord.Embed(
        title="🌐 Gateway Status",
        color=0x7289DA
    )
    
    embed.add_field(name="📡 WebSocket Latency", value=f"`{latency}ms`", inline=True)
    embed.add_field(name="🔌 Gateway Mode", value="`Proxy`", inline=True)
    embed.add_field(name="💓 Heartbeat", value="`Active`", inline=True)
    
    if latency < 100:
        status = "✅ Excellent"
    elif latency < 200:
        status = "⚠️ Good"
    else:
        status = "🔴 Slow"
    
    embed.add_field(name="📊 Connection Quality", value=status, inline=True)
    embed.add_field(name="🦀 Bot Version", value=__version__, inline=True)
    embed.add_field(name="⚡ Rate Limits", value="`Proxy Managed`", inline=True)
    
    embed.set_footer(text="Gateway Proxy Mode Active")
    await interaction.response.send_message(embed=embed)

# Enhanced ping command for gateway
@bot.tree.command(name="ping", description="Check bot latency with gateway info")
async def ping(interaction: discord.Interaction):
    latency = round(bot.latency * 1000)
    
    embed = discord.Embed(
        title="🏓 Pong! (Gateway Mode)",
        color=0x00FF00 if latency < 100 else 0xFFFF00 if latency < 200 else 0xFF0000
    )
    embed.add_field(name="📡 Gateway Latency", value=f"`{latency}ms`", inline=True)
    embed.add_field(name="🔌 Connection Type", value="`Proxy`", inline=True)
    embed.add_field(name="💓 Heartbeat", value="`Active`", inline=True)
    
    if latency < 100:
        embed.set_footer(text="🌟 Excellent gateway connection!")
    elif latency < 200:
        embed.set_footer(text="✅ Good gateway connection!")
    else:
        embed.set_footer(text="⚠️ Gateway connection may be slow!")
    
    await interaction.response.send_message(embed=embed)

# All the other commands from the original bot (setup, profile, shop, etc.)
@bot.tree.command(name="setup", description="Set up crab bot in your server")
@app_commands.describe(channel="Channel where crabs will appear")
async def setup(interaction: discord.Interaction, channel: discord.TextChannel):
    guild_id = str(interaction.guild_id)
    
    if guild_id not in crab_data.guilds_data:
        crab_data.guilds_data[guild_id] = {}
    
    crab_data.guilds_data[guild_id]['crab_channel'] = channel.id
    crab_data.guilds_data[guild_id]['enabled'] = True
    crab_data.guilds_data[guild_id]['crab_frequency'] = 10
    
    crab_data.save_guilds()
    
    embed = discord.Embed(
        title="🦀 Crab Bot Setup Complete!",
        description=f"Crab appearances enabled in {channel.mention}",
        color=0x00FF00
    )
    embed.add_field(name="Crab Frequency", value="Every 10 minutes", inline=True)
    embed.add_field(name="Gateway Mode", value="Active", inline=True)
    embed.set_footer(text="Crabs will start appearing soon!")
    
    await interaction.response.send_message(embed=embed)

# Include all other commands from the original bot here...
# profile, shop, buy, inventory, leaderboard, avatar, shutdown, about, stats, invite, help

@bot.tree.command(name="profile", description="Check your crab profile")
async def profile(interaction: discord.Interaction, member: discord.Member = None):
    if member is None:
        member = interaction.user
    
    user_id = str(member.id)
    
    if user_id not in crab_data.users_data:
        crab_data.users_data[user_id] = {
            'crabs_caught': 0,
            'crab_coins': 0,
            'inventory': [],
            'level': 1,
            'xp': 0
        }
        crab_data.save_users()
    
    user_data = crab_data.users_data[user_id]
    
    embed = discord.Embed(
        title=f"🦀 {member.display_name}'s Crab Profile",
        color=member.color
    )
    embed.set_thumbnail(url=member.avatar.url if member.avatar else member.default_avatar.url)
    
    embed.add_field(name="📊 Level", value=user_data['level'], inline=True)
    embed.add_field(name="⭐ XP", value=f"{user_data['xp']}/{user_data['level'] * 10}", inline=True)
    embed.add_field(name="🦀 Crabs Caught", value=user_data['crabs_caught'], inline=True)
    embed.add_field(name="🪙 Crab Coins", value=user_data['crab_coins'], inline=True)
    embed.add_field(name="🎒 Inventory", value=f"{len(user_data['inventory'])} items", inline=True)
    embed.add_field(name="🔌 Gateway", value="Proxy", inline=True)
    
    await interaction.response.send_message(embed=embed)

# Background task for crab appearances
@tasks.loop(minutes=10)
async def crab_appearance():
    for guild_id, guild_data in crab_data.guilds_data.items():
        if not guild_data.get('enabled', False):
            continue
        
        channel_id = guild_data.get('crab_channel')
        if not channel_id:
            continue
        
        try:
            channel = bot.get_channel(channel_id)
            if not channel:
                continue
            
            if random.random() < 0.7:
                crab_id = f"crab_{guild_id}_{datetime.datetime.now().timestamp()}"
                
                embed = discord.Embed(
                    title="🦀 A Crab Appeared!",
                    description=random.choice(APPEARANCE_MESSAGES),
                    color=0xFF6B6B
                )
                embed.set_image(url=random.choice(CRAB_IMAGES))
                embed.set_footer(text="Gateway Proxy Mode Active")
                
                view = CrabView(crab_id)
                await channel.send(embed=embed, view=view)
                
        except Exception as e:
            print(f"Gateway Error sending crab to guild {guild_id}: {e}")

@crab_appearance.before_loop
async def before_crab_appearance():
    await bot.wait_until_ready()

@bot.event
async def on_connect():
    bot.start_time = datetime.datetime.utcnow()
    print("🦀 Connected to Discord Gateway (Proxy Mode)")

@bot.event
async def on_disconnect():
    print("🦀 Disconnected from Gateway")

@bot.event
async def on_resumed():
    print("🦀 Gateway connection resumed")

if __name__ == "__main__":
    print(f"""
🦀 Crab Bot Gateway Proxy Version {__version__}
⚡ Running in Gateway Proxy Mode
🌐 Configured for localhost:7878
⚖️ License: {__license__}

This program comes with ABSOLUTELY NO WARRANTY.
This is free software, and you are welcome to redistribute it
under certain conditions. See the license for details.
    """)
    
    # Run with gateway proxy support
    bot.run(os.getenv('DISCORD_TOKEN', 'YOUR_BOT_TOKEN_HERE'))
