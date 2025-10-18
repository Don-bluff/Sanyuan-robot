// 三元宇宙 Discord 机器人
const { Client, GatewayIntentBits, Events, SlashCommandBuilder, REST, Routes } = require('discord.js');
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
        .setDescription('Redeem discount code access with your email')
        .addStringOption(option =>
            option.setName('email')
                .setDescription('Your email address')
                .setRequired(true)
        )
];

// 当机器人准备就绪时触发
client.once(Events.ClientReady, async (readyClient) => {
    console.log(`✅ 机器人已上线！登录为 ${readyClient.user.tag}`);
    console.log(`🌐 运行环境: ${process.env.NODE_ENV || 'development'}`);
    
    // 设置机器人状态
    client.user.setActivity('Trinity Universe', { type: 'WATCHING' });
    
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
        }
    } catch (error) {
        console.error('❌ 处理命令时出错:', error);
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: '❌ An error occurred while executing the command!', ephemeral: true });
        } else {
            await interaction.reply({ content: '❌ An error occurred while executing the command!', ephemeral: true });
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
                ephemeral: true
            });
            return;
        }
        
        await interaction.deferReply({ ephemeral: true });
        
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
                ephemeral: true
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
                ephemeral: true
            });
            return;
        }
        
        // 验证邮箱格式
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            await interaction.reply({
                content: '❌ Invalid email format. Please provide a valid email address!',
                ephemeral: true
            });
            return;
        }
        
        console.log(`🎫 用户 ${interaction.user.tag} 使用邮箱 ${email} 兑换折扣码`);
        
        // 直接返回成功消息，引导用户去网站查看教程
        const successEmbed = {
            color: 0x00ff00,
            title: '✅ Discount Code Submitted Successfully!',
            description: `Your email **${email}** has been recorded for discount code redemption.`,
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
        
        await interaction.reply({ embeds: [successEmbed], ephemeral: true });
        
        console.log(`✅ 用户 ${interaction.user.tag} 成功提交邮箱 ${email} 进行折扣码兑换`);
        
    } catch (error) {
        console.error('❌ 处理折扣码兑换时出错:', error);
        
        await interaction.reply({
            content: '❌ An unexpected error occurred during redemption. Please try again later or contact an administrator!',
            ephemeral: true
        });
    }
}

// 权限过期检查函数
async function checkExpiredPermissions() {
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
            ephemeral: true
        });
        return;
    }
    
    if (!supabase) {
        await interaction.reply({
            content: '❌ Email verification is temporarily unavailable. Please contact an administrator!',
            ephemeral: true
        });
        return;
    }
    
    // 延迟回复，因为数据库查询可能需要时间
    await interaction.deferReply({ ephemeral: true });
    
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
        await interaction.editReply({
            content: '❌ An error occurred during verification. Please try again later or contact an administrator!'
        });
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

// 启动定时检查（每小时检查一次）
function startPermissionChecker() {
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