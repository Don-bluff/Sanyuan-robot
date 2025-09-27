// Discord Bot 配置文件示例
// 复制此文件为 config.js 并填入你的实际值

const config = {
    // 从 Discord Developer Portal 获取的机器人 TOKEN
    token: 'your_bot_token_here',
    
    // 从 Discord Developer Portal 获取的 Client ID
    clientId: 'your_client_id_here',
    
    // 你的服务器 ID（可选，用于注册斜杠命令）
    guildId: 'your_guild_id_here',
    
    // Supabase 配置（可选）
    supabaseUrl: 'your_supabase_url_here',
    supabaseAnonKey: 'your_supabase_anon_key_here',
    
    // 欢迎频道 ID（可选）
    welcomeChannelId: 'your_welcome_channel_id_here',
    
    // 角色配置
    roles: {
        trinity_citizen: 'your_trinity_citizen_role_id_here'
    }
};

// 简单的配置验证
if (!config.token || config.token === 'your_bot_token_here') {
    console.error('❌ 错误：请在 config.js 中设置有效的机器人 TOKEN！');
    process.exit(1);
}

if (!config.clientId || config.clientId === 'your_client_id_here') {
    console.error('❌ 错误：请在 config.js 中设置有效的 CLIENT_ID！');
    process.exit(1);
}

console.log('✅ 配置文件加载成功');
console.log(`🤖 机器人 ID: ${config.clientId}`);
console.log(`🏠 服务器 ID: ${config.guildId}`);

module.exports = config;
