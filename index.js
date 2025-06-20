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
            // 角色配置 - 对应四种权限
            roles: {
                xitong: process.env.XITONG_ROLE_ID,    // 系统权限角色
                gongfa: process.env.GONGFA_ROLE_ID,    // 功法权限角色
                xinfa: process.env.XINFA_ROLE_ID,      // 心法权限角色
                zhenfa: process.env.ZHENFA_ROLE_ID     // 阵法权限角色
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
        .setDescription('检查机器人是否在线'),
    
    new SlashCommandBuilder()
        .setName('hello')
        .setDescription('向机器人问好'),
    
    new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('显示服务器信息'),
    
    new SlashCommandBuilder()
        .setName('status')
        .setDescription('显示机器人运行状态'),
    
    new SlashCommandBuilder()
        .setName('verify')
        .setDescription('通过邮箱验证获得权限')
        .addStringOption(option =>
            option.setName('email')
                .setDescription('你的邮箱地址')
                .setRequired(true)
        )
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
            title: `🎉 欢迎来到 ${member.guild.name}！`,
            description: `欢迎 ${member} 加入三元宇宙社区！`,
            fields: [
                {
                    name: '🌌 关于三元宇宙',
                    value: '三元宇宙是一个融合传统智慧与现代科技的学习平台，提供系统化的修炼方法和思维训练。',
                    inline: false
                },
                {
                    name: '📚 四大权限体系',
                    value: '• **系统权限** - 基础功能访问\n• **功法权限** - 三千经阁修炼\n• **心法权限** - 悟道心法指导\n• **阵法权限** - 破局思维训练',
                    inline: false
                },
                {
                    name: '🔐 身份验证',
                    value: '使用 `/verify 你的邮箱` 命令来获得相应权限角色',
                    inline: false
                },
                {
                    name: '📋 服务器规则',
                    value: '• 保持友善和尊重\n• 专注学习和成长\n• 积极参与社区交流',
                    inline: false
                }
            ],
            thumbnail: {
                url: member.user.displayAvatarURL()
            },
            timestamp: new Date().toISOString(),
            footer: {
                text: '开始你的修炼之旅吧！'
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
            
        } else if (commandName === 'verify') {
            await handleVerifyCommand(interaction);
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

// 权限过期检查函数
async function checkExpiredPermissions() {
    if (!supabase) {
        console.log('⚠️  Supabase 未配置，跳过权限过期检查');
        return;
    }

    try {
        console.log('🔍 开始检查过期权限...');
        
        // 查询所有已过期的 xinfa 权限
        // 首先获取 xinfa 权限的 ID
        const { data: xinfaPermission } = await supabase
            .from('permissions')
            .select('id')
            .eq('slug', 'xinfa')
            .single();

        if (!xinfaPermission) {
            console.log('⚠️  未找到 xinfa 权限定义');
            return;
        }

        // 查询过期的 xinfa 权限
        const { data: expiredPermissions, error } = await supabase
            .from('user_permissions')
            .select(`
                user_id,
                permission_id,
                expires_at,
                discord_user_id
            `)
            .eq('is_active', true)
            .eq('permission_id', xinfaPermission.id)
            .not('expires_at', 'is', null)
            .lt('expires_at', new Date().toISOString());

        if (error) {
            console.error('❌ 查询过期权限时出错:', error);
            return;
        }

        if (!expiredPermissions || expiredPermissions.length === 0) {
            console.log('✅ 没有发现过期的 xinfa 权限');
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
                permissions: { slug: 'xinfa', name: '心法权限' }
            });
        }

        console.log(`📋 发现 ${expiredPermissionsWithUserInfo.length} 个过期的 xinfa 权限`);

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
                const xinfaRoleId = config.roles.xinfa;
                if (!xinfaRoleId) {
                    console.warn('⚠️  xinfa 角色ID未配置');
                    continue;
                }

                let roleRemoved = false;
                
                // 如果有存储的Discord用户ID，直接使用
                if (expiredPerm.discord_user_id) {
                    // 遍历机器人所在的所有服务器
                    for (const [guildId, guild] of client.guilds.cache) {
                        try {
                            const member = await guild.members.fetch(expiredPerm.discord_user_id).catch(() => null);
                            if (member && member.roles.cache.has(xinfaRoleId)) {
                                await member.roles.remove(xinfaRoleId);
                                roleRemoved = true;
                                
                                // 通知用户权限已过期
                                try {
                                    const notificationEmbed = {
                                        color: 0xff9900,
                                        title: '⏰ 权限过期通知',
                                        description: '您的心法权限已到期',
                                        fields: [
                                            {
                                                name: '📚 过期权限',
                                                value: '心法权限 (xinfa)',
                                                inline: true
                                            },
                                            {
                                                name: '⏰ 过期时间',
                                                value: new Date(expiredPerm.expires_at).toLocaleString('zh-CN'),
                                                inline: true
                                            },
                                            {
                                                name: '🔄 续订说明',
                                                value: '如需继续使用，请前往三元宇宙网站续订订阅',
                                                inline: false
                                            }
                                        ],
                                        timestamp: new Date().toISOString(),
                                        footer: {
                                            text: '三元宇宙权限管理系统'
                                        }
                                    };
                                    
                                    await member.send({ embeds: [notificationEmbed] });
                                    console.log(`📧 已向用户 ${member.user.tag} 发送过期通知`);
                                } catch (dmError) {
                                    console.log(`⚠️  无法向用户 ${member.user.tag} 发送私信通知`);
                                }
                                
                                console.log(`✅ 已移除用户 ${member.user.tag} 在服务器 ${guild.name} 的 xinfa 角色`);
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
            content: '❌ 邮箱格式不正确，请提供有效的邮箱地址！',
            ephemeral: true
        });
        return;
    }
    
    if (!supabase) {
        await interaction.reply({
            content: '❌ 邮箱验证功能暂时不可用，请联系管理员！',
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
                content: '❌ 未找到与此邮箱关联的账户，请确认邮箱地址是否正确或联系管理员！'
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
                content: '❌ 查询权限时发生错误，请稍后重试！'
            });
            return;
        }
        
        // 过滤有效权限（未过期的）
        const activePermissions = userPermissions.filter(perm => 
            !perm.expires_at || new Date(perm.expires_at) > new Date()
        );
        
        if (!activePermissions || activePermissions.length === 0) {
            await interaction.editReply({
                content: '❌ 您的账户暂无有效权限，请联系管理员或购买相关产品！'
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
            title: assignedRoles.length > 0 ? '✅ 验证成功！' : '⚠️  部分验证完成',
            description: `用户 **${userProfile.nickname || '已验证用户'}** 的权限验证结果：`,
            fields: [
                {
                    name: '📧 验证状态',
                    value: '邮箱验证成功',
                    inline: true
                },
                {
                    name: '🔒 隐私保护',
                    value: '原始验证消息已删除',
                    inline: true
                }
            ],
            timestamp: new Date().toISOString()
        };
        
        if (assignedRoles.length > 0) {
            embed.fields.push({
                name: '🎭 已分配角色',
                value: assignedRoles.map(role => {
                    const expiryInfo = role.expires ? 
                        `\n   ⏰ 到期: ${new Date(role.expires).toLocaleDateString('zh-CN')}` : 
                        '\n   ⏰ 永久有效';
                    return `• **${role.name}** (${role.permission})${expiryInfo}`;
                }).join('\n'),
                inline: false
            });
        }
        
        if (failedRoles.length > 0) {
            embed.fields.push({
                name: '❌ 分配失败',
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
                    content: '🔐 **三元宇宙身份验证结果**\n\n为了保护您的隐私，验证结果通过私信发送：',
                    embeds: [embed] 
                });
                
                console.log(`✅ 验证成功并删除原始消息: ${interaction.user.tag}`);
                
            } catch (deleteError) {
                console.error('❌ 删除消息或发送私信失败:', deleteError);
                
                // 如果删除失败或无法发送私信，仍然通过ephemeral回复显示结果
                embed.fields.push({
                    name: '⚠️  注意',
                    value: '无法删除原始消息或发送私信，请手动删除验证消息以保护隐私',
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
            content: '❌ 验证过程中发生错误，请稍后重试或联系管理员！'
        });
    }
}

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
}).catch((error) => {
    console.error('❌ 机器人登录失败:', error);
    process.exit(1);
}); 