# mailcow 更新运维手册（netcup-b）

> 适用主机：`netcup-b`（邮件主机 `mail.xh.do`；主机 IP 见 `~/.ssh/config`，不写入仓库）
> 工具：`/usr/local/bin/mailcow-update`（仓库源文件 `scripts/mailcow-update.sh`）
> 最后更新：2026-10-11（2026-09a 更新事故之后）

---

## 0. 一句话

**不要直接跑 `./update.sh`。跑 `mailcow-update`。**

直接跑 `update.sh` 会在「容器已经全停、新的还没起来」的窗口里失败，而且**退出码仍然是 0**，失败是静默的。2026-10-11 更新到 2026-09a 时就这样把邮件打断了约 100 秒。

---

## 1. 为什么（根因）

mailcow 的 `update.sh` 内部做的是 `docker compose down` + `docker compose up -d`。`down` 会**删除** `mailcowdockerized_mailcow-network` 这个网络。

而 `/opt/linuxdo-bridge` 这个容器（linux.do OIDC 登录桥，要给 webmail 提供 `https://webmail.xh.do/linuxdo` 登录）在它自己的 compose 里把这个网络声明成 **external**，因为容器内要用 `https://nginx-mailcow:3005` 调 mailcow API：

```yaml
# /opt/linuxdo-bridge/docker-compose.yml
networks:
  mailcow:
    external: true
    name: mailcowdockerized_mailcow-network
```

**不属于 mailcow compose 项目的容器挂在这个网络上，就会阻塞网络删除**，于是：

```
Network mailcowdockerized_mailcow-network Removing
Container mailcowdockerized-netfilter-mailcow-1 Creating
network:mailcow-network Error response from daemon: error while removing network:
  network mailcowdockerized_mailcow-network has active endpoints (name:"linuxdo-bridge")
Network mailcowdockerized_mailcow-network Error error during connect: ... networks/create:
  Error response from daemon: error while removing network: ... has active endpoints
```

网络删不掉也建不回来 → `up -d` 整体中止 → **18 个容器一个都没起来**。
`update.sh` 没有 `set -e`，所以最后仍然 `exit 0` —— 看日志才发现，看退出码看不出来。

**结论**：更新的正确姿势是「先把桥摘下来 → 更新 → 再把桥接回去 → 验证」。`mailcow-update` 就是把这件事固化成脚本。

---

## 2. 日常用法

```bash
mailcow-update              # 完整安全更新：摘桥 → update.sh → 兜底起栈 → 接桥 → 验证
mailcow-update --backup     # 同上，并在更新前做一次在线备份（不停服）
mailcow-update --repair     # 不更新，只把「栈 + 桥」恢复到可用状态（出事时用这个）
mailcow-update --verify     # 只读体检，不改任何东西（日常巡检用）
mailcow-update --help
```

| 退出码 | 含义 |
|---|---|
| `0` | 全部正常 |
| `1` | **更新过程失败，但服务已恢复到可用状态** —— 去看 `update-*.log` |
| `2` | 验证有关键项失败（或收尾时桥没接回来）—— 需要人工介入 |
| `3` | 预检失败（非 root / 找不到 docker / 找不到 mailcow 目录） |

日志：`/var/log/mailcow-update/`

```
20261011-121452-update.log        # 本次运行的完整输出
update-20261011-121452.log        # update.sh 自己的完整输出（tail -20 会打到屏幕）
pre-update-20261011-121311.txt    # 更新前的 git HEAD / 容器 / 镜像 / 卷快照
```

失败时第一批要看的东西：

```bash
tail -50 $(ls -t /var/log/mailcow-update/update-*.log | head -1)
```

---

## 3. 脚本具体做了哪 7 步

1. **预检**：root、docker、`/opt/mailcow-dockerized/mailcow.conf`、`update.sh` 存在。
2. **记录快照**：`git HEAD`、`git describe --tags`、容器列表（名字/镜像/状态）、卷列表 → `pre-update-*.txt`。
3. **可选备份**（`--backup`）：`MAILCOW_BACKUP_LOCATION=/opt/mailcow-backup ./helper-scripts/backup_and_restore.sh backup all`（在线，不停服）。
4. **摘桥**：`docker network disconnect -f mailcowdockerized_mailcow-network linuxdo-bridge`（若它本来就不在网络上则跳过）。
5. **跑更新**：`printf 'y\ny\ny\n' | script -qec "./update.sh" /dev/null`
   —— 喂确认答案；用 `script` 分配 pty，避免它内部 `read < /dev/tty` 的分支卡死。
