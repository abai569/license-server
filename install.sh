#!/bin/bash

set -e

echo "🚀 开始安装授权服务..."

# 安装目录
INSTALL_DIR="/opt/license-server"
DATA_DIR="/var/lib/license-server"

# 检测并创建目录
if [ ! -d "$INSTALL_DIR" ]; then
    echo "📁 创建安装目录：$INSTALL_DIR"
    mkdir -p "$INSTALL_DIR"
else
    echo "✅ 安装目录已存在：$INSTALL_DIR"
fi

if [ ! -d "$DATA_DIR" ]; then
    echo "📁 创建数据目录：$DATA_DIR"
    mkdir -p "$DATA_DIR"
else
    echo "✅ 数据目录已存在：$DATA_DIR"
fi

# 检测架构
ARCH=$(uname -m)
case $ARCH in
    x86_64)
        BINARY="license-server-linux-amd64"
        ;;
    aarch64|arm64)
        BINARY="license-server-linux-arm64"
        ;;
    *)
        echo "❌ 不支持的架构：$ARCH"
        exit 1
        ;;
esac

# 下载二进制文件
RELEASE_URL="https://github.com/abai569/license-server/releases/latest/download/$BINARY"
echo "⬇️ 下载二进制文件：$BINARY"
if ! curl -L --connect-timeout 10 --max-time 60 "$RELEASE_URL" -o "$INSTALL_DIR/license-server"; then
    echo "❌ 二进制文件下载失败"
    exit 1
fi
chmod +x "$INSTALL_DIR/license-server"

# 检查并安装 unzip
if ! command -v unzip &> /dev/null; then
    echo "📦 正在安装 unzip..."
    if command -v apt &> /dev/null; then
        apt update -qq && apt install -y unzip -qq
    elif command -v yum &> /dev/null; then
        yum install -y unzip -q
    elif command -v apk &> /dev/null; then
        apk add --no-cache unzip
    fi
fi

# 下载前端文件（直接下载到安装目录）
echo "⬇️ 下载前端文件..."
FRONTEND_URL="https://github.com/abai569/license-server/releases/latest/download/frontend-dist.zip"
if curl -fL --connect-timeout 10 --max-time 60 "$FRONTEND_URL" -o "$INSTALL_DIR/frontend-dist.zip" 2>/dev/null; then
    rm -rf "$INSTALL_DIR/dist"
    mkdir -p "$INSTALL_DIR/dist"
    if unzip -q -o "$INSTALL_DIR/frontend-dist.zip" -d "$INSTALL_DIR/dist" 2>/dev/null; then
        rm -f "$INSTALL_DIR/frontend-dist.zip"
        echo "✅ 前端文件下载完成"
    else
        rm -f "$INSTALL_DIR/frontend-dist.zip"
        echo "⚠️ 前端文件解压失败，将只运行 API 服务"
    fi
else
    echo "⚠️ 前端文件下载失败，将只运行 API 服务"
fi

# 生成随机密钥
JWT_SECRET=$(openssl rand -hex 16)
ADMIN_PASSWORD=$(openssl rand -hex 8)

echo "🔐 生成随机密钥..."
echo "   JWT_SECRET: $JWT_SECRET"
echo "   ADMIN_PASSWORD: $ADMIN_PASSWORD"

# 创建 systemd 服务
cat > /etc/systemd/system/license-server.service <<EOF
[Unit]
Description=License Server
After=network.target

[Service]
Type=simple
Environment="SERVER_ADDR=:18888"
Environment="DB_PATH=$DATA_DIR/license.db"
Environment="JWT_SECRET=$JWT_SECRET"
Environment="ADMIN_USERNAME=admin"
Environment="ADMIN_PASSWORD=$ADMIN_PASSWORD"
Environment="FRONTEND_DIST_PATH=$INSTALL_DIR/dist"
ExecStart=$INSTALL_DIR/license-server
Restart=on-failure
RestartSec=5
LimitNOFILE=65535
MemoryLimit=256M
OOMScoreAdjust=-100

[Install]
WantedBy=multi-user.target
EOF

# 启动服务
echo "🔄 启动服务..."
systemctl daemon-reload
systemctl enable license-server
systemctl start license-server

# 等待服务启动
sleep 5

# 检查状态
if systemctl is-active --quiet license-server; then
  # 重置管理员密码（确保密码与配置文件一致）
  echo "🔐 重置管理员密码..."
  ADMIN_TOKEN=$(curl -s -X POST "http://127.0.0.1:18888/api/admin/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"admin\",\"password\":\"$ADMIN_PASSWORD\"}" \
    | grep -o '"token":"[^"]*' | cut -d'"' -f4)

  if [ -n "$ADMIN_TOKEN" ]; then
    echo "✅ 密码重置成功"
  else
    echo "⚠️  密码重置失败，请检查服务状态"
  fi

  echo ""
  echo "✅ 安装完成！"
    echo ""
    echo "📋 重要信息："
    echo "   管理后台地址：http://服务器 IP:18888"
    echo "   管理员账号：admin"
    echo "   管理员密码：$ADMIN_PASSWORD"
    echo ""
    echo "⚠️  请妥善保管管理员密码！"
    echo ""
    echo "📝 常用命令："
    echo "   查看状态：systemctl status license-server"
    echo "   重启服务：systemctl restart license-server"
    echo "   查看日志：journalctl -u license-server -f"
else
    echo "❌ 服务启动失败，请检查日志："
    echo "   journalctl -u license-server -n 50"
    exit 1
fi
