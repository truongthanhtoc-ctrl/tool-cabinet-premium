# Vercel 迁移说明（从 SiteGround 切换）

## 1. 推送代码到 GitHub
```powershell
git init
git add .
git commit -m "prepare for vercel deploy"
git branch -M main
git remote add origin <你的 GitHub 仓库地址>
git push -u origin main
```

## 2. 在 Vercel 导入项目
1. 登录 Vercel。
2. `Add New -> Project`，选择该 GitHub 仓库。
3. Framework 选择 `Vite`（本项目已配置好 `vercel.json`）。
4. 直接 Deploy。

## 3. 配置环境变量（如果要启用询盘 API）
在 Vercel 项目设置 `Settings -> Environment Variables` 添加：
- `RESEND_API_KEY`
- `NOTIFY_EMAIL`
- `ADMIN_API_KEY`（可选）
- `CORS_ORIGIN`（建议填：`https://www.swtoolstorage.com,https://swtoolstorage.com`）
- `MAX_UPLOAD_SIZE_BYTES`（可选，默认 5MB）

## 4. 绑定域名 `swtoolstorage.com`
1. 在 Vercel 项目 `Settings -> Domains` 添加：
   - `swtoolstorage.com`
   - `www.swtoolstorage.com`
2. 按 Vercel 页面提示去 GoDaddy 配置 DNS（以 Vercel 面板给出的记录为准）。

## 5. 切换完成后
- 验证首页和内页访问。
- 验证表单提交（如已配置 Resend）。
- SiteGround 可暂时保留 3-7 天观察，确认稳定后再彻底停用。

## 说明
- 项目已改为支持 Vercel Serverless API。
- `api/quotes` 在 Serverless 下默认不做持久化存储；如需后台长期保存，请接数据库（Vercel Postgres / Supabase 等）。
