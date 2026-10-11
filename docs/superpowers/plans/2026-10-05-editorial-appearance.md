# 编辑式主页与可配置外观实现计划

> **面向 AI 代理的工作者：** 按任务在隔离工作区实现，使用 Node 内置测试与 tsx 验证配置行为；不自动提交或部署。

**目标：** 将公共站点改为编辑式布局，并提供独立的整页背景与布局配置。

**架构：** SiteSettings 增加一个经过 Zod 校验的 appearance JSON 字符串。读取时解析并回退默认值；API 对 appearance 深度合并补丁后完整校验。公共页面使用共享 SiteChrome 提供分主题变量与背景，后台使用独立外观表单，不继承公共图片背景。

**技术栈：** Next.js 16 App Router、React 19、Prisma SQLite、Zod、next-intl、Node test runner + tsx。

## 文件职责

- `src/lib/appearance.ts`：默认值、完整/补丁 schema、深合并、模块可见性、背景样式。
- `src/lib/string-validation.ts`：复用现有输入清洗规则。
- `src/lib/validation.ts`、`src/app/api/admin/site/route.ts`、`src/lib/site-data.ts`：接通读取、验证、合并与保存。
- `prisma/schema.prisma`、新 migration：持久化外观字段，旧数据采用默认外观。
- `src/components/site-chrome.tsx`、`src/app/editorial.css`：公共背景、导航、页脚与编辑式样式。
- `src/app/[locale]/page.tsx`、`friends/page.tsx`、`src/components/home/project-card.tsx`：布局与列表/卡片呈现。
- `src/components/admin/appearance-settings-form.tsx`、`appearance-theme-fields.tsx`、`src/app/[locale]/admin/content/appearance/page.tsx`：配置与上传。
- `src/components/admin/admin-shell.tsx`、语言消息文件：后台入口与中英文标签。
- `tests/appearance.test.ts`：默认值、非法输入、深合并、背景与模块行为。

## 任务

### 1. 配置领域与失败测试
- [x] 编写配置测试，执行 `npx tsx --test tests/appearance.test.ts`，确认缺少实现时失败。
- [x] 实现 schema、默认值与合并函数：
  ```ts
  const next = mergeAppearance(readAppearance(existing.appearance), patch.appearance);
  const complete = appearanceSchema.parse(next);
  ```
- [x] 覆盖不安全 URL、视频后缀、无效颜色、越界遮罩、未知/重复模块、深浅主题独立、清空图片。

### 2. 数据链路
- [x] 添加 `appearance String @default("{}")`，在独立开发数据库运行 `npx prisma migrate dev --name editorial_appearance`。
- [x] API 的合并对象、update/create 同步增加字段；GET 保留数据库返回，页面通过 readAppearance 解析。
- [x] 验证仅更新旧字段不改变外观，仅更新一个主题不改变另一主题。

### 3. 公共 UI
- [x] 公共 shell 使用 scoped CSS 变量，不改变后台配色。
- [x] 首页采用大字图文首屏，保留 TechBackground 所有既有 props，模块按配置过滤排序。
- [x] 公共导航过滤隐藏锚点；CTA 若指向隐藏模块也不渲染。
- [x] 列表/卡片项目共享内容与链接行为；友链页沿用 shell。
- [x] 增加安全的整页图片 CSS 表达式，CSP 仅扩大 img-src 到 HTTP/HTTPS，以支持已批准的图片链接；其他媒体、脚本及 optimizer allowlist 不变。

### 4. 后台配置
- [x] 外观配置页使用 requireAdminPageWith2FA，并只发送 appearance 补丁到现有受保护 API。
- [x] 两主题分别编辑背景、正文、强调色、渐变与图片；图片上传用 backgrounds kind，客户端限定图片，服务端保存配置拒绝视频 URL。
- [x] 控制模块顺序/开关、首屏左右比例、项目样式、页面宽度密度；显示本地布局示意。
- [x] 上传和保存互斥禁用，失败保留输入并显示错误，成功提示 ISR 延迟。

### 5. 验证
- [x] `npx tsx --test tests/appearance.test.ts` 全部通过。
- [x] `npm run lint` 和 `npm run build`，记录实际输出。
- [x] 浏览器检查中文/英文、360px/桌面、主题切换、后台未授权拒绝。
- [x] 在隔离数据库验证 appearance 持久化与不同布局，再恢复隔离测试设置。
- [x] `git diff --check`，记录所有修改与未完成验证，不提交 Git。

## 执行说明

代理服务多次失败后改为在主工作目录的 `feat/editorial-appearance` 分支内联执行；未提交或推送。迁移生成、非破坏性应用、浏览器验证与现有限制见 [验证记录](2026-10-06-editorial-verification.md)。
