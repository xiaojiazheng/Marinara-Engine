# 个人二开与线上更新

代码：`D:\work\project\Marinara-Engine`。`custom` 从官方 `v2.5.0` 建立；`origin` 指向 xiaojiazheng 的 Fork，`upstream` 指向官方仓库。修改在 `custom` 上提交，不要用官方更新覆盖自己的分支。

## 本地开发

已安装 Node 24 和项目锁定的 pnpm 10.34.5，并完成依赖安装与 `pnpm check`。

在 PowerShell 中运行：

```powershell
Set-Location D:\work\project\Marinara-Engine
$env:PATH = "$PWD\.git\local-bin;$env:PATH"
pnpm dev
```

按终端显示的地址打开开发页面。本地数据和生产数据分离；本地 `.env` 已关闭自动更新和自动打开浏览器。新终端需重新设置 PATH。不要提交 `.env`、数据目录或生产密钥。

Windows 上 `.agents/skills` 使用本地 Junction 指向 `.claude/skills`，Git 对此路径设置了 skip-worktree，以保留上游符号链接的提交内容。将来上游修改此链接时，需要先关闭 skip-worktree，再重新建立本地 Junction；不要把链接替换提交到 Fork。

## 发布自定义镜像

每次完成二开后：

```powershell
pnpm check
git add <本次修改的文件>
git commit -m "Describe the change"
git push -u origin custom
```

`Build Custom Container` 工作流为 Linux amd64 构建原有完整 Dockerfile，不改应用版本号，也不自动更新线上。第一次在 Fork 的 Actions 页面启用工作流。镜像为 `ghcr.io/xiaojiazheng/marinara-engine:custom-<完整提交SHA>`；使用构建摘要中的 `ghcr.io/xiaojiazheng/marinara-engine@sha256:<摘要>` 部署，可以精确锁定版本。

GitHub 网页登录与本机 Git 推送认证是两套会话；若 `git push` 提示登录，按 Git Credential Manager 的提示登录自己的账号，不需要把令牌写入远程地址或项目文件。

GHCR 首次创建的软件包可能为私有。服务器需要可读该包的认证，或将这个只包含公开源码的镜像包设为公开。不要在仓库或指南中填写真实令牌。若服务器不能直连 GHCR，先配置可信的拉取代理/镜像服务；南京镜像不保证缓存个人软件包，不应把镜像域名替换视为一定可用。

## 首次接管现有宝塔容器

当前实际部署：容器 `marinara-lite`，Docker bridge，`127.0.0.1:7860`，数据 bind 挂载 `/var/lib/docker/volumes/marinara-data/_data` 到 `/app/data`。保留容器名是因为现有网关会读取这个容器的认证配置。反代地址继续沿用原设置。

把 `compose.custom.yml` 上传到服务器 `/root/marinara-custom/`。以下命令在宝塔服务器执行；先替换镜像摘要，确认构建成功且已完成本地验收。

```bash
install -d -m 700 /root/marinara-custom /root/marinara-backups
cd /root/marinara-custom
export MARINARA_IMAGE='ghcr.io/xiaojiazheng/marinara-engine@sha256:替换为真实摘要'
docker pull "$MARINARA_IMAGE"
```

在原容器仍运行时，把原有环境变量导出到仅 root 可读的文件，不在终端显示密钥：

```bash
python3 - <<'PY'
import json, os, subprocess
container = json.loads(subprocess.check_output(['docker', 'inspect', 'marinara-lite']))[0]
env = container['Config']['Env']
if any('\n' in item or '\r' in item for item in env):
    raise SystemExit('Multiline environment needs manual preservation; no file was written')
path = '/root/marinara-custom/marinara.env'
fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
with os.fdopen(fd, 'w', encoding='utf-8') as f:
    f.write('\n'.join(env) + '\n')
PY

docker compose -p marinara-custom -f compose.custom.yml config --quiet
```

`format: raw` 要求 Docker Compose 2.30+，当前服务器 Compose 5.4.0 可用。它保留密码中的 `$`、引号等字符。不要运行会显示完整配置的 `docker compose config`，也不要将环境文件上传 GitHub。

停止服务后再备份，以获得一致的数据快照。保留 `/app/data` 内的加密密钥、`.env`、代理配置与 ffmpeg 文件。此步骤会短暂停机：

