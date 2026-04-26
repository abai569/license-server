# FLVX 授权服务

FLVX 面板的独立授权管理系统

项目仓库：https://github.com/abai569/license-server

## 功能

- 授权码管理（创建、编辑、删除）
- 域名绑定验证
- 到期时间管理
- JWT 鉴权的管理后台（Web 界面）

## 部署方式

### 方式一：二进制部署（推荐，简单）

直接从 GitHub Releases 下载编译好的二进制文件：

```bash
curl -fsSL https://raw.githubusercontent.com/abai569/license-server/main/install.sh -o install.sh
chmod +x install.sh
sudo ./install.sh
```

安装完成后会输出：
- 管理后台地址：`http://服务器 IP:18888`
- 管理员账号：`admin`
- 管理员密码：（随机生成，请保存）

### 方式二：源码编译部署

适合需要自定义或无法访问 GitHub 的场景：

```bash
# 1. 编译前端
cd frontend
npm install
npm run build

# 2. 编译后端
cd ..
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o license-server -ldflags="-s -w" ./cmd

# 3. 上传到服务器并配置 systemd 服务
scp license-server root@服务器 IP:/usr/local/bin/
scp license-server.service root@服务器 IP:/etc/systemd/system/

# 4. 在服务器上启动
ssh root@服务器 IP
mkdir -p /var/lib/license-server
systemctl daemon-reload
systemctl enable license-server
systemctl start license-server
```

## 使用

1. **访问授权后台**：`http://服务器 IP:18888`
2. **登录**：用户名 `admin`，密码见安装输出
3. **创建授权**：填写域名 + 到期时间 → 自动生成 UUID
4. **配置 FLVX**：将 UUID 添加到 FLVX 的环境变量

## 配置 FLVX 面板

在 FLVX 面板的 docker-compose 环境变量中添加：

```yaml
environment:
  LICENSE_SERVER_URL: http://授权服务 IP:18888
  LICENSE_KEY: 从授权后台生成的 UUID
```

重启 FLVX：
```bash
docker compose restart
```

然后访问 FLVX 面板，侧边栏底部会显示授权状态和到期时间。

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `SERVER_ADDR` | 监听地址 | `:18888` |
| `DB_PATH` | SQLite 路径 | `/var/lib/license-server/license.db` |
| `JWT_SECRET` | JWT 密钥 | (必填) |
| `ADMIN_USERNAME` | 管理员账号 | `admin` |
| `ADMIN_PASSWORD` | 管理员密码 | (安装时生成) |

## 常用命令

```bash
# 查看状态
systemctl status license-server

# 重启服务
systemctl restart license-server

# 查看日志
journalctl -u license-server -f

# 卸载
curl -fsSL https://raw.githubusercontent.com/abai569/license-server/main/uninstall.sh -o uninstall.sh
sudo ./uninstall.sh
```

## 相关项目

- FLVX 面板：https://github.com/abai569/flvx
- 授权服务：https://github.com/abai569/license-server

## 快速安装

### 一键安装脚本

```bash
curl -fsSL https://github.com/Sagit-chu/flux-panel/releases/latest/download/install.sh -o install.sh
chmod +x install.sh
./install.sh
```

安装完成后会输出：
- 管理后台地址
- 管理员账号（固定为 `admin`）
- 管理员密码（随机生成）

### 手动安装

```bash
# 1. 下载二进制
wget https://github.com/Sagit-chu/flux-panel/releases/latest/download/license-server-linux-amd64 -O /usr/local/bin/license-server
chmod +x /usr/local/bin/license-server

# 2. 创建目录
mkdir -p /var/lib/license-server

# 3. 创建 systemd 服务
cat > /etc/systemd/system/license-server.service <<EOF
[Unit]
Description=License Server
After=network.target

[Service]
Environment="SERVER_ADDR=:18888"
Environment="DB_PATH=/var/lib/license-server/license.db"
Environment="JWT_SECRET=your-random-secret"
Environment="ADMIN_USERNAME=admin"
Environment="ADMIN_PASSWORD=your-password"
ExecStart=/usr/local/bin/license-server
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

# 4. 启动服务
systemctl daemon-reload
systemctl enable license-server
systemctl start license-server
```

## 使用

### 1. 访问管理后台

浏览器打开：`http://服务器 IP:18888`

登录：
- 用户名：`admin`
- 密码：安装时生成的密码

### 2. 创建授权

在管理后台：
1. 点击"新建授权"
2. 填写域名（如 `panel.example.com`）
3. 选择到期时间
4. 点击创建，自动生成 UUID 授权码

### 3. 配置 FLVX 面板

在 FLVX 的 docker-compose 环境变量中添加：

```yaml
environment:
  LICENSE_SERVER_URL: http://授权服务 IP:18888
  LICENSE_KEY: 生成的 UUID
```

重启 FLVX 面板即可。

## API 文档

### 验证端 API（公开）

#### POST /api/verify

验证授权

请求：
```json
{
  "license_key": "uuid",
  "domain": "panel.example.com"
}
```

响应：
```json
{
  "valid": true,
  "expire_time": 1735689600000,
  "username": "admin"
}
```

### 管理端 API（需要 JWT 鉴权）

#### POST /api/admin/login

登录

请求：
```json
{
  "username": "admin",
  "password": "password"
}
```

响应：
```json
{
  "token": "jwt-token",
  "username": "admin"
}
```

#### POST /api/admin/license/list

获取授权列表

请求：
```json
{
  "keyword": "搜索域名"
}
```

#### POST /api/admin/license/create

创建授权

请求：
```json
{
  "domain": "panel.example.com",
  "expire_time": 1735689600000
}
```

#### POST /api/admin/license/update

更新授权

请求：
```json
{
  "id": 1,
  "domain": "new-domain.com",
  "expire_time": 1735689600000,
  "status": 1
}
```

#### POST /api/admin/license/delete

删除授权

请求：
```json
{
  "id": 1
}
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `SERVER_ADDR` | 监听地址 | `:18888` |
| `DB_PATH` | SQLite 路径 | `/var/lib/license-server/license.db` |
| `JWT_SECRET` | JWT 密钥 | (必填) |
| `ADMIN_USERNAME` | 管理员账号 | `admin` |
| `ADMIN_PASSWORD` | 管理员密码 | `admin123` |

## 常用命令

```bash
# 查看状态
systemctl status license-server

# 重启服务
systemctl restart license-server

# 查看日志
journalctl -u license-server -f

# 卸载
bash uninstall.sh
```

## 开发

```bash
# 本地运行
make run

# 编译
make build

# 编译 Linux 版本
make build-linux
```

## License

MIT
