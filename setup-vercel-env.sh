#!/bin/bash
# Vercel 环境变量设置脚本

echo "=== Vercel 环境变量设置 ==="
echo ""
echo "请准备好以下信息："
echo "1. Supabase Database URL (从 Project Settings → Database → Connection string)"
echo "2. Supabase URL (从 Project Settings → API)"
echo "3. Supabase Anon Key (从 Project Settings → API)"
echo "4. Supabase Service Role Key (从 Project Settings → API)"
echo "5. NEXTAUTH_SECRET (运行 openssl rand -base64 32 生成)"
echo ""

# 固定的 LLM API 配置
CUSTOM_API_BASE_URL="https://api.bluesminds.com/v1"
CUSTOM_API_KEY="sk-o4217V8gjNZ0YBsqDLFJiU5FldbH6Yw0XCs4hqWx0vZwlJH6"
CUSTOM_MODEL="gpt-5.5"

echo "LLM API 配置（已预设）："
echo "  CUSTOM_API_BASE_URL=$CUSTOM_API_BASE_URL"
echo "  CUSTOM_API_KEY=$CUSTOM_API_KEY"
echo "  CUSTOM_MODEL=$CUSTOM_MODEL"
echo ""

# 读取 Supabase 配置
read -p "Supabase Database URL: " DATABASE_URL
read -p "Supabase URL: " SUPABASE_URL
read -p "Supabase Anon Key: " SUPABASE_ANON_KEY
read -sp "Supabase Service Role Key: " SUPABASE_SERVICE_ROLE_KEY
echo ""
read -sp "NEXTAUTH_SECRET: " NEXTAUTH_SECRET
echo ""
read -p "USER_PASSWORDS (格式: username:password,user2:pass2): " USER_PASSWORDS
echo ""

# 添加环境变量到 Vercel
echo ""
echo "正在添加环境变量到 Vercel..."

vercel env add DATABASE_URL production <<EOF
$DATABASE_URL
EOF

vercel env add SUPABASE_URL production <<EOF
$SUPABASE_URL
EOF

vercel env add SUPABASE_ANON_KEY production <<EOF
$SUPABASE_ANON_KEY
EOF

vercel env add SUPABASE_SERVICE_ROLE_KEY production <<EOF
$SUPABASE_SERVICE_ROLE_KEY
EOF

vercel env add CUSTOM_API_BASE_URL production <<EOF
$CUSTOM_API_BASE_URL
EOF

vercel env add CUSTOM_API_KEY production <<EOF
$CUSTOM_API_KEY
EOF

vercel env add CUSTOM_MODEL production <<EOF
$CUSTOM_MODEL
EOF

vercel env add USER_PASSWORDS production <<EOF
$USER_PASSWORDS
EOF

vercel env add NEXTAUTH_SECRET production <<EOF
$NEXTAUTH_SECRET
EOF

echo ""
echo "=== 环境变量设置完成 ==="
echo ""
echo "接下来的步骤："
echo "1. 运行 vercel --prod 重新部署"
echo "2. 部署成功后，获取部署 URL"
echo "3. 添加 NEXTAUTH_URL 环境变量（值为部署 URL）"
echo "4. 在 Supabase 创建 storage bucket 'documents'"
echo "5. 运行数据库迁移初始化表结构"
