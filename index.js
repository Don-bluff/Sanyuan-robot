// 三元宇宙 Discord 机器人
const { Client, GatewayIntentBits, Events, SlashCommandBuilder, REST, Routes, MessageFlags, ActivityType } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');

// 配置读取 - 优先使用环境变量，然后使用本地配置文件
let config;
try {
    // 尝试从环境变量读取
    if (process.env.DISCORD_TOKEN) {
        config = {
            token: process.env.DISCORD_TOKEN,
            clientId: process.env.CLIENT_ID,
            guildId: process.env.GUILD_ID,
            // Supabase 配置
            supabaseUrl: process.env.SUPABASE_URL,
            supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
            // 欢迎频道配置
            welcomeChannelId: process.env.WELCOME_CHANNEL_ID,
            // 角色配置 - 权限角色
            roles: {
                trinity_citizen: process.env.TRINITY_CITIZEN_ROLE_ID,    // Trinity Citizen角色
                xitong: process.env.XITONG_ROLE_ID    // Xitong系统权限角色
            }
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
            console.error('- SUPABASE_URL: Supabase 项目 URL');
            console.error('- SUPABASE_ANON_KEY: Supabase 匿名密钥');
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

// 初始化 Supabase 客户端
let supabase;
if (config.supabaseUrl && config.supabaseAnonKey) {
    supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
    console.log('✅ Supabase 客户端初始化成功');
} else {
    console.warn('⚠️  Supabase 配置缺失，邮箱验证功能将不可用');
}

console.log(`🤖 机器人 ID: ${config.clientId}`);
if (config.guildId) {
    console.log(`🏠 服务器 ID: ${config.guildId}`);
}

// 检测运行环境
const isLocal = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
if (isLocal) {
    console.log('🏠 本地开发环境检测到');
    console.log('⚡ 使用立即响应策略以避免交互超时');
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
        .setDescription('Check if the bot is online'),
    
    new SlashCommandBuilder()
        .setName('hello')
        .setDescription('Say hello to the bot'),
    
    new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Display server information'),
    
    new SlashCommandBuilder()
        .setName('status')
        .setDescription('Show bot status and runtime information'),
    
    new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Verify your email to get access permissions')
        .addStringOption(option =>
            option.setName('email')
                .setDescription('Your email address')
                .setRequired(true)
        ),
    
    new SlashCommandBuilder()
        .setName('clean')
        .setDescription('Manually clean welcome channel messages (Admin only)'),
    
    new SlashCommandBuilder()
        .setName('redeem')
        .setDescription('Redeem your freelancer notion template with your email')
        .addStringOption(option =>
            option.setName('email')
                .setDescription('Your email address')
                .setRequired(true)
        ),
    
    // 服务器 Owner 专用命令
    new SlashCommandBuilder()
        .setName('broadcast')
        .setDescription('Send a broadcast announcement with @everyone (Owner only)')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Announcement message')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('url')
                .setDescription('Optional URL link')
                .setRequired(false)
        ),
    
    new SlashCommandBuilder()
        .setName('social')
        .setDescription('Post new social media content notification with @everyone (Owner only)')
        .addStringOption(option =>
            option.setName('platform')
                .setDescription('Social media platform')
                .setRequired(true)
                .addChoices(
                    { name: 'TikTok', value: 'tiktok' },
                    { name: 'YouTube', value: 'youtube' },
                    { name: 'Twitter/X', value: 'twitter' },
                    { name: 'Mystic Scroll', value: 'mystic' }
                )
        )
        .addStringOption(option =>
            option.setName('content')
                .setDescription('Brief description of the content')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('link')
                .setDescription('Link to the content')
                .setRequired(true)
        ),
    
    new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Generate Trinity Citizen Access codes and send giveaway notification (Owner only)')
        .addIntegerOption(option =>
            option.setName('quantity')
                .setDescription('Number of Trinity Citizen Access codes to generate (1-50)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(50)
        )
];

// 当机器人准备就绪时触发
client.once(Events.ClientReady, async (readyClient) => {
    console.log(`✅ 机器人已上线！登录为 ${readyClient.user.tag}`);
    console.log(`🌐 运行环境: ${process.env.NODE_ENV || 'development'}`);
    
    // 设置机器人状态
    client.user.setActivity('Trinity Universe', { type: ActivityType.Watching });
    
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

// 新成员加入欢迎功能
client.on(Events.GuildMemberAdd, async (member) => {
    console.log(`👋 新成员加入: ${member.user.tag}`);
    
    // 查找欢迎频道
    let welcomeChannel;
    if (config.welcomeChannelId) {
        welcomeChannel = member.guild.channels.cache.get(config.welcomeChannelId);
    } else {
        // 如果没有指定频道，寻找包含 "欢迎" 或 "welcome" 的频道
        welcomeChannel = member.guild.channels.cache.find(channel => 
            channel.name.includes('欢迎') || 
            channel.name.includes('welcome') ||
            channel.name.includes('general')
        );
    }
    
    if (welcomeChannel) {
        // 创建欢迎消息嵌入
        const welcomeEmbed = {
            color: 0x00ff88,
            description: `👋 **Welcome to the Trinity Universe Discord Community**

Hi ${member} — we're excited to have you here!
This is a community for builders of freedom — people mastering personal growth and wealth creation through systems, strategy, and self-awareness.

🎯 **Our Focus**

💰 **Wealth Building & Financial Freedom**

Discover proven frameworks for earning, investing, and compounding wealth — designed for long-term independence.

🚀 **Personal Growth & Performance**

Upgrade your mindset, habits, and systems to unlock consistent growth and real-world results.

🎲 **Strategic Decision Making**

Learn how to think in probabilities, manage risk, and make profitable moves — from business to life.

🔐 **Access & Membership**

To join the main discussions, you'll need **Trinity Citizen** status.

🎫 **Don't have access yet?**
Visit **donbluff.com** to get your invitation and unlock the full experience.

Then check 🎭role-assignment for step-by-step instructions on activating your access.

📋 **Community Guidelines**

• Stay focused on growth, wealth, and strategy
• Share insights, not noise
• No spam or promotions
• Be respectful, direct, and constructive
• Help others level up — we rise together 📈

✨ **Welcome to the Trinity Universe.**
Here, we don't escape the system — we build our own. 🚀


`,
            thumbnail: {
                url: member.user.displayAvatarURL()
            },
            timestamp: new Date().toISOString(),
            footer: {
                text: 'Start your Trinity Universe journey!'
            }
        };
        
        try {
            await welcomeChannel.send({ embeds: [welcomeEmbed] });
            console.log(`✅ 欢迎消息已发送给 ${member.user.tag}`);
        } catch (error) {
            console.error('❌ 发送欢迎消息失败:', error);
        }
    } else {
        console.log('⚠️  未找到欢迎频道');
    }
});

// 欢迎频道清理函数
async function cleanWelcomeChannel() {
    try {
        console.log('🧹 开始清理欢迎频道...');
        
        // 遍历机器人所在的所有服务器
        for (const [guildId, guild] of client.guilds.cache) {
            try {
                console.log(`📊 正在检查服务器: ${guild.name} (ID: ${guildId})`);
                
                // 查找欢迎频道
                let welcomeChannel;
                if (config.welcomeChannelId) {
                    welcomeChannel = guild.channels.cache.get(config.welcomeChannelId);
                    console.log(`🎯 使用配置的欢迎频道ID: ${config.welcomeChannelId}`);
                } else {
                    // 如果没有指定频道，寻找包含 "欢迎" 或 "welcome" 的频道
                    welcomeChannel = guild.channels.cache.find(channel => 
                        channel.name.includes('欢迎') || 
                        channel.name.includes('welcome') ||
                        channel.name.includes('general')
                    );
                    if (welcomeChannel) {
                        console.log(`🔍 自动找到欢迎频道: ${welcomeChannel.name} (ID: ${welcomeChannel.id})`);
                    }
                }
                
                if (!welcomeChannel) {
                    console.log(`⚠️  服务器 ${guild.name} 未找到欢迎频道`);
                    continue;
                }
                
                if (!welcomeChannel.isTextBased()) {
                    console.log(`⚠️  频道 ${welcomeChannel.name} 不是文本频道`);
                    continue;
                }
                
                // 检查机器人权限
                const botMember = await guild.members.fetch(client.user.id);
                const permissions = welcomeChannel.permissionsFor(botMember);
                
                if (!permissions.has('ViewChannel')) {
                    console.log(`❌ 机器人没有查看频道权限: ${welcomeChannel.name}`);
                    continue;
                }
                
                if (!permissions.has('ReadMessageHistory')) {
                    console.log(`❌ 机器人没有读取消息历史权限: ${welcomeChannel.name}`);
                    continue;
                }
                
                if (!permissions.has('ManageMessages')) {
                    console.log(`❌ 机器人没有管理消息权限: ${welcomeChannel.name}`);
                    continue;
                }
                
                console.log(`✅ 权限检查通过: ${welcomeChannel.name}`);
                
                // 获取24小时前的时间戳
                const yesterday = new Date();
                yesterday.setHours(yesterday.getHours() - 24);
                console.log(`⏰ 删除时间基准: ${yesterday.toLocaleString('zh-CN')}`);
                
                // 获取频道消息
                const messages = await welcomeChannel.messages.fetch({ limit: 100 });
                console.log(`📨 获取到 ${messages.size} 条消息`);
                
                // 过滤出24小时前的消息
                const oldMessages = messages.filter(message => 
                    message.createdTimestamp < yesterday.getTime()
                );
                
                console.log(`🗑️  找到 ${oldMessages.size} 条超过24小时的消息`);
                
                if (oldMessages.size > 0) {
                    // 分离14天内和14天外的消息（Discord API限制）
                    const twoWeeksAgo = new Date();
                    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
                    
                    const recentOldMessages = oldMessages.filter(message => 
                        message.createdTimestamp > twoWeeksAgo.getTime()
                    );
                    
                    const veryOldMessages = oldMessages.filter(message => 
                        message.createdTimestamp <= twoWeeksAgo.getTime()
                    );
                    
                    console.log(`📋 14天内的旧消息: ${recentOldMessages.size} 条`);
                    console.log(`📋 超过14天的旧消息: ${veryOldMessages.size} 条`);
                    
                    let totalDeleted = 0;
                    
                    // 批量删除14天内的消息
                    if (recentOldMessages.size > 0) {
                        try {
                            await welcomeChannel.bulkDelete(recentOldMessages, true);
                            totalDeleted += recentOldMessages.size;
                            console.log(`✅ 批量删除了 ${recentOldMessages.size} 条消息`);
                        } catch (bulkError) {
                            console.log(`⚠️  批量删除失败，改为逐条删除: ${bulkError.message}`);
                            for (const [messageId, message] of recentOldMessages) {
                                try {
                                    await message.delete();
                                    totalDeleted++;
                                } catch (deleteError) {
                                    console.error(`❌ 删除消息失败: ${deleteError.message}`);
                                }
                            }
                            console.log(`✅ 逐条删除了 ${totalDeleted} 条消息`);
                        }
                    }
                    
                    // 逐条删除超过14天的消息
                    if (veryOldMessages.size > 0) {
                        console.log(`🔄 开始逐条删除超过14天的消息...`);
                        for (const [messageId, message] of veryOldMessages) {
                            try {
                                await message.delete();
                                totalDeleted++;
                                // 添加延迟避免速率限制
                                await new Promise(resolve => setTimeout(resolve, 1000));
                            } catch (deleteError) {
                                console.error(`❌ 删除旧消息失败: ${deleteError.message}`);
                            }
                        }
                    }
                    
                    console.log(`✅ 服务器 ${guild.name} 欢迎频道清理完成，共删除 ${totalDeleted} 条消息`);
                } else {
                    console.log(`📝 服务器 ${guild.name} 欢迎频道无需清理`);
                }
            } catch (guildError) {
                console.error(`❌ 清理服务器 ${guild.name} 欢迎频道时出错:`, guildError);
            }
        }
        
        console.log('✅ 欢迎频道清理完成');
        
    } catch (error) {
        console.error('❌ 欢迎频道清理过程出错:', error);
    }
}

// 启动欢迎频道清理定时器
function startWelcomeChannelCleaner() {
    console.log('🧹 正在启动欢迎频道清理器...');
    
    // 立即执行一次清理
    console.log('⏰ 将在60秒后执行首次清理');
    setTimeout(async () => {
        console.log('🚀 执行首次自动清理...');
        await cleanWelcomeChannel();
    }, 60000); // 启动后1分钟执行第一次清理
    
    // 每24小时清理一次 (86400000 毫秒 = 24小时)
    const intervalId = setInterval(async () => {
        console.log('🔄 执行定时清理...');
        await cleanWelcomeChannel();
    }, 86400000);
    
    console.log('✅ 欢迎频道清理器已启动');
    console.log('📅 清理频率: 每24小时');
    console.log('⏰ 下次清理时间:', new Date(Date.now() + 86400000).toLocaleString('zh-CN'));
    
    // 返回interval ID，以便需要时可以清除
    return intervalId;
}

// 处理斜杠命令交互
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    try {
        if (commandName === 'ping') {
            const ping = Date.now() - interaction.createdTimestamp;
            await interaction.reply(`🏓 Pong! Latency: ${Math.abs(ping)}ms`);
            
        } else if (commandName === 'hello') {
            await interaction.reply(`👋 Hello, ${interaction.user.displayName}! Welcome to Trinity Universe!`);
            
        } else if (commandName === 'status') {
            const uptime = process.uptime();
            const hours = Math.floor(uptime / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = Math.floor(uptime % 60);
            
            const embed = {
                color: 0x00ff00,
                title: '🤖 Bot Status',
                fields: [
                    {
                        name: 'Uptime',
                        value: `${hours}h ${minutes}m ${seconds}s`,
                        inline: true
                    },
                    {
                        name: 'Memory Usage',
                        value: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
                        inline: true
                    },
                    {
                        name: 'Node.js Version',
                        value: process.version,
                        inline: true
                    },
                    {
                        name: 'Environment',
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
                title: '📊 Server Information',
                fields: [
                    {
                        name: 'Server Name',
                        value: guild.name,
                        inline: true
                    },
                    {
                        name: 'Member Count',
                        value: guild.memberCount.toString(),
                        inline: true
                    },
                    {
                        name: 'Created Date',
                        value: guild.createdAt.toLocaleDateString('en-US'),
                        inline: true
                    }
                ],
                thumbnail: {
                    url: guild.iconURL() || 'https://via.placeholder.com/128'
                },
                timestamp: new Date().toISOString()
            };
            
            await interaction.reply({ embeds: [embed] });
            
        } else if (commandName === 'verify') {
            await handleVerifyCommand(interaction);
        } else if (commandName === 'clean') {
            await handleCleanCommand(interaction);
        } else if (commandName === 'redeem') {
            await handleRedeemCommand(interaction);
        } else if (commandName === 'broadcast') {
            await handleBroadcastCommand(interaction);
        } else if (commandName === 'social') {
            await handleSocialCommand(interaction);
        } else if (commandName === 'giveaway') {
            await handleGiveawayCommand(interaction);
        }
    } catch (error) {
        console.error('❌ 处理命令时出错:', error);
        
        // 检查是否是Discord API错误，避免重复响应
        if (error.code === 10062 || error.code === 40060) {
            console.log('⚠️  Discord交互错误，跳过响应');
            return;
        }
        
        try {
        if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: '❌ An error occurred while executing the command!', flags: MessageFlags.Ephemeral });
        } else {
                await interaction.reply({ content: '❌ An error occurred while executing the command!', flags: MessageFlags.Ephemeral });
            }
        } catch (responseError) {
            console.error('❌ 无法发送全局错误响应:', responseError.message);
        }
    }
});

// 处理手动清理命令
async function handleCleanCommand(interaction) {
    try {
        // 检查用户是否有管理员权限
        if (!interaction.member.permissions.has('Administrator')) {
            await interaction.reply({
                content: '❌ You do not have permission to execute this command! This command is for administrators only.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }
        
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        console.log(`🧹 管理员 ${interaction.user.tag} 手动触发清理功能`);
        
        // 执行清理
        await cleanWelcomeChannel();
        
        await interaction.editReply({
            content: '✅ Welcome channel cleanup completed! Check console logs for detailed information.'
        });
        
    } catch (error) {
        console.error('❌ 处理清理命令时出错:', error);
        
        if (interaction.deferred) {
            await interaction.editReply({
                content: '❌ An error occurred during cleanup. Check console logs for details.'
            });
        } else {
            await interaction.reply({
                content: '❌ An error occurred during cleanup!',
                flags: MessageFlags.Ephemeral
            });
        }
    }
}

// 处理折扣码兑换命令
async function handleRedeemCommand(interaction) {
    const email = interaction.options.getString('email').toLowerCase().trim();
    const targetChannelId = '1429138384684843238';
    
    try {
        // 检查是否在指定频道
        if (interaction.channelId !== targetChannelId) {
            await interaction.reply({
                content: '❌ This command can only be used in the designated redemption channel.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }
        
        // 验证邮箱格式
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            await interaction.reply({
                content: '❌ Invalid email format. Please provide a valid email address!',
                flags: MessageFlags.Ephemeral
            });
            return;
        }
        
        // 立即回复确认，然后处理
            await interaction.reply({
            content: '🔄 Processing your template redemption request...',
            flags: MessageFlags.Ephemeral
        });
        
        if (!supabase) {
            await interaction.editReply({
                content: '❌ Database connection is not available. Please contact an administrator!'
            });
            return;
        }
        
        console.log(`🎫 用户 ${interaction.user.tag} 尝试使用邮箱 ${email} 兑换 Freelancer Notion Template`);
        
        // 检查折扣码状态
        const { data: discountCode, error: discountError } = await supabase
            .from('discount_codes')
            .select('is_active')
            .eq('code', 'DON BLUFF')
            .single();
        
        if (discountError) {
            console.error('❌ 查询折扣码状态时出错:', discountError);
            console.error('❌ 错误详情:', JSON.stringify(discountError, null, 2));
            
            // 如果数据库查询失败，默认显示直播限制消息
            console.log('⚠️  数据库查询失败，使用默认行为（显示直播限制）');
            
            const fallbackEmbed = {
                color: 0xff9900,
                title: '⏰ Template Currently Unavailable',
                description: 'The freelancer notion template is only available during live streams.',
                fields: [
                    {
                        name: '📺 Live Stream Access',
                        value: 'This template is exclusively available during our live streaming sessions.',
                        inline: false
                    },
                    {
                        name: '🔔 Get Notified',
                        value: 'Visit **donbluff.com** → Contact Us → Follow our TikTok to get the first-hand notification of streaming times.',
                        inline: false
                    },
                    {
                        name: '🌐 Visit Website',
                        value: '[donbluff.com](https://donbluff.com)',
                        inline: true
                    },
                    {
                        name: '📱 Follow TikTok',
                        value: 'Follow us for live stream updates',
                        inline: true
                    },
                    {
                        name: '⚠️ Technical Note',
                        value: 'Database connectivity issue - please contact admin if this persists',
                        inline: false
                    }
                ],
                timestamp: new Date().toISOString(),
                footer: {
                    text: 'Trinity Universe - Live Stream Access'
                }
            };
            
            await interaction.editReply({ embeds: [fallbackEmbed] });
            return;
        }
        
        // 根据折扣码状态返回不同消息
        if (!discountCode || !discountCode.is_active) {
            // 折扣码未激活 - 显示直播提示
            const inactiveEmbed = {
                color: 0xff9900,
                title: '⏰ Template Currently Unavailable',
                description: 'The freelancer notion template is only available during live streams.',
                fields: [
                    {
                        name: '📺 Live Stream Access',
                        value: 'This template is exclusively available during our live streaming sessions.',
                        inline: false
                    },
                    {
                        name: '🔔 Get Notified',
                        value: 'Visit **donbluff.com** → Contact Us → Follow our TikTok to get the first-hand notification of streaming times.',
                        inline: false
                    },
                    {
                        name: '🌐 Visit Website',
                        value: '[donbluff.com](https://donbluff.com)',
                        inline: true
                    },
                    {
                        name: '📱 Follow TikTok',
                        value: 'Follow us for live stream updates',
                        inline: true
                    }
                ],
                timestamp: new Date().toISOString(),
                footer: {
                    text: 'Trinity Universe - Live Stream Access'
                }
            };
            
            await interaction.editReply({ embeds: [inactiveEmbed] });
            console.log(`⚠️  用户 ${interaction.user.tag} 尝试兑换但折扣码未激活`);
            return;
        }
        
        // 折扣码已激活 - 授予权限并显示成功
        const { data: grantResult, error: grantError } = await supabase
            .rpc('grant_permission_by_email', {
                p_email: email,
                p_perm_slug: 'xitong',
                p_expires_at: null
            });
        
        if (grantError) {
            console.error('❌ 授予权限时出错:', grantError);
            await interaction.editReply({
                content: '❌ Error granting permissions. Please check your email address or contact an administrator!'
            });
            return;
        }
        
        // 成功授予权限
        const successEmbed = {
            color: 0x00ff00,
            title: '✅ Template Redemption Successful!',
            description: `Your email **${email}** has been recorded for freelancer notion template redemption.`,
            fields: [
                {
                    name: '📚 Next Steps',
                    value: 'Please visit **donbluff.com** to view detailed usage instructions and complete your setup.',
                    inline: false
                },
                {
                    name: '🌐 Visit Website',
                    value: '[donbluff.com](https://donbluff.com)',
                    inline: true
                },
                {
                    name: '⏰ Processing Time',
                    value: 'Please allow some time for processing',
                    inline: true
                }
            ],
            timestamp: new Date().toISOString(),
            footer: {
                text: 'Trinity Universe Access Management'
            }
        };
        
        await interaction.editReply({ embeds: [successEmbed] });
        
        console.log(`✅ 成功为用户 ${interaction.user.tag} 的邮箱 ${email} 授予权限并兑换 Freelancer Notion Template`);
        
    } catch (error) {
        console.error('❌ 处理 Freelancer Notion Template 兑换时出错:', error);
        
        // 检查是否是Discord API错误
        if (error.code === 10062) {
            console.log('⚠️  交互已过期，无法响应用户');
            return;
        }
        
        if (error.code === 40060) {
            console.log('⚠️  交互已被确认，无法重复响应');
            return;
        }
        
        // 尝试响应错误，但要安全地处理
        try {
            if (interaction.deferred && !interaction.replied) {
            await interaction.editReply({
                    content: '❌ An unexpected error occurred during template redemption. Please try again later or contact an administrator!'
                });
            } else if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An unexpected error occurred during template redemption!',
                    flags: MessageFlags.Ephemeral
                });
            }
        } catch (responseError) {
            console.error('❌ 无法发送错误响应:', responseError.message);
        }
    }
}

// 检查是否为服务器 Owner
function isServerOwner(interaction) {
    return interaction.guild.ownerId === interaction.user.id;
}

// 服务器 Owner 权限检查装饰器
async function requireServerOwner(interaction, commandName) {
    if (!isServerOwner(interaction)) {
        await interaction.reply({
            content: `❌ Only the server owner can use the \`/${commandName}\` command!`,
            flags: MessageFlags.Ephemeral
        });
        return false;
    }
    return true;
}

// 处理广播命令 - 简化版
async function handleBroadcastCommand(interaction) {
    if (!(await requireServerOwner(interaction, 'broadcast'))) return;
    
    const message = interaction.options.getString('message');
    const url = interaction.options.getString('url');
    
    await interaction.reply({
        content: '📢 Broadcasting announcement...',
        flags: MessageFlags.Ephemeral
    });
    
    const broadcastEmbed = {
        color: 0xff6b6b,
        title: '📢 Official Announcement',
        description: message,
        fields: [],
        timestamp: new Date().toISOString(),
        footer: {
            text: 'Trinity Universe Official Announcement'
        }
    };
    
    // 如果提供了URL，使用嵌套链接格式
    if (url) {
        // 设置embed本身的链接
        broadcastEmbed.url = url;
        
        // 添加链接字段
        broadcastEmbed.fields.push({
            name: '🌐 Learn More',
            value: `[Click here for details](${url})`,
            inline: false
        });
    }
    
    try {
        await interaction.channel.send({
            content: '@everyone',
            embeds: [broadcastEmbed]
        });
        
        await interaction.editReply({
            content: '✅ Broadcast sent successfully!'
        });
        
        console.log(`📢 ${interaction.user.tag} sent broadcast announcement`);
    } catch (error) {
        console.error('❌ Failed to send broadcast:', error);
        await interaction.editReply({
            content: '❌ Failed to send broadcast. Please check bot permissions!'
        });
    }
}

// 处理社交媒体通知命令 - 使用平台特定的链接嵌套
async function handleSocialCommand(interaction) {
    if (!(await requireServerOwner(interaction, 'social'))) return;
    
    const platform = interaction.options.getString('platform');
    const content = interaction.options.getString('content');
    const link = interaction.options.getString('link');
    
    const platformEmojis = {
        'tiktok': '🎵',
        'youtube': '📺',
        'twitter': '🐦',
        'mystic': '📜'
    };
    
    const platformNames = {
        'tiktok': 'TikTok',
        'youtube': 'YouTube',
        'twitter': 'Twitter/X',
        'mystic': 'Mystic Scroll'
    };
    
    const platformColors = {
        'tiktok': 0x000000,
        'youtube': 0xFF0000,
        'twitter': 0x1DA1F2,
        'mystic': 0x9B59B6
    };
    
    await interaction.reply({
        content: '📱 Posting social media notification...',
        flags: MessageFlags.Ephemeral
    });
    
    const socialEmbed = {
        color: platformColors[platform],
        title: `${platformEmojis[platform]} New ${platformNames[platform]} Content!`,
        description: content,
        // 让标题本身成为链接
        url: link,
        fields: [
            {
                name: '🎯 Watch Now',
                value: `[Click to view on ${platformNames[platform]}](${link})`,
                inline: false
            },
            {
                name: '💡 Support Us',
                value: 'Like, share, and engage to support the community! 👍',
                inline: false
            },
            {
                name: '🔔 Stay Updated',
                value: `[Follow our ${platformNames[platform]}](${link}) for the latest content`,
                inline: false
            }
        ],
        timestamp: new Date().toISOString(),
        footer: {
            text: `Trinity Universe ${platformNames[platform]} Update`
        }
    };
    
    try {
        await interaction.channel.send({
            content: '@everyone 🎉',
            embeds: [socialEmbed]
        });
        
        await interaction.editReply({
            content: `✅ ${platformNames[platform]} notification sent successfully! Multiple clickable links included.`
        });
        
        console.log(`📱 ${interaction.user.tag} sent ${platformNames[platform]} notification: ${content}`);
    } catch (error) {
        console.error('❌ Failed to send social media notification:', error);
        await interaction.editReply({
            content: '❌ Failed to send social media notification. Please check bot permissions!'
        });
    }
}

// 处理福利发放命令 - 简化版Trinity Citizen激活码生成
async function handleGiveawayCommand(interaction) {
    if (!(await requireServerOwner(interaction, 'giveaway'))) return;
    
    const quantity = interaction.options.getInteger('quantity');
    
    await interaction.reply({
        content: '🎁 Generating Trinity Citizen Access codes...',
        flags: MessageFlags.Ephemeral
    });
    
    let activationCodes = [];
    
    // 生成激活码
    if (supabase) {
        try {
            console.log(`🔧 Generating ${quantity} Trinity Citizen activation codes...`);
            
            // 调用 Supabase 函数生成激活码
            const currentTime = new Date().toISOString();
            const { data: codesData, error: codesError } = await supabase
                .rpc('generate_activation_codes', {
                    p_permission_slug: 'citizen',
                    p_quantity: quantity,
                    p_duration_type: 'permanent',
                    p_owner_name: 'discord-bot',
                    p_notes: `Generated via Discord bot at ${currentTime}`
                });
            
            if (codesError) {
                console.error('❌ Failed to generate activation codes:', codesError);
                await interaction.editReply({
                    content: '❌ Failed to generate activation codes. Database error occurred!'
                });
                return;
            }
            
            if (codesData && codesData.length > 0) {
                activationCodes = codesData.map(item => item.generated_code);
                console.log(`✅ Successfully generated ${activationCodes.length} activation codes`);
            } else {
                console.warn('⚠️ Activation code generation returned empty result');
            }
            
        } catch (error) {
            console.error('❌ Error generating activation codes:', error);
            await interaction.editReply({
                content: '❌ Failed to generate activation codes. Please try again later!'
            });
            return;
        }
    } else {
        await interaction.editReply({
            content: '❌ Database connection not available!'
        });
        return;
    }
    
    // 公开福利通知
    const giveawayEmbed = {
        color: 0x00ff88,
        title: '🎁 🎭 Trinity Citizen Access Giveaway!',
        description: 'Trinity Citizen Access codes are now available! Join our community and unlock exclusive benefits.',
        fields: [
            {
                name: '⏰ Validity',
                value: 'Permanent Access',
                inline: true
            },
            {
                name: '🎟️ Available Codes',
                value: `**${activationCodes.length}** codes generated`,
                inline: true
            },
            {
                name: '🌐 Learn More',
                value: '[Visit donbluff.com](https://donbluff.com)',
                inline: false
            },
            {
                name: '🏆 Good Luck!',
                value: 'May the odds be in your favor! 🍀',
                inline: false
            }
        ],
        url: 'https://donbluff.com',
        timestamp: new Date().toISOString(),
        footer: {
            text: 'Trinity Universe Giveaway'
        }
    };
    
    try {
        // 发送公开的福利通知
        await interaction.channel.send({
            content: '@everyone 🎉',
            embeds: [giveawayEmbed]
        });
        
        // 发送激活码到指定频道
        if (activationCodes.length > 0) {
            const targetChannelId = '1430911703075393657';
            const targetChannel = interaction.guild.channels.cache.get(targetChannelId);
            
            if (!targetChannel) {
                console.error(`❌ Target channel not found: ${targetChannelId}`);
                await interaction.editReply({
                    content: `✅ Giveaway notification sent successfully!\n⚠️ Could not find target channel for activation codes.`
                });
                return;
            }
            
            try {
                // 发送简洁的标题信息
                const headerEmbed = {
                    color: 0x00ff88,
                    title: '🔐 Trinity Citizen Access Codes',
                    description: `Generated **${activationCodes.length}** Trinity Citizen Access codes`,
                    fields: [
                        {
                            name: '📊 Details',
                            value: `**Quantity**: ${activationCodes.length}\n**Validity**: Permanent\n**Type**: Trinity Citizen Access`,
                            inline: false
                        }
                    ],
                    timestamp: new Date().toISOString(),
                    footer: {
                        text: 'Trinity Universe Access Management'
                    }
                };
                
                await targetChannel.send({ embeds: [headerEmbed] });
                
                // 精美地显示每个激活码
                for (let i = 0; i < activationCodes.length; i++) {
                    const code = activationCodes[i];
                    const codeEmbed = {
                        color: 0x6c5ce7,
                        title: `🎟️ Code #${i + 1}`,
                        description: `\`\`\`${code}\`\`\``,
                        footer: {
                            text: 'Trinity Citizen Access Code'
                        }
                    };
                    
                    await targetChannel.send({ embeds: [codeEmbed] });
                    
                    // 添加短暂延迟避免速率限制
                    if (i < activationCodes.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                }
                
                await interaction.editReply({
                    content: `✅ Giveaway notification sent successfully!\n🔐 ${activationCodes.length} Trinity Citizen Access codes generated and sent to <#${targetChannelId}>.`
                });
                
                console.log(`✅ Activation codes sent to channel ${targetChannel.name} (${targetChannelId})`);
                
            } catch (channelError) {
                console.error('❌ Failed to send activation codes to channel:', channelError);
                
                await interaction.editReply({
                    content: `✅ Giveaway notification sent successfully!\n⚠️ Could not send codes to target channel. Please check bot permissions.`
                });
                
                // 备用方案：在控制台输出激活码
                console.log('\n🔐 Generated Activation Codes (Backup):');
                console.log('================================');
                activationCodes.forEach((code, index) => {
                    console.log(`${index + 1}. ${code}`);
                });
                console.log('================================');
            }
        }
        
        console.log(`🎁 ${interaction.user.tag} generated Trinity Citizen giveaway (${activationCodes.length} codes)`);
        
    } catch (error) {
        console.error('❌ Failed to send giveaway notification:', error);
        await interaction.editReply({
            content: '❌ Failed to send giveaway notification. Please check bot permissions!'
        });
    }
}

// 权限过期检查函数（已禁用）
async function checkExpiredPermissions() {
    // 功能已禁用 - 如需启用，请配置数据库权限表
    console.log('ℹ️  权限过期检查功能已禁用');
    return;
    
    if (!supabase) {
        console.log('⚠️  Supabase 未配置，跳过权限过期检查');
        return;
    }

    try {
        console.log('🔍 开始检查过期权限...');
        
        // 查询所有已过期的 trinity_citizen 权限
        // 首先获取 trinity_citizen 权限的 ID
        const { data: trinityCitizenPermission } = await supabase
            .from('permissions')
            .select('id')
            .eq('slug', 'trinity_citizen')
            .single();

        if (!trinityCitizenPermission) {
            console.log('⚠️  未找到 trinity_citizen 权限定义');
            return;
        }

        // 查询过期的 trinity_citizen 权限
        const { data: expiredPermissions, error } = await supabase
            .from('user_permissions')
            .select(`
                user_id,
                permission_id,
                expires_at,
                discord_user_id
            `)
            .eq('is_active', true)
            .eq('permission_id', trinityCitizenPermission.id)
            .not('expires_at', 'is', null)
            .lt('expires_at', new Date().toISOString());

        if (error) {
            console.error('❌ 查询过期权限时出错:', error);
            return;
        }

        if (!expiredPermissions || expiredPermissions.length === 0) {
            console.log('✅ 没有发现过期的 trinity_citizen 权限');
            return;
        }

        // 为每个过期权限获取用户信息
        const expiredPermissionsWithUserInfo = [];
        for (const perm of expiredPermissions) {
            const { data: userProfile } = await supabase
                .from('user_profiles')
                .select('email, nickname')
                .eq('id', perm.user_id)
                .single();

            expiredPermissionsWithUserInfo.push({
                ...perm,
                user_profiles: userProfile || { email: 'unknown', nickname: 'unknown' },
                permissions: { slug: 'trinity_citizen', name: 'Trinity Citizen' }
            });
        }

        console.log(`📋 发现 ${expiredPermissionsWithUserInfo.length} 个过期的 trinity_citizen 权限`);

        // 处理每个过期权限
        for (const expiredPerm of expiredPermissionsWithUserInfo) {
            try {
                // 在数据库中撤销权限
                const { error: revokeError } = await supabase
                    .from('user_permissions')
                    .update({ 
                        is_active: false,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', expiredPerm.user_id)
                    .eq('permission_id', expiredPerm.permission_id);

                if (revokeError) {
                    console.error('❌ 撤销数据库权限失败:', revokeError);
                    continue;
                }

                // 移除Discord角色
                const trinityCitizenRoleId = config.roles.trinity_citizen;
                if (!trinityCitizenRoleId) {
                    console.warn('⚠️  trinity_citizen 角色ID未配置');
                    continue;
                }

                let roleRemoved = false;
                
                // 如果有存储的Discord用户ID，直接使用
                if (expiredPerm.discord_user_id) {
                    // 遍历机器人所在的所有服务器
                    for (const [guildId, guild] of client.guilds.cache) {
                        try {
                            const member = await guild.members.fetch(expiredPerm.discord_user_id).catch(() => null);
                            if (member && member.roles.cache.has(trinityCitizenRoleId)) {
                                await member.roles.remove(trinityCitizenRoleId);
                                roleRemoved = true;
                                
                                // 通知用户权限已过期
                                try {
                                    const notificationEmbed = {
                                        color: 0xff9900,
                                        title: '⏰ Access Expired',
                                        description: 'Your Trinity Citizen access has expired',
                                        fields: [
                                            {
                                                name: '📚 Expired Access',
                                                value: 'Trinity Citizen',
                                                inline: true
                                            },
                                            {
                                                name: '⏰ Expiration Date',
                                                value: new Date(expiredPerm.expires_at).toLocaleString('en-US'),
                                                inline: true
                                            },
                                            {
                                                name: '🔄 Renewal',
                                                value: 'To continue accessing the community, please visit donbluff.com to renew your membership',
                                                inline: false
                                            }
                                        ],
                                        timestamp: new Date().toISOString(),
                                        footer: {
                                            text: 'Trinity Universe Access Management'
                                        }
                                    };
                                    
                                    await member.send({ embeds: [notificationEmbed] });
                                    console.log(`📧 已向用户 ${member.user.tag} 发送过期通知`);
                                } catch (dmError) {
                                    console.log(`⚠️  无法向用户 ${member.user.tag} 发送私信通知`);
                                }
                                
                                console.log(`✅ 已移除用户 ${member.user.tag} 在服务器 ${guild.name} 的 trinity_citizen 角色`);
                                break; // 找到用户后跳出服务器循环
                            }
                        } catch (memberError) {
                            console.error(`❌ 处理服务器 ${guild.name} 中的成员时出错:`, memberError);
                        }
                    }
                } else {
                    // 如果没有存储Discord用户ID，记录警告
                    console.warn(`⚠️  用户 ${expiredPerm.user_profiles.email} 没有关联的Discord用户ID，无法自动移除角色`);
                }

                if (roleRemoved) {
                    console.log(`✅ 已成功处理用户 ${expiredPerm.user_profiles.email} 的过期权限`);
                } else {
                    console.log(`⚠️  用户 ${expiredPerm.user_profiles.email} 的Discord角色移除失败或未找到用户`);
                }

            } catch (userError) {
                console.error('❌ 处理过期权限时出错:', userError);
            }
        }

        console.log('✅ 权限过期检查完成');

    } catch (error) {
        console.error('❌ 权限过期检查过程出错:', error);
    }
}

// 邮箱验证处理函数（更新版本，包含Discord用户ID存储）
async function handleVerifyCommand(interaction) {
    const email = interaction.options.getString('email').toLowerCase().trim();
    
    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        await interaction.reply({
            content: '❌ Invalid email format. Please provide a valid email address!',
            flags: MessageFlags.Ephemeral
        });
        return;
    }
    
    if (!supabase) {
        await interaction.reply({
            content: '❌ Email verification is temporarily unavailable. Please contact an administrator!',
            flags: MessageFlags.Ephemeral
        });
        return;
    }
    
    // 延迟回复，因为数据库查询可能需要时间
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    try {
        // 查询用户资料
        const { data: userProfile, error: userError } = await supabase
            .from('user_profiles')
            .select('id, email, nickname')
            .eq('email', email)
            .single();
        
        if (userError || !userProfile) {
            await interaction.editReply({
                content: '❌ No account found with this email address. Please check your email or contact an administrator!'
            });
            return;
        }
        
        // 查询用户权限
        const { data: userPermissions, error: permError } = await supabase
            .from('user_permissions')
            .select(`
                id,
                permission_id,
                is_active,
                expires_at,
                permissions (
                    slug,
                    name,
                    description
                )
            `)
            .eq('user_id', userProfile.id)
            .eq('is_active', true);
        
        if (permError) {
            console.error('查询权限时出错:', permError);
            await interaction.editReply({
                content: '❌ Error occurred while checking permissions. Please try again later!'
            });
            return;
        }
        
        // 过滤有效权限（未过期的）
        const activePermissions = userPermissions.filter(perm => 
            !perm.expires_at || new Date(perm.expires_at) > new Date()
        );
        
        if (!activePermissions || activePermissions.length === 0) {
            await interaction.editReply({
                content: '❌ Your account has no valid permissions. Please visit donbluff.com to purchase access or contact an administrator!'
            });
            return;
        }
        
        // 分配对应的 Discord 角色
        const assignedRoles = [];
        const failedRoles = [];
        
        for (const userPerm of activePermissions) {
            const permSlug = userPerm.permissions.slug;
            const roleId = config.roles[permSlug];
            
            if (!roleId) {
                console.warn(`⚠️  权限 ${permSlug} 没有配置对应的角色ID`);
                continue;
            }
            
            const role = interaction.guild.roles.cache.get(roleId);
            if (!role) {
                console.warn(`⚠️  角色 ${roleId} 不存在`);
                failedRoles.push(userPerm.permissions.name);
                continue;
            }
            
            // 检查用户是否已经有此角色
            if (interaction.member.roles.cache.has(roleId)) {
                console.log(`用户已拥有角色: ${role.name}`);
                continue;
            }
            
            try {
                await interaction.member.roles.add(role);
                assignedRoles.push({
                    name: role.name,
                    permission: userPerm.permissions.name,
                    expires: userPerm.expires_at
                });
                
                // 更新数据库，存储Discord用户ID用于后续的权限管理
                await supabase
                    .from('user_permissions')
                    .update({ 
                        discord_user_id: interaction.user.id,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', userPerm.id);
                
                console.log(`✅ 为用户 ${interaction.user.tag} 分配角色: ${role.name}`);
            } catch (roleError) {
                console.error(`❌ 分配角色失败: ${role.name}`, roleError);
                failedRoles.push(userPerm.permissions.name);
            }
        }
        
        // 创建结果消息
        const embed = {
            color: assignedRoles.length > 0 ? 0x00ff00 : 0xff9900,
            title: assignedRoles.length > 0 ? '✅ Verification Successful!' : '⚠️  Partial Verification Complete',
            description: `Verification results for **${userProfile.nickname || 'Verified User'}**:`,
            fields: [
                {
                    name: '📧 Verification Status',
                    value: 'Email verification successful',
                    inline: true
                },
                {
                    name: '🔒 Privacy Protection',
                    value: 'Original verification message deleted',
                    inline: true
                }
            ],
            timestamp: new Date().toISOString()
        };
        
        if (assignedRoles.length > 0) {
            embed.fields.push({
                name: '🎭 Assigned Roles',
                value: assignedRoles.map(role => {
                    const expiryInfo = role.expires ? 
                        `\n   ⏰ Expires: ${new Date(role.expires).toLocaleDateString('en-US')}` : 
                        '\n   ⏰ Permanent Access';
                    return `• **${role.name}** (${role.permission})${expiryInfo}`;
                }).join('\n'),
                inline: false
            });
        }
        
        if (failedRoles.length > 0) {
            embed.fields.push({
                name: '❌ Assignment Failed',
                value: failedRoles.join(', '),
                inline: false
            });
        }
        
        // 如果验证成功（至少分配了一个角色），则删除原始交互
        if (assignedRoles.length > 0) {
            try {
                // 删除原始的斜杠命令交互
                await interaction.deleteReply();
                
                // 通过私信发送验证结果，确保隐私
                await interaction.user.send({ 
                    content: '🔐 **Trinity Universe Verification Results**\n\nFor your privacy, verification results are sent via direct message:',
                    embeds: [embed] 
                });
                
                console.log(`✅ 验证成功并删除原始消息: ${interaction.user.tag}`);
                
            } catch (deleteError) {
                console.error('❌ 删除消息或发送私信失败:', deleteError);
                
                // 如果删除失败或无法发送私信，仍然通过ephemeral回复显示结果
                embed.fields.push({
                    name: '⚠️  Notice',
                    value: 'Unable to delete original message or send DM. Please manually delete verification message for privacy.',
                    inline: false
                });
                
                await interaction.editReply({ embeds: [embed] });
            }
        } else {
            // 如果验证失败，保持原有的ephemeral回复方式
            await interaction.editReply({ embeds: [embed] });
        }
        
        console.log(`✅ 用户 ${interaction.user.tag} 通过邮箱 ${email} 验证完成`);
        
    } catch (error) {
        console.error('❌ 邮箱验证过程出错:', error);
        
        // 检查是否是Discord API错误
        if (error.code === 10062 || error.code === 40060) {
            console.log('⚠️  交互错误，无法发送验证响应');
            return;
        }
        
        try {
            if (interaction.deferred && !interaction.replied) {
        await interaction.editReply({
            content: '❌ An error occurred during verification. Please try again later or contact an administrator!'
        });
            }
        } catch (responseError) {
            console.error('❌ 无法发送验证错误响应:', responseError.message);
        }
    }
}

// 处理普通消息（可选）
client.on(Events.MessageCreate, (message) => {
    // 忽略机器人自己的消息
    if (message.author.bot) return;
    
    // 简单的关键词回复
    if (message.content.toLowerCase().includes('trinity universe') || message.content.toLowerCase().includes('三元宇宙')) {
        message.react('🌌');
    }
    
    if (message.content.toLowerCase().includes('你好') || message.content.toLowerCase().includes('hello')) {
        message.reply('👋 Hello! I am the Trinity Universe bot assistant!');
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

// 启动定时检查（已禁用）
function startPermissionChecker() {
    console.log('ℹ️  权限过期检查器已禁用');
    return;
    
    // 立即执行一次检查
    setTimeout(checkExpiredPermissions, 30000); // 启动后30秒执行第一次检查
    
    // 每小时检查一次 (3600000 毫秒 = 1小时)
    setInterval(checkExpiredPermissions, 3600000);
    
    console.log('⏰ 权限过期检查器已启动，每小时检查一次');
}

// 登录机器人
client.login(config.token).then(() => {
    // 机器人登录成功后启动权限检查器
    startPermissionChecker();
    // 同时启动欢迎频道清理器
    startWelcomeChannelCleaner();
}).catch((error) => {
    console.error('❌ 机器人登录失败:', error);
    process.exit(1);
}); 