6. **兜底起栈**：比较「运行中的容器数」和 `docker compose config --services` 的服务数；不够就 `docker compose up -d`，然后轮询（最多 40×3s）直到齐。
   —— **这一步就是今天那个事故的解药**。
7. **接桥 + 验证**：`cd /opt/linuxdo-bridge && docker compose up -d`（成功则不再重建），然后跑第 5 节的验证清单。
   另外有 `trap ... EXIT`：**无论怎么退出（包括 Ctrl-C、中途报错），都不会让桥停在断网状态**。

---

## 4. 手动做（脚本不可用时）

```bash
# 1) 备份（可选，但更新前建议）
cd /opt/mailcow-dockerized
MAILCOW_BACKUP_LOCATION=/opt/mailcow-backup ./helper-scripts/backup_and_restore.sh backup all

# 2) 先摘桥
docker network disconnect -f mailcowdockerized_mailcow-network linuxdo-bridge

# 3) 更新（会问一次 y）
cd /opt/mailcow-dockerized && ./update.sh

# 4) 不管 update.sh 说什么，先确认栈起来了
cd /opt/mailcow-dockerized
docker compose ps --format '{{.Name}}\t{{.Status}}'
# 如果容器不满 18 个：
docker compose up -d

# 5) 接桥（普通启动失败时再加 --force-recreate）
cd /opt/linuxdo-bridge && docker compose up -d

# 6) 验证（见下一节）
mailcow-update --verify
```

---

## 5. 更新后验证清单

一条命令全跑：`mailcow-update --verify`。它检查的是：

| 检查 | 期望 |
|---|---|
| mailcow 容器数 | `18/18`（= `docker compose config --services` 的数量） |
| 邮件端口 | 25 / 110 / 143 / 465 / 587 / 993 / 995 / 4190 都在 `ss -ltn` 里 |
| MTA-STS 策略 | 本机经 stunnel（`:3002`）取 `/.well-known/mta-sts.txt` → **200** |
| mailcow web UI | 本机 `:3002` → **200** |
| linuxdo-bridge | 容器 running、**已接在 mailcow 网络**、`127.0.0.1:3007` → 200、health healthy |
| 邮件队列 | `Mail queue is empty` |
| **端口转发目标** | nft 里所有 `dnat to <ip>` 的 IP 都还有容器在跑 |

最后一项是重点：mailcow 把容器 IP **硬编码**进 nft 转发规则（`25/110/143/... → 172.22.1.253 / 172.22.1.250`）。容器如果在别的 IP 上回来，端口就转发到空处，**邮件静默失效**。

手工验一次真实投递（最可靠）：

```bash
docker exec -i mailcowdockerized-postfix-mailcow-1 sendmail -f postmaster@xh.do postmaster@xh.do <<'MSG'
From: postmaster@xh.do
To: postmaster@xh.do
Subject: delivery check

test
MSG
sleep 8
docker logs --since 2m mailcowdockerized-postfix-mailcow-1 2>&1 | grep 'status=sent' | tail -1
docker logs --since 2m mailcowdockerized-dovecot-mailcow-1 2>&1 | grep 'stored mail' | tail -1
```

期望：`postfix/lmtp ... relay=dovecot[172.22.1.250]:24 ... status=sent` 和 `sieve: ... stored mail into mailbox`。

出站方向连通性（不真的发信）：

```bash
docker exec mailcowdockerized-postfix-mailcow-1 sh -c \
  'echo | timeout 15 openssl s_client -connect gmail-smtp-in.l.google.com:25 -starttls smtp 2>/dev/null | grep -E "Verify return code|Protocol"'
```

---

## 6. 故障速查

