#!/usr/bin/env bash
#
# mailcow-update — safe wrapper around mailcow's own update.sh.
#
# WHY THIS EXISTS
#   mailcow's update.sh runs `docker compose down` and then `up -d`. `down`
#   removes the mailcow docker network. The `/opt/linuxdo-bridge` container
#   (the linux.do OIDC login bridge) joins that network as an *external*
#   network, because it calls the mailcow API at https://nginx-mailcow:3005.
#   A container that is not part of the compose project blocks the network
#   removal, so `up -d` aborts and the whole stack stays DOWN:
#
#     error while removing network: network
#     mailcowdockerized_mailcow-network has active endpoints
#     (name:"linuxdo-bridge")
#
#   On 2026-10-11 that left mail dead for ~100 seconds during the 2026-09a
#   update, with zero containers running. update.sh still exited 0, so the
#   failure was silent.
#
# WHAT THIS DOES
#   1. preflight + state snapshot
#   2. optional online backup (--backup)
#   3. detach linuxdo-bridge from the mailcow network
#   4. run update.sh
#   5. ALWAYS bring the mailcow stack up, even if step 4 failed
#   6. put linuxdo-bridge back, before verifying (an EXIT trap also covers
#      Ctrl-C / errors, so it can never be left stranded off-network)
#   7. verify containers / mail ports / web / MTA-STS / bridge / queue / DNAT
#
# USAGE
#   mailcow-update                 # full safe update
#   mailcow-update --backup        # same, plus an online backup first
#   mailcow-update --repair        # no update; just get the stack + bridge up
#   mailcow-update --verify        # read-only health check, changes nothing
#   mailcow-update --help
#
# 详细手册：仓库 `docs/ops/mailcow-update.md`（服务器副本 /usr/local/share/mailcow-update.md）
#
#   MAILCOW_UPDATE_CMD=/some/cmd   override step 4 (used by the tests)
#
# Exit codes: 0 ok · 1 update ran but failed (service was restored) ·
#             2 verification failed · 3 preflight failed

set -uo pipefail

MAILCOW_DIR=${MAILCOW_DIR:-/opt/mailcow-dockerized}
BRIDGE_DIR=${BRIDGE_DIR:-/opt/linuxdo-bridge}
BRIDGE_NAME=${BRIDGE_NAME:-linuxdo-bridge}
NETWORK_NAME=${NETWORK_NAME:-mailcowdockerized_mailcow-network}
PROJECT=${PROJECT:-mailcowdockerized}
MAIL_HOST=${MAIL_HOST:-mail.xh.do}
POLICY_HOST=${POLICY_HOST:-mta-sts.xh.do}
LOG_DIR=${LOG_DIR:-/var/log/mailcow-update}
PORTS=${PORTS:-"25 110 143 465 587 993 995 4190"}

MODE=update
DO_BACKUP=0
UPDATE_CMD=${MAILCOW_UPDATE_CMD:-"./update.sh"}
LOG_FILE=""

# ---------------------------------------------------------------- output ----

if [[ -t 1 ]]; then
  C_RESET=$'\033[0m'; C_OK=$'\033[32m'; C_WARN=$'\033[33m'
  C_ERR=$'\033[31m'; C_DIM=$'\033[2m'; C_HDR=$'\033[1;36m'
else
  C_RESET=; C_OK=; C_WARN=; C_ERR=; C_DIM=; C_HDR=
fi

say()  { printf '%s\n' "$*"; }
hdr()  { printf '\n%s==> %s%s\n' "$C_HDR" "$*" "$C_RESET"; }
ok()   { printf '  %s[ ok ]%s %s\n' "$C_OK" "$C_RESET" "$*"; }
warn() { printf '  %s[warn]%s %s\n' "$C_WARN" "$C_RESET" "$*"; }
bad()  { printf '  %s[fail]%s %s\n' "$C_ERR" "$C_RESET" "$*"; }
dim()  { printf '  %s%s%s\n' "$C_DIM" "$*" "$C_RESET"; }

FAILURES=0
CRITICAL_FAILURES=0
fail()  { bad "$*"; FAILURES=$((FAILURES + 1)); }
cfail() { bad "$*"; FAILURES=$((FAILURES + 1)); CRITICAL_FAILURES=$((CRITICAL_FAILURES + 1)); }

# --------------------------------------------------------------- helpers ----

RUNNING() { docker ps -q --filter "name=^${PROJECT}" 2>/dev/null | wc -l | tr -d ' '; }

expected_containers() {
  ( cd "$MAILCOW_DIR" && docker compose config --services 2>/dev/null | wc -l | tr -d ' ' )
}

stack_up() {
  ( cd "$MAILCOW_DIR" && docker compose up -d 2>&1 )
}

# Wait until every compose service has a running container; print the count.
wait_for_stack() {
  local want=$1 i running
  for i in $(seq 1 40); do
    running=$(RUNNING)
    [[ "$running" -ge "$want" ]] && { printf '%s' "$running"; return 0; }
    sleep 3
  done
  printf '%s' "$(RUNNING)"
  return 1
}

bridge_exists()  { docker inspect "$BRIDGE_NAME" >/dev/null 2>&1; }
bridge_running() { [[ "$(docker inspect -f '{{.State.Running}}' "$BRIDGE_NAME" 2>/dev/null)" == "true" ]]; }
bridge_health()  { docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$BRIDGE_NAME" 2>/dev/null; }
bridge_ip()      { docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$BRIDGE_NAME" 2>/dev/null; }

bridge_attached() {
  docker network inspect "$NETWORK_NAME" 2>/dev/null | grep -q "\"$BRIDGE_NAME\"" && return 0
  docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' \
    "$BRIDGE_NAME" 2>/dev/null | grep -q "$NETWORK_NAME"
}

detach_bridge() {
  if ! bridge_exists; then
    dim "$BRIDGE_NAME 不存在，跳过摘除"; return 0
  fi
  if ! bridge_attached; then
    dim "$BRIDGE_NAME 本来就不在 $NETWORK_NAME 上，跳过摘除"; return 0
  fi
  if docker network disconnect -f "$NETWORK_NAME" "$BRIDGE_NAME" >/dev/null 2>&1; then
    ok "已把 $BRIDGE_NAME 从 $NETWORK_NAME 摘下来"
    BRIDGE_WAS_DETACHED=1
  else
    warn "摘除 $BRIDGE_NAME 失败 —— update 很可能因此失败，请留意"
  fi
}

attach_bridge() {
  [[ "${BRIDGE_WAS_DETACHED:-0}" == "1" ]] || return 0
  hdr "把 $BRIDGE_NAME 接回来"
  if [[ ! -d "$BRIDGE_DIR" ]]; then
    cfail "$BRIDGE_DIR 不存在，无法恢复 $BRIDGE_NAME —— 它现在是断网状态"
    return 1
  fi

  local out
  out=$( cd "$BRIDGE_DIR" && docker compose up -d 2>&1 )
  sleep 8
  if bridge_running && bridge_attached; then
    ok "$BRIDGE_NAME 已启动（$(docker inspect -f '{{.State.Status}}' "$BRIDGE_NAME") / $(bridge_ip)）"
    return 0
  fi

  # A plain `up -d` fails with "Address already in use" when a stale endpoint
  # pin survives from an earlier manual `network connect --ip <addr>`.
  # Recreating the container is the only way to clear that pin.
  warn "普通启动没成功，改用 --force-recreate 清掉可能残留的 IP 绑定"
  out=$( cd "$BRIDGE_DIR" && docker compose up -d --force-recreate 2>&1 )
  sleep 10
  if bridge_running && bridge_attached; then
    ok "$BRIDGE_NAME 已重建并启动（$(bridge_ip)）"
    return 0
  fi

  cfail "$BRIDGE_NAME 仍然起不来 —— 手动跑：cd $BRIDGE_DIR && docker compose up -d --force-recreate"
  printf '%s\n' "$out" | sed 's/^/       /'
  return 1
}

# --------------------------------------------------------------- verify -----

verify() {
  hdr "验证"

  local want running
  want=$(expected_containers)
  running=$(RUNNING)
  if [[ "$want" -gt 0 && "$running" -eq "$want" ]]; then
    ok "mailcow 容器 $running/$want 全部在跑"
  else
    cfail "mailcow 容器只有 $running/$want 在跑"
    docker ps -a --filter "name=^${PROJECT}" --format '{{.Names}}\t{{.Status}}' \
      | grep -v $'\tUp ' | sed 's/^/       /'
  fi

  local p
  for p in $PORTS; do
    if ss -ltn 2>/dev/null | grep -qE ":${p} "; then
      ok "端口 $p 在监听"
    else
      cfail "端口 $p 没在监听"
    fi
  done

  # Everything below goes through the local stunnel front end (127.0.0.1:3002),
  # so it needs neither public DNS nor Cloudflare.
  local code
  code=$(curl -sk -o /dev/null -w '%{http_code}' --max-time 12 \
    --resolve "${POLICY_HOST}:3002:127.0.0.1" \
    "https://${POLICY_HOST}:3002/.well-known/mta-sts.txt" 2>/dev/null)
  [[ "$code" == "200" ]] && ok "MTA-STS 策略 -> 200" \
                         || warn "MTA-STS 策略 -> ${code:-无响应}"

  code=$(curl -sk -o /dev/null -w '%{http_code}' --max-time 12 \
    --resolve "${MAIL_HOST}:3002:127.0.0.1" "https://${MAIL_HOST}:3002/" 2>/dev/null)
  [[ "$code" == "200" ]] && ok "mailcow web UI -> 200" \
                         || warn "mailcow web UI -> ${code:-无响应}"

  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://127.0.0.1:3007/ 2>/dev/null)
  [[ "$code" == "200" ]] && ok "$BRIDGE_NAME 3007 -> 200" \
                         || warn "$BRIDGE_NAME 3007 -> ${code:-无响应}"

  local h
  h=$(bridge_health)
  if ! bridge_running; then
    cfail "$BRIDGE_NAME 不在运行 —— linux.do OIDC 登录会失效"
  elif ! bridge_attached; then
    cfail "$BRIDGE_NAME 在跑但没接在 $NETWORK_NAME 上 —— 它调不到 mailcow API（OIDC 登录会失效）"
  elif [[ "$h" == "healthy" || "$h" == "none" ]]; then
    ok "$BRIDGE_NAME 状态 = $h，已接在 $NETWORK_NAME（$(bridge_ip)）"
  else
    warn "$BRIDGE_NAME 状态 = $h（有健康检查，稍等会自愈）"
  fi

  local q
  q=$(docker exec "${PROJECT}-postfix-mailcow-1" mailq 2>/dev/null | tail -1)
  if [[ "$q" == "Mail queue is empty" ]]; then
    ok "邮件队列为空"
  else
    warn "邮件队列非空：${q:-取不到}"
  fi

  # mailcow pins container IPs in nft DNAT rules (25/110/143/465/587/993/995/
  # 4190 -> dovecot/postfix). If a container comes back on a different IP than
  # the rule expects, the port forwards into nowhere and mail dies silently.
  local ip bad_ip=0
  local live_ips
  live_ips=$(docker ps -q 2>/dev/null \
    | xargs -r docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}' 2>/dev/null)
  while read -r ip; do
    [[ -z "$ip" ]] && continue
    grep -qw "$ip" <<<"$live_ips" || { cfail "转发规则指向的 $ip 上没有容器（邮件端口会打到空处）"; bad_ip=1; }
  done < <(nft list ruleset 2>/dev/null | grep -oE 'dnat to [0-9.]+' | awk '{print $3}' | sort -u)
  [[ "$bad_ip" == "0" ]] && ok "端口转发目标与运行中的容器 IP 一致"
}

# ---------------------------------------------------------------- traps -----

BRIDGE_WAS_DETACHED=0
UPDATE_FAILED=0

on_exit() {
  local rc=$?
  # Never leave the bridge stranded, however we got here.
  if [[ "${BRIDGE_WAS_DETACHED:-0}" == "1" ]]; then
    if ! bridge_running || ! bridge_attached; then
      attach_bridge || rc=2
    fi
  fi
  [[ -n "$LOG_FILE" ]] && { say ""; say "日志：$LOG_FILE"; }
  exit "$rc"
}
trap on_exit EXIT
trap 'say ""; warn "收到信号，正在收尾（会把栈和桥恢复到可用状态）"' INT TERM

# ----------------------------------------------------------------- main -----

while [[ $# -gt 0 ]]; do
  case "$1" in
    --backup) DO_BACKUP=1; shift ;;
    --repair) MODE=repair; shift ;;
    --verify) MODE=verify; shift ;;
    -h|--help) sed -n '2,60p' "$0" | sed -n '/^#/p' | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) say "未知参数：$1（--help 看用法）"; exit 3 ;;
  esac
