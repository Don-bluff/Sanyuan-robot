// 三元宇宙 Discord 机器人
const { Client, GatewayIntentBits, Events, SlashCommandBuilder, REST, Routes } = require('discord.js');

// 配置读取 - 优先使用环境变量，然后使用本地配置文件
let config;
try {
    // 尝试从环境变量读取
    if (process.env.DISCORD_TOKEN) {
        config = {
            token: process.env.DISCORD_TOKEN,
            clientId: process.env.CLIENT_ID,
            guildId: process.env.GUILD_ID
        };
        console.log('✅ 使用环境变量配置');
    } else {
        // 如果没有环境变量，则尝试使用本地配置文件
        try {
            config = require('./config.js');
            console.log('✅ 使用本地配置文件');
        } catch (configError) {
            console.error('❌ 未找到配置文件，且未设置环境变量！');
            console.error('请设置以下环境变量：');
            console.error('- DISCORD_TOKEN: Discord 机器人 TOKEN');
            console.error('- CLIENT_ID: Discord 应用客户端 ID');
            console.error('- GUILD_ID: Discord 服务器 ID（可选）');
            process.exit(1);
        }
    }
} catch (error) {
    console.error('❌ 配置加载失败:', error.message);
    process.exit(1);
}

// 验证配置
if (!config.token) {
    console.error('❌ 错误：未找到 DISCORD_TOKEN！');
    console.error('请设置环境变量或检查 config.js 文件');
    process.exit(1);
}

if (!config.clientId) {
    console.error('❌ 错误：未找到 CLIENT_ID！');
    console.error('请设置环境变量或检查 config.js 文件');
    process.exit(1);
}

console.log(`🤖 机器人 ID: ${config.clientId}`);
if (config.guildId) {
    console.log(`🏠 服务器 ID: ${config.guildId}`);
}

// 创建客户端实例
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// 定义斜杠命令
const commands = [
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('检查机器人是否在线'),
    
    new SlashCommandBuilder()
        .setName('hello')
        .setDescription('向机器人问好'),
    
    new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('显示服务器信息'),
    
    new SlashCommandBuilder()
        .setName('status')
        .setDescription('显示机器人运行状态')
];

// 当机器人准备就绪时触发
client.once(Events.ClientReady, async (readyClient) => {
    console.log(`✅ 机器人已上线！登录为 ${readyClient.user.tag}`);
    console.log(`🌐 运行环境: ${process.env.NODE_ENV || 'development'}`);
    
    // 设置机器人状态
    client.user.setActivity('三元宇宙', { type: 'WATCHING' });
    
    // 注册斜杠命令
    try {
        console.log('🔄 开始注册斜杠命令...');
        
        const rest = new REST().setToken(config.token);
        
        // 如果设置了 guildId，则只在该服务器注册命令（开发时推荐）
        if (config.guildId) {
            await rest.put(
                Routes.applicationGuildCommands(config.clientId, config.guildId),
                { body: commands }
            );
            console.log('✅ 服务器斜杠命令注册成功！');
        } else {
            // 全局注册命令（可能需要1小时才能生效）
            await rest.put(
                Routes.applicationCommands(config.clientId),
                { body: commands }
            );
            console.log('✅ 全局斜杠命令注册成功！');
        }
    } catch (error) {
        console.error('❌ 注册斜杠命令时出错:', error);
    }
});

// 处理斜杠命令交互
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    try {
        if (commandName === 'ping') {
            const ping = Date.now() - interaction.createdTimestamp;
            await interaction.reply(`🏓 Pong! 延迟: ${Math.abs(ping)}ms`);
            
        } else if (commandName === 'hello') {
            await interaction.reply(`👋 你好，${interaction.user.displayName}！欢迎来到三元宇宙！`);
            
        } else if (commandName === 'status') {
            const uptime = process.uptime();
            const hours = Math.floor(uptime / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = Math.floor(uptime % 60);
            
            const embed = {
                color: 0x00ff00,
                title: '🤖 机器人状态',
                fields: [
                    {
                        name: '运行时间',
                        value: `${hours}小时 ${minutes}分钟 ${seconds}秒`,
                        inline: true
                    },
                    {
                        name: '内存使用',
                        value: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
                        inline: true
                    },
                    {
                        name: 'Node.js 版本',
                        value: process.version,
                        inline: true
                    },
                    {
                        name: '运行环境',
                        value: process.env.NODE_ENV || 'development',
                        inline: true
                    }
                ],
                timestamp: new Date().toISOString()
            };
            
            await interaction.reply({ embeds: [embed] });
            
        } else if (commandName === 'serverinfo') {
            const guild = interaction.guild;
            const embed = {
                color: 0x0099FF,
                title: '📊 服务器信息',
                fields: [
                    {
                        name: '服务器名称',
                        value: guild.name,
                        inline: true
                    },
                    {
                        name: '成员数量',
                        value: guild.memberCount.toString(),
                        inline: true
                    },
                    {
                        name: '创建时间',
                        value: guild.createdAt.toLocaleDateString('zh-CN'),
                        inline: true
                    }
                ],
                thumbnail: {
                    url: guild.iconURL() || 'https://via.placeholder.com/128'
                },
                timestamp: new Date().toISOString()
            };
            
            await interaction.reply({ embeds: [embed] });
        }
    } catch (error) {
        console.error('❌ 处理命令时出错:', error);
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: '❌ 执行命令时发生错误！', ephemeral: true });
        } else {
            await interaction.reply({ content: '❌ 执行命令时发生错误！', ephemeral: true });
        }
    }
});

// 处理普通消息（可选）
client.on(Events.MessageCreate, (message) => {
    // 忽略机器人自己的消息
    if (message.author.bot) return;
    
    // 简单的关键词回复
    if (message.content.toLowerCase().includes('三元宇宙')) {
        message.react('🌌');
    }
    
    if (message.content.toLowerCase().includes('你好') || message.content.toLowerCase().includes('hello')) {
        message.reply('👋 你好！我是三元宇宙的机器人助手！');
    }
});

// 错误处理
client.on(Events.Error, (error) => {
    console.error('❌ Discord 客户端错误:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('❌ 未处理的 Promise 拒绝:', error);
});

process.on('SIGINT', () => {
    console.log('🛑 收到终止信号，正在关闭机器人...');
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('🛑 收到终止信号，正在关闭机器人...');
    client.destroy();
    process.exit(0);
});

// 登录机器人
client.login(config.token).catch((error) => {
    console.error('❌ 机器人登录失败:', error);
    process.exit(1);
}); 