| 症状 | 原因 | 处理 |
|---|---|---|
| `error while removing network ... has active endpoints (name:"linuxdo-bridge")` | 桥挂在 mailcow 网络上，compose 删不掉网络 | 摘桥后 `docker compose up -d`：`docker network disconnect -f mailcowdockerized_mailcow-network linuxdo-bridge` |
| `docker compose up -d` 之后 `docker ps` 里 mailcow 容器**一个都没有** | 上面那个错误导致 up 整体中止 | `mailcow-update --repair`，或手动 `cd /opt/mailcow-dockerized && docker compose up -d` |
| 桥启动报 `failed to set up container networking: Address already in use` | 容器网络配置里**被钉死了某个 IP**（历史上手工 `docker network connect --ip X` 留下的），而该 IP 已被别人占用 | `cd /opt/linuxdo-bridge && docker compose up -d --force-recreate`（重建容器才能清掉钉死的 IP） |
| `mailcow-update --verify` 报「桥在跑但没接在 mailcowdockerized_mailcow-network 上」 | 摘桥后没接回来 | `cd /opt/linuxdo-bridge && docker compose up -d` |
| 报「转发规则指向的 `<ip>` 上没有容器」 | 容器换了 IP，nft 规则还指着旧的 | `cd /opt/mailcow-dockerized && docker compose restart netfilter-mailcow`；仍不对就 `docker compose down && docker compose up -d`（**先摘桥**） |
| 端口 25/993 没在监听 | postfix/dovecot 没起来或挂了 | `docker compose ps` → `docker compose logs --tail 50 postfix-mailcow` |
| MTA-STS / web UI 本机 200 但公网不通 | 不是 mailcow 的问题，看 Cloudflare 侧（Origin Rule 目标端口 3002、边缘证书是否覆盖 `mta-sts.xh.do`） | `curl -sS -D - https://mta-sts.xh.do/.well-known/mta-sts.txt` |

**出事时先做的两件事**（比找原因优先）：

```bash
mailcow-update --repair      # 把栈和桥恢复到可用状态
mailcow-update --verify      # 确认 18/18、端口在听、队列为空
```

---

## 7. 回滚

### 7.1 回滚 mailcow 版本

更新不会删旧镜像（`update.sh` 结尾的 GC 默认跳过），所以**镜像级回滚很快**：

```bash
cd /opt/mailcow-dockerized
git log --oneline -5                  # 找到 "After update on ..." 之前的提交
git checkout <上一个稳定提交>          # 或用 tag：git checkout 2026-09
docker compose pull && docker compose up -d
```

已确认留在本机的旧镜像（2026-10-11 检查）：

```
ghcr.io/mailcow/rspamd:4.1.4-1
ghcr.io/mailcow/postfix-tlspol:1.11.0
```

只回滚某一个组件：改 `docker-compose.yml` 里对应的 `image:` 行，然后 `docker compose up -d`。
**注意**：`docker-compose.yml` 是 git 跟踪文件，下次更新会被上游覆盖/合并（`-X theirs`）—— 改之前先记下来。

### 7.2 从备份恢复

备份位置：`/opt/mailcow-backup/mailcow-<日期>/`（含 `backup_vmail.tar.zst`、`backup_mariadb.tar.zst`、`backup_redis/rspamd/postfix/crypt.tar.zst`、`mailcow.conf`），另有 `data-conf-<日期>.tar.gz`（`data/conf` 全量，**包含未被 git 跟踪的 `custom_header_checks.pcre`**）。

```bash
cd /opt/mailcow-dockerized
MAILCOW_BACKUP_LOCATION=/opt/mailcow-backup ./helper-scripts/backup_and_restore.sh restore
# 按提示选恢复点、选数据集；恢复 mysql/vmail 时脚本会把 mailcow 停下来
```

---

## 8. 备份（当前是个缺口，建议补上）

截至 2026-10-11：**这台机器上没有任何定时备份**（`/etc/cron.d` 里只有 `postwhite`、`cf-origin-allowlist` 等，没有 mailcow 备份）。
而 `vmail` 卷只有约 2.7 MB —— 整台邮件服务的用户数据不到 3 MB，却没有自动备份。

建议的 cron（在线备份，不停服；`--delete-days 30` 保留 30 天）：

```cron
# /etc/cron.d/mailcow-backup
30 3 * * * root cd /opt/mailcow-dockerized && MAILCOW_BACKUP_LOCATION=/opt/mailcow-backup ./helper-scripts/backup_and_restore.sh backup all --delete-days 30 >/dev/null 2>&1
```

