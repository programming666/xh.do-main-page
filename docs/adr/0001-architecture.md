# ADR 0001

- Status: Accepted
- Context: `xh.do` 需要一个可在线更新内容的个人主页，而不是传统静态站。
- Decision: 采用 `Next.js + Prisma + Better Auth + next-intl + next-themes` 单仓全栈方案。
- Consequences: 公开站、后台、API、鉴权统一在一个工程内，维护成本低；后续可从 SQLite 升级到 PostgreSQL。
