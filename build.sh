# 构建前端
cd frontend
npm install
npm run build

# 构建后端
cd ..
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o license-server-linux-amd64 -ldflags="-s -w" ./cmd
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -o license-server-linux-arm64 -ldflags="-s -w" ./cmd

echo "✅ 构建完成"
echo "前端构建产物：frontend/dist/"
echo "后端二进制：license-server-linux-*.amd64"
