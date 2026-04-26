#!/bin/bash

echo "🗑️ 开始卸载授权服务..."

# 停止并禁用服务
if systemctl list-units --full -all | grep -Fq "license-server.service"; then
    echo "🛑 停止服务..."
    systemctl stop license-server 2>/dev/null
    systemctl disable license-server 2>/dev/null
fi

# 删除服务文件
if [[ -f "/etc/systemd/system/license-server.service" ]]; then
    rm -f "/etc/systemd/system/license-server.service"
    echo "🧹 删除服务文件"
fi

# 删除安装目录
INSTALL_DIR="/opt/license-server"
if [[ -d "$INSTALL_DIR" ]]; then
    rm -rf "$INSTALL_DIR"
    echo "🧹 删除安装目录：$INSTALL_DIR"
fi

# 删除数据目录（可选，默认保留）
read -p "是否删除数据目录 (/var/lib/license-server)？数据将永久丢失 (y/N): " confirm
if [[ "$confirm" == "y" || "$confirm" == "Y" ]]; then
    rm -rf /var/lib/license-server
    echo "🧹 删除数据目录"
fi

# 重载 systemd
systemctl daemon-reload

echo ""
echo "✅ 卸载完成"