或者直接用包装脚本：`mailcow-update --backup` 会在每次更新前顺带备份一次。

---

## 9. 结构性替代方案（文档化，未实施）

现在的做法是「更新时摘桥」。如果想从根上消除这个耦合，有两条路：

| 方案 | 做法 | 代价 |
|---|---|---|
| **把 mailcow 网络声明为 external** | 在 `/opt/mailcow-dockerized/` 放一个 `docker-compose.override.yml`，把 `networks.mailcow-network` 覆盖成 `external: true; name: mailcowdockerized_mailcow-network`，网络改为预先 `docker network create` 一次 | `down` 不再删网络，linuxdo-bridge 不再是障碍。但网络若被误删，compose **不会**重建，需要人工 `docker network create`（含固定 subnet `172.22.1.0/24`） |
| **让 linuxdo-bridge 不再需要 mailcow 网络** | 把它的 `mailcow api` 地址从 `https://nginx-mailcow:3005` 改成宿主机可达的入口（如 `http://127.0.0.1:3005`），它就能挂在自己的网络上 | 最干净，但要改 `/opt/linuxdo-bridge` 的配置/代码并回归测试 OIDC 登录 |

在决定之前，**第 2 节那个包装脚本已经足够兜住**这个故障模式。

---

## 10. 速查表

| 项目 | 值 |
|---|---|
| 邮件主机 | `netcup-b`（IP 见 `~/.ssh/config`，不入库） |
| mailcow 目录 | `/opt/mailcow-dockerized` |
| linuxdo-bridge 目录 | `/opt/linuxdo-bridge` |
| compose 项目名 | `mailcowdockerized` |
| docker 网络 | `mailcowdockerized_mailcow-network`（subnet `172.22.1.0/24`） |
| 容器静态 IP | sogo `.248` · redis `.249` · dovecot `.250` · postfix `.253` · unbound `.254` |
| 应用（xh.do 主页） | `:3001`，stunnel `:3000` |
| mailcow web（stunnel） | `:3002` → `:3012` → docker-published `:3005` |
| linuxdo-bridge | `127.0.0.1:3007 → 8080`，OIDC 入口 `https://webmail.xh.do/linuxdo` |
| 现役版本 | mailcow `2026-09a`（git `3b556ca5`，tag 提交 `81f6f7b0`） |
| rspamd / tlspol | `4.2.1-1` / `1.14.0` |
| 备份位置 | `/opt/mailcow-backup/` |
| 更新日志 | `/var/log/mailcow-update/` |
| 自定义 postfix 配置 | `data/conf/postfix/main.cf`（`inet_protocols=ipv4`、`postscreen_dnsbl_sites` 17 条）+ **未跟踪**的 `data/conf/postfix/custom_header_checks.pcre` |

---

## 11. 改这个脚本

仓库里的 `scripts/mailcow-update.sh` 是**源头**，服务器上的 `/usr/local/bin/mailcow-update` 是部署副本。改完要重新部署：

```bash
# 在仓库目录
scp scripts/mailcow-update.sh netcup-b:/tmp/mu.sh
ssh netcup-b 'tr -d "\r" < /tmp/mu.sh > /usr/local/bin/mailcow-update && \
              chmod 755 /usr/local/bin/mailcow-update && rm -f /tmp/mu.sh && \
              bash -n /usr/local/bin/mailcow-update && \
              sha256sum /usr/local/bin/mailcow-update'
```

（`tr -d '\r'` 不能省：脚本必须是 LF 行尾，否则 bash 会报 `\r: command not found`。）

自测方式：用 `MAILCOW_UPDATE_CMD` 替换第 5 步要跑的命令，可以不动真格地演练全流程：

```bash
MAILCOW_UPDATE_CMD=true   mailcow-update   # 期望 exit 0
MAILCOW_UPDATE_CMD=false  mailcow-update   # 期望 exit 1，但服务仍然健康
MAILCOW_UPDATE_CMD='docker compose stop postfix-mailcow dovecot-mailcow' mailcow-update
                                           # 演练"栈被打挂"→ 兜底自动恢复 → exit 1
```

这三条在 2026-10-11 都实跑验证过：happy path `exit 0`；失败路径 `exit 1` 且服务健康；第三条能检测出 `16/18` 并自动 `up -d` 恢复回 `18/18`。
