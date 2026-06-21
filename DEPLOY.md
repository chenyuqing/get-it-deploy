# Vercel 部署指南

本指南帮助你将 Get It 部署到 Vercel + Supabase。

## 前置准备

### 1. 注册账号（全部免费）

- [GitHub](https://github.com) — 代码托管
- [Vercel](https://vercel.com/signup) — 部署平台（用 GitHub 登录）
- [Supabase](https://supabase.com) — 数据库 + 文件存储（用 GitHub 登录）

### 2. 推送代码到 GitHub

```bash
git push origin feature/vercel-deploy
```

---

## 第一步：配置 Supabase

### 1.1 创建项目

1. 登录 [supabase.com](https://supabase.com)
2. 点击 **New Project**
3. 填写：
   - **Name**: `get-it`
   - **Database Password**: 设一个强密码（记住它）
   - **Region**: 选 `Hong Kong`（离中国最近）
4. 点击 **Create new project**，等待 2-3 分钟

### 1.2 获取连接信息

项目创建后，进入 **Project Settings > Database**：

- **Connection string** → 复制 `URI` 模式的连接串
  ```
  postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres
  ```

进入 **Project Settings > API**：

- **Project URL** → 复制（形如 `https://xxx.supabase.co`）
- **anon public** key → 复制
- **service_role** key → 复制（点击 "Reveal" 显示）

### 1.3 创建存储桶

进入 **Storage**：

1. 点击 **New bucket**
2. 名称填 `documents`
3. **Public bucket** 不勾选（私有）
4. 点击 **Create bucket**

---

## 第二步：配置 Vercel

### 2.1 导入项目

1. 登录 [vercel.com](https://vercel.com)
2. 点击 **Add New... > Project**
3. 选择你的 GitHub 仓库 `get-it`
4. **Branch**: 选择 `feature/vercel-deploy`
5. 点击 **Import**

### 2.2 配置环境变量

在 Vercel 项目设置页面，点击 **Environment Variables**，添加以下变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `DATABASE_URL` | `postgresql://postgres:[密码]@db.[项目ID].supabase.co:5432/postgres` | Supabase 数据库连接串 |
| `SUPABASE_URL` | `https://[项目ID].supabase.co` | Supabase 项目 URL |
| `SUPABASE_ANON_KEY` | `eyJ...` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Supabase service_role key |
| `CUSTOM_API_BASE_URL` | `https://api.bluesminds.com/v1` | 你的 LLM API 地址 |
| `CUSTOM_API_KEY` | `sk-o4217V8gjNZ0YBsqDLFJiU5FldbH6Yw0XCs4hqWx0vZwlJH6` | 你的 API Key |
| `CUSTOM_MODEL` | `gpt-5.5` | 使用的模型 |
| `USER_PASSWORDS` | `tim:apple123,guest:demo2024` | 用户密码（格式：用户名:密码,用户名2:密码2） |
| `NEXTAUTH_SECRET` | 运行 `openssl rand -base64 32` 生成 | 会话加密密钥 |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` | 你的 Vercel 域名（先随便填，部署后再改） |

### 2.3 部署

1. 环境变量填完后，点击 **Deploy**
2. 等待 3-5 分钟
3. 部署成功后，会给你一个网址，如 `https://get-it-xxx.vercel.app`

### 2.4 更新 NEXTAUTH_URL

1. 复制 Vercel 给你的网址
2. 回到 **Environment Variables**
3. 编辑 `NEXTAUTH_URL`，改成你的网址
4. 点击 **Redeploy** 重新部署

---

## 第三步：初始化数据库

部署成功后，需要初始化数据库表结构：

### 3.1 本地运行迁移（推荐）

```bash
# 1. 安装依赖（如果还没装）
npm install

# 2. 创建 .env.local 并填入 Supabase 的 DATABASE_URL
echo "DATABASE_URL=postgresql://postgres:[密码]@db.[项目ID].supabase.co:5432/postgres" > .env.local

# 3. 运行数据库迁移
npx prisma migrate deploy

# 4. 生成 Prisma Client
npx prisma generate
```

### 3.2 或在 Supabase SQL Editor 执行

进入 Supabase 项目 → **SQL Editor** → 新建查询，粘贴并执行：

```sql
-- 用户表
CREATE TABLE "User" (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- 文档表
CREATE TABLE "Document" (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  "pdfUrl" TEXT NOT NULL,
  "uploadedAt" TIMESTAMP DEFAULT NOW(),
  "numPages" INTEGER,
  "lastOpenedAt" TIMESTAMP
);

-- 标签/可视化表
CREATE TABLE "Tag" (
  id TEXT PRIMARY KEY,
  "documentId" TEXT NOT NULL REFERENCES "Document"(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  page INTEGER NOT NULL,
  spec JSONB,
  ready BOOLEAN DEFAULT false,
  "isPublic" BOOLEAN DEFAULT false
);

-- 分享表
CREATE TABLE "Share" (
  id TEXT PRIMARY KEY,
  "documentId" TEXT NOT NULL REFERENCES "Document"(id) ON DELETE CASCADE,
  "shareCode" TEXT UNIQUE NOT NULL,
  "tagIds" TEXT[],
  "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_document_user ON "Document"("userId");
CREATE INDEX idx_tag_document ON "Tag"("documentId");
CREATE INDEX idx_share_code ON "Share"("shareCode");
```

---

## 第四步：访问应用

打开 `https://your-app.vercel.app`，你会看到登录页。

用你在 `USER_PASSWORDS` 里配置的账号登录：
- 用户名：`tim`
- 密码：`apple123`

---

## 常见问题

### Q: 国内访问 Vercel 很慢怎么办？

**A:** Vercel 在国内未被墙但速度慢。可以：
1. 使用 Cloudflare CDN 加速（需要域名）
2. 或接受慢一点的体验（免费的代价）

### Q: Supabase 连接超时？

**A:** Supabase API 在国内不稳定。检查：
1. `DATABASE_URL` 是否正确（密码、项目 ID）
2. Supabase 项目是否在运行（Dashboard 里查看）
3. 尝试切换网络（4G/5G 比部分宽带更稳定）

### Q: 部署后报错 "Prisma Client not found"？

**A:** 在 Vercel 项目设置 → **General** → **Build & Development Settings**：
- **Build Command**: 改为 `npx prisma generate && npm run build`

### Q: 如何添加新用户？

**A:** 在 Vercel 项目设置 → **Environment Variables**：
1. 编辑 `USER_PASSWORDS`
2. 添加新用户，如：`tim:apple123,guest:demo2024,alice:hello123`
3. 保存后会自动重新部署

### Q: 如何查看数据库内容？

**A:** 进入 Supabase 项目 → **Table Editor**，可以查看和编辑所有数据。

---

## 成本估算

| 服务 | 免费额度 | 超出后 |
|------|---------|--------|
| Vercel | 100 GB 流量/月 | $20/月起 |
| Supabase | 500 MB 数据库<br>1 GB 文件存储 | $25/月起 |
| BluesMind API | 取决于你的套餐 | 按调用计费 |

**小范围使用（< 50 用户）基本不会超免费额度。**

---

## 下一步

部署成功后，考虑：
1. **绑定自定义域名**（Vercel 项目设置 → Domains）
2. **配置 Cloudflare CDN**（加速国内访问）
3. **设置使用限额**（防止 API 被刷爆）

有问题随时查看 Vercel 和 Supabase 的部署日志。
