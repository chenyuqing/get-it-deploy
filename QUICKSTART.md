# 快速部署指南

完成 Vercel + Supabase 多用户部署版本的代码已准备就绪。

## ✅ 已完成的功能

1. **多用户隔离** — 每个用户独立数据空间
2. **密码登录** — 通过环境变量配置用户
3. **云端存储** — Supabase Storage 替代本地文件系统
4. **数据库** — PostgreSQL (Prisma ORM)
5. **公开分享** — 生成短链接分享可视化
6. **Vercel 部署** — 一键部署配置

## 🚀 下一步操作

### 1. 推送代码到 GitHub

```bash
# 推送到 GitHub
git push origin feature/vercel-deploy

# 或者如果是新仓库
git push -u origin feature/vercel-deploy
```

### 2. 按照 DEPLOY.md 操作

打开 `DEPLOY.md` 文件，按步骤：

1. **注册 Supabase** — 创建数据库 + 存储
2. **配置 Vercel** — 导入项目 + 设置环境变量
3. **初始化数据库** — 运行 SQL 创建表
4. **访问应用** — 用配置的密码登录

完整步骤都在 `DEPLOY.md` 里，预计 **20-30 分钟**完成。

## 📂 关键文件说明

| 文件 | 作用 |
|------|------|
| `DEPLOY.md` | 完整部署指南（必读） |
| `.env.template` | 环境变量模板 |
| `vercel.json` | Vercel 部署配置 |
| `prisma/schema.prisma` | 数据库表结构 |
| `lib/auth.ts` | 用户认证逻辑 |
| `lib/storage.ts` | Supabase 文件存储 |
| `app/login/page.tsx` | 登录页面 |
| `app/share/[shareCode]/*` | 公开分享页面 |

## 🔐 用户管理

在 Vercel 环境变量里配置 `USER_PASSWORDS`：

```
USER_PASSWORDS=tim:your-password,alice:hello123,guest:demo2024
```

格式：`用户名:密码,用户名2:密码2`

## 💰 成本

- **Vercel**: 免费（100 GB 流量/月）
- **Supabase**: 免费（500 MB 数据库 + 1 GB 存储）
- **API**: 取决于你的 BluesMind 套餐

小规模使用（< 50 用户）完全免费。

## ⚠️ 注意事项

1. **国内访问慢** — Vercel 在国内未被墙但速度慢，可接受
2. **Supabase 不稳定** — 连接偶尔超时，多试几次
3. **API 余额** — 确保 BluesMind API 有余额

## 🛠️ 本地测试

如果想先本地测试再部署：

```bash
# 1. 创建 .env.local（复制 .env.template）
cp .env.template .env.local

# 2. 填入 Supabase 信息（先注册 Supabase）
# 编辑 .env.local

# 3. 初始化数据库
npx prisma migrate dev --name init

# 4. 启动
npm run browser:dev
```

访问 `http://localhost:3000`，会跳转到登录页。

## 🐛 遇到问题？

查看 `DEPLOY.md` 的 **常见问题** 章节。

---

**准备好了就推送代码，开始部署吧！** 🚀
