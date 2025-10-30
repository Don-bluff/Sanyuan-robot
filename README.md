# 三元宇宙 Discord 机器人

一个为三元宇宙服务器定制的 Discord 机器人。

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 配置机器人

#### 本地开发
1. 复制 `config.example.js` 为 `config.js`
2. 在 Discord Developer Portal 获取你的机器人信息：
   - **TOKEN**: 在 Bot 页面点击 "Reset Token" 获取
   - **CLIENT_ID**: 在 General Information 页面的 Application ID
   - **GUILD_ID**: 右键点击你的服务器名称，选择"复制服务器ID"（需要开启开发者模式）

#### 云端部署（推荐）
设置以下环境变量：
```bash
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_client_id
GUILD_ID=your_discord_guild_id                    # 可选
SUPABASE_URL=your_supabase_project_url            # 可选
SUPABASE_ANON_KEY=your_supabase_anon_key         # 可选
WELCOME_CHANNEL_ID=your_welcome_channel_id        # 可选
TRINITY_CITIZEN_ROLE_ID=your_trinity_citizen_role_id  # 可选
```

### 3. 启动机器人
```bash
npm start
```

## 🎯 功能特性

### 斜杠命令

#### 基础命令
- `/ping` - 检查机器人延迟
- `/hello` - 向机器人问好
- `/serverinfo` - 显示服务器信息
- `/status` - 显示机器人状态和运行时信息
- `/verify` - 验证邮箱获取权限
- `/redeem` - 使用邮箱兑换 Freelancer Notion 模板

#### 管理员命令
- `/clean` - 手动清理欢迎频道消息（仅管理员）

#### 服务器 Owner 专用命令
- `/broadcast` - 发送 @everyone 广播公告
- `/social` - 发布社交媒体内容通知
- `/giveaway` - 发送福利发放通知

### 消息响应
- 提到"三元宇宙"时会添加 🌌 表情反应
- 说"你好"或"hello"时会回复问候

## 🔐 Owner 专用功能详解

### `/broadcast` - 广播公告
**权限**: 仅服务器 Owner  
**功能**: 发送带有 @everyone 的官方公告

**参数**:
- `message` (必填): 公告内容
- `url` (可选): 相关链接

**特色功能**:
- 简洁的固定标题："Official Announcement"
- 自动链接嵌套：`[Click here for details](URL)`
- Embed 标题本身也会成为可点击链接
- 全英文显示

### `/social` - 社交媒体通知
**权限**: 仅服务器 Owner  
**功能**: 发布社交媒体内容更新通知

**参数**:
- `platform` (必填): 平台选择 (TikTok/YouTube/Twitter/Trinity universe)
- `content` (必填): 内容简介
- `link` (必填): 内容链接

**特色功能**:
- 平台特定颜色和表情符号：
  - 🎵 TikTok: 黑色
  - 📺 YouTube: 红色  
  - 🐦 Twitter/X: 蓝色
  - 📜 Trinity universe: 紫色
- 多重嵌套链接：标题链接 + "Watch Now" + "Follow" 链接
- 全英文显示和用户互动文案

### `/giveaway` - Trinity Citizen Access码生成
**权限**: 仅服务器 Owner  
**功能**: 生成Trinity Citizen Access激活码并发送福利通知

**参数**:
- `quantity` (必填): 激活码数量 (1-50)

**功能特色**:
- 专注于Trinity Citizen Access激活码生成
- 自动调用 Supabase 的 `generate_activation_codes` 函数
- 参数设置：权限类型 'citizen'，时效性 'permanent'，代理商 'discord-bot'
- 激活码发送到指定管理频道 (ID: 1430911703075393657)
- 每个激活码单独精美显示，编号为 `Code #1`, `Code #2` 等
- 自动链接到 donbluff.com
- 所有内容均为英文显示

## 📁 项目结构
```
sanyuan-robot/
├── index.js           # 机器人主文件
├── config.example.js  # 配置文件模板
├── config.js         # 实际配置文件（需要自己创建）
├── package.json      # 项目依赖
└── README.md         # 项目说明
```

## 🔧 开发说明

### 添加新命令
在 `index.js` 中的 `commands` 数组添加新的 SlashCommandBuilder，然后在 `InteractionCreate` 事件处理器中添加对应的逻辑。

### 环境要求
- Node.js 16.9.0 或更高版本
- discord.js v14

## ⚠️ 注意事项
- 请妥善保管你的机器人 TOKEN，不要泄露给他人
- 不要将 `config.js` 文件上传到公共代码仓库
- 首次启动时斜杠命令可能需要几分钟才能在 Discord 中显示 