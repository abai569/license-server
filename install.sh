#!/bin/bash

set -e

echo "🚀 开始安装授权服务..."

# 安装目录
INSTALL_DIR="/opt/license-server"
DATA_DIR="/var/lib/license-server"

# 创建目录
mkdir -p "$INSTALL_DIR" "$DATA_DIR"

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
curl -L "$RELEASE_URL" -o "$INSTALL_DIR/license-server"
chmod +x "$INSTALL_DIR/license-server"

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
ExecStart=$INSTALL_DIR/license-server
Restart=on-failure
RestartSec=5
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

# 启动服务
echo "🔄 启动服务..."
systemctl daemon-reload
systemctl enable license-server
systemctl start license-server

# 检查状态
sleep 2
if systemctl is-active --quiet license-server; then
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