done

mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/$(date +%Y%m%d-%H%M%S)-${MODE}.log"
exec > >(tee -a "$LOG_FILE") 2>&1

say "${C_HDR}mailcow-update${C_RESET}  mode=${MODE}  $(date -Is)"

# -- preflight ---------------------------------------------------------------
hdr "预检"
[[ "$(id -u)" -eq 0 ]] || { bad "需要 root"; exit 3; }
command -v docker >/dev/null || { bad "找不到 docker"; exit 3; }
[[ -f "$MAILCOW_DIR/mailcow.conf" ]] || { bad "找不到 $MAILCOW_DIR/mailcow.conf"; exit 3; }
if [[ "$MODE" == "update" && ! -f "$MAILCOW_DIR/update.sh" ]]; then
  bad "找不到 $MAILCOW_DIR/update.sh"; exit 3
fi
ok "root / docker / $MAILCOW_DIR 就绪"

cd "$MAILCOW_DIR" || exit 3
BEFORE_HEAD=$(git rev-parse --short HEAD 2>/dev/null)
BEFORE_DESC=$(git describe --tags 2>/dev/null)
dim "更新前：HEAD=${BEFORE_HEAD:-?}  describe=${BEFORE_DESC:-?}  运行中容器=$(RUNNING)"

if [[ "$MODE" == "verify" ]]; then
  verify
  say ""
  [[ "$FAILURES" -eq 0 ]] && { ok "全部通过"; exit 0; } || { bad "$FAILURES 项异常"; exit 2; }
