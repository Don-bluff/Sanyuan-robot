# 三元宇宙 Discord 机器人

一个为三元宇宙服务器定制的 Discord 机器人。

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 配置机器人
1. 复制 `config.example.js` 为 `config.js`
2. 在 Discord Developer Portal 获取你的机器人信息：
   - **TOKEN**: 在 Bot 页面点击 "Reset Token" 获取
   - **CLIENT_ID**: 在 General Information 页面的 Application ID
   - **GUILD_ID**: 右键点击你的服务器名称，选择"复制服务器ID"（需要开启开发者模式）

### 3. 启动机器人
```bash
npm start
```

## 🎯 功能特性

### 斜杠命令
- `/ping` - 检查机器人延迟
- `/hello` - 向机器人问好
- `/serverinfo` - 显示服务器信息

### 消息响应
- 提到"三元宇宙"时会添加 🌌 表情反应
- 说"你好"或"hello"时会回复问候

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