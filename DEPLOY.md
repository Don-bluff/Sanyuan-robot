# 🚀 Railway 部署指南

## 部署到 Railway

### 1. 准备工作
- 确保代码已推送到 GitHub
- 准备好你的 Discord 机器人 TOKEN 和相关信息

### 2. 在 Railway 上部署

1. **访问 Railway**
   - 前往 [railway.app](https://railway.app)
   - 使用 GitHub 账户登录

2. **创建新项目**
   - 点击 "New Project"
   - 选择 "Deploy from GitHub repo"
   - 选择你的 `Sanyuan-robot` 仓库

3. **设置环境变量**
   在 Railway 项目设置中添加以下环境变量：
   
   ```
   DISCORD_TOKEN=你的机器人TOKEN
   CLIENT_ID=你的客户端ID
   GUILD_ID=你的服务器ID（可选）
   NODE_ENV=production
   ```

4. **部署**
   - Railway 会自动检测到这是一个 Node.js 项目
   - 自动安装依赖并启动机器人
   - 几分钟后机器人就会24小时在线了！

### 3. 环境变量说明

| 变量名 | 说明 | 必需 |
|--------|------|------|
| `DISCORD_TOKEN` | Discord 机器人 TOKEN | ✅ |
| `CLIENT_ID` | Discord 应用的客户端 ID | ✅ |
| `GUILD_ID` | Discord 服务器 ID（用于快速注册命令） | ❌ |
| `NODE_ENV` | 运行环境（设置为 production） | ❌ |

### 4. 获取必要信息

#### Discord TOKEN
1. 前往 [Discord Developer Portal](https://discord.com/developers/applications)
2. 选择你的应用
3. 点击 "Bot" 标签
4. 点击 "Reset Token" 并复制新的 TOKEN

#### CLIENT_ID
1. 在 Discord Developer Portal 中
2. 点击 "General Information" 标签
3. 复制 "Application ID"

#### GUILD_ID（可选）
1. 在 Discord 中右键点击你的服务器名称
2. 选择 "复制服务器ID"（需要开启开发者模式）

### 5. 验证部署

部署成功后，你可以：
- 在 Railway 控制台查看日志
- 在 Discord 中使用 `/status` 命令查看机器人状态
- 机器人会显示为在线状态

### 6. 故障排除

如果遇到问题：
1. 检查 Railway 的部署日志
2. 确认环境变量设置正确
3. 确认 Discord 机器人权限设置正确
4. 检查机器人是否已邀请到服务器

## 本地开发

如果需要本地开发：
1. 复制 `config.example.js` 为 `config.js`
2. 填入你的配置信息
3. 运行 `npm start`

机器人会优先使用环境变量，如果没有环境变量则使用本地配置文件。 