// 三元宇宙 Discord 机器人
const { Client, GatewayIntentBits, Events, SlashCommandBuilder, REST, Routes } = require('discord.js');
const config = require('./config.js');

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
        .setDescription('显示服务器信息')
];

// 当机器人准备就绪时触发
client.once(Events.ClientReady, async (readyClient) => {
    console.log(`✅ 机器人已上线！登录为 ${readyClient.user.tag}`);
    
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

// 登录机器人
client.login(config.token).catch((error) => {
    console.error('❌ 机器人登录失败:', error);
    process.exit(1);
}); 