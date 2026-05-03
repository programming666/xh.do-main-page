# xh.do Main Page

这是一个支持在线内容管理的个人主页项目，包含：

- 多语言：`zh` / `en`
- 明暗主题：`light` / `dark`
- 管理后台：密码登录 + TOTP 2FA
- 媒体管理：Logo、背景图片、背景视频支持上传或外链
- 项目管理：项目新增、编辑、删除

## 快速开始

```bash
copy .env.example .env
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

如果本地端口不是 `3000`，请同步修改 `.env` 中的 `BETTER_AUTH_URL`。

默认后台账号来自 `.env`：

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

## 说明

- 主页地址：`/zh` 或 `/en`
- 后台地址：`/zh/admin/login` 或 `/en/admin/login`
- 上传文件会落到 `public/uploads/*`