```bash
set -e
stamp=$(date +%Y%m%d-%H%M%S)
backup="/root/marinara-backups/$stamp"
install -d -m 700 "$backup"
docker inspect -f '{{.Image}}' marinara-lite > "$backup/old-image-id.txt"
cp -p marinara.env "$backup/marinara.env"
cp compose.custom.yml "$backup/compose.custom.yml"
printf '%s\n' "$MARINARA_IMAGE" > "$backup/new-image.txt"
docker stop marinara-lite
if ! (umask 077; tar -czf "$backup/data.tar.gz" -C /var/lib/docker/volumes/marinara-data/_data .); then
  docker start marinara-lite
  exit 1
fi
docker rename marinara-lite "marinara-before-custom-$stamp"
docker compose -p marinara-custom -f compose.custom.yml up -d
curl --fail --max-time 15 http://127.0.0.1:7860/api/health
```

保存 `stamp` 和备份路径。健康接口通过后，还要检查域名登录、旧聊天、模型连接及一次正常生图。原容器保留为停止状态；不要启动两个容器共同写同一个数据目录。现有 HY-MT/Qwen/ComfyUI 网关服务继续独立运行。

## 后续上线

保持 `marinara.env`、数据路径和 Compose 项目名不变。先拉新镜像，再停止当前服务、备份完整数据，最后 `up -d` 重建。不要清理旧镜像或备份，直到人工验收完成。

```bash
cd /root/marinara-custom
export MARINARA_IMAGE='ghcr.io/xiaojiazheng/marinara-engine@sha256:新的真实摘要'
docker pull "$MARINARA_IMAGE"
docker compose -p marinara-custom -f compose.custom.yml config --quiet
set -e
stamp=$(date +%Y%m%d-%H%M%S)
backup="/root/marinara-backups/$stamp"
install -d -m 700 "$backup"
docker inspect -f '{{.Image}}' marinara-lite > "$backup/old-image-id.txt"
cp -p marinara.env "$backup/marinara.env"
cp compose.custom.yml "$backup/compose.custom.yml"
docker compose -p marinara-custom -f compose.custom.yml stop
if ! (umask 077; tar -czf "$backup/data.tar.gz" -C /var/lib/docker/volumes/marinara-data/_data .); then
  docker start marinara-lite
  exit 1
fi
docker compose -p marinara-custom -f compose.custom.yml up -d
curl --fail --max-time 15 http://127.0.0.1:7860/api/health
```

## 回滚

如果新版本已迁移存储，不能仅换旧镜像继续读新数据。停止新容器后，先保留故障时的数据目录，再恢复上线前的数据快照、环境文件与旧镜像。恢复备份会回到备份时的聊天状态；上线后新增的数据需要另行提取，不能直接合并整个目录。

```bash
set -e
cd /root/marinara-custom
backup='/root/marinara-backups/替换为要恢复的时间目录'
test -s "$backup/data.tar.gz" && test -s "$backup/old-image-id.txt" || exit 1
docker compose -p marinara-custom -f compose.custom.yml stop
data_dir='/var/lib/docker/volumes/marinara-data/_data'
failed="${data_dir}.failed-$(date +%Y%m%d-%H%M%S)"
mv -- "$data_dir" "$failed"
mkdir -p -- "$data_dir"
tar -xzf "$backup/data.tar.gz" -C "$data_dir" || exit 1
cp -p "$backup/marinara.env" marinara.env
cp "$backup/compose.custom.yml" compose.custom.yml
export MARINARA_IMAGE="$(cat "$backup/old-image-id.txt")"
docker compose -p marinara-custom -f compose.custom.yml up -d --pull never
curl --fail --max-time 15 http://127.0.0.1:7860/api/health
```

先确认目标路径与备份正确再执行恢复；故障数据被移动到相邻目录，没有删除。不要执行 `docker compose down -v`、删除数据目录或盲目 `docker system prune -a`。

## 同步官方新版本

```powershell
git fetch upstream --tags
git switch custom
git merge vX.Y.Z
pnpm install --frozen-lockfile
pnpm check
```

`vX.Y.Z` 替换成实际打算升级的官方版本。解决冲突并本地验证后再推送，待镜像构建成功，按上述备份流程更新线上。只同步已验证的正式版本；不要直接把官方 `main` 重置到 `custom`，也不要开启会覆盖二开代码的内置自动更新。