fi

# -- state snapshot ----------------------------------------------------------
hdr "记录更新前状态"
SNAP="$LOG_DIR/pre-update-$(date +%Y%m%d-%H%M%S).txt"
{
  echo "date: $(date -Is)"
  echo "git HEAD: ${BEFORE_HEAD:-?} (${BEFORE_DESC:-?})"
  echo "--- containers ---"
  docker ps --format '{{.Names}}\t{{.Image}}\t{{.Status}}' | grep "$PROJECT" | sort
  echo "--- volumes ---"
  docker volume ls -qf name="$PROJECT"
} > "$SNAP"
ok "快照写入 $SNAP"

# -- optional backup ---------------------------------------------------------
if [[ "$DO_BACKUP" == "1" ]]; then
  hdr "在线备份（不停服）"
  export MAILCOW_BACKUP_LOCATION=${MAILCOW_BACKUP_LOCATION:-/opt/mailcow-backup}
  mkdir -p "$MAILCOW_BACKUP_LOCATION"
  chmod 755 "$MAILCOW_BACKUP_LOCATION"
  if ./helper-scripts/backup_and_restore.sh backup all >/dev/null 2>&1; then
    ok "备份完成 -> $MAILCOW_BACKUP_LOCATION（$(du -sh "$MAILCOW_BACKUP_LOCATION" | cut -f1)）"
  else
    warn "备份脚本返回非零，请检查 $MAILCOW_BACKUP_LOCATION"
  fi
fi

if [[ "$MODE" == "update" ]]; then
  # -- 1. get the bridge out of the way --------------------------------------
  hdr "摘除 $BRIDGE_NAME（否则 compose 删不掉 mailcow 网络）"
  detach_bridge

  # -- 2. run mailcow's updater ---------------------------------------------
  hdr "运行 mailcow 更新（$UPDATE_CMD）"
  UPDATE_LOG="$LOG_DIR/update-$(date +%Y%m%d-%H%M%S).log"
  # mailcow's script asks "Are you sure ... [y/N]". Feed y a few times, and give
  # it a pty via `script` when available so its `read < /dev/tty` path cannot hang.
  if command -v script >/dev/null; then
    printf 'y\ny\ny\n' | script -qec "$UPDATE_CMD" /dev/null > "$UPDATE_LOG" 2>&1
  else
    printf 'y\ny\ny\n' | bash -c "$UPDATE_CMD" > "$UPDATE_LOG" 2>&1
  fi
  UPDATE_RC=$?
  tail -n 20 "$UPDATE_LOG" | sed 's/^/       /'
  if [[ "$UPDATE_RC" -eq 0 ]]; then
    ok "update.sh 退出码 0（注意：它中途失败也可能返回 0，下一步会兜住）"
  else
    warn "update.sh 退出码 $UPDATE_RC（完整日志 $UPDATE_LOG）"
    UPDATE_FAILED=1
  fi

  # -- 3. the stack MUST be up, whatever update.sh did -----------------------
  hdr "确保 mailcow 栈在跑"
  WANT=$(expected_containers)
  if [[ "$(RUNNING)" -lt "$WANT" ]]; then
    warn "只有 $(RUNNING)/$WANT 个容器在跑 —— 执行 docker compose up -d 兜底"
    stack_up | tail -n 15 | sed 's/^/       /'
    UPDATE_FAILED=1
  fi
  FINAL=$(wait_for_stack "$WANT") || true
  if [[ "$WANT" -gt 0 && "$FINAL" -ge "$WANT" ]]; then
    ok "容器 $FINAL/$WANT 全部在跑"
  else
    cfail "容器只有 $FINAL/$WANT 在跑 —— 需要人工介入"
  fi

  # -- 4. put the bridge back BEFORE verifying, so the bridge checks below test
  #       the real state and not a still-detached container. The EXIT trap stays
  #       on as a net for Ctrl-C / unexpected exits.
  attach_bridge && BRIDGE_WAS_DETACHED=0 || true
fi

if [[ "$MODE" == "repair" ]]; then
  hdr "修复模式：确保栈 + 桥都可用"
  WANT=$(expected_containers)
  if [[ "$(RUNNING)" -lt "$WANT" ]]; then
    stack_up | tail -n 10 | sed 's/^/       /'
  fi
  FINAL=$(wait_for_stack "$WANT") || true
  ok "容器 $FINAL/$WANT"
  if ! bridge_attached; then
    BRIDGE_WAS_DETACHED=1
  fi
  attach_bridge && BRIDGE_WAS_DETACHED=0 || true
fi

# -- 4. verification ---------------------------------------------------------
verify

# -- summary -----------------------------------------------------------------
hdr "结论"
if [[ "$MODE" == "update" ]]; then
  dim "版本：${BEFORE_DESC:-?} -> $(git describe --tags 2>/dev/null)"
fi
if [[ "$CRITICAL_FAILURES" -gt 0 ]]; then
  bad "$CRITICAL_FAILURES 项关键检查失败（共 $FAILURES 项异常）—— 看 $LOG_FILE"
  exit 2
fi
if [[ "$UPDATE_FAILED" == "1" ]]; then
  bad "更新过程失败，但服务已恢复到可用状态 —— 看 $LOG_FILE 里的 update-*.log"
  exit 1
fi
if [[ "$FAILURES" -gt 0 ]]; then
  warn "$FAILURES 项非关键异常（看上面的 [warn]）"
  exit 0
fi
ok "全部通过"
exit 0
