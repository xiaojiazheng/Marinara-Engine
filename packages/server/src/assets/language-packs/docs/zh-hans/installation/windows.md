# Windows 安装指南

本指南介绍如何在 Windows 上安装 Marinara Engine。可以用一键安装程序（最省事的路子），也可以从源码搭建。此外还会讲到系统要求、可选功能，以及之后怎么更新。

## 系统要求

Marinara Engine 跑在自己的 Windows 电脑上。需要满足以下条件：

- Windows 10 或 Windows 11(64 位)。
- 几个 GB 的可用磁盘空间，用来放应用和它的依赖。
- 安装过程中要能联网（下载代码和软件包）。

两种安装方式都需要两个工具。安装程序可以代劳下载，源码方式则要自己装：

- **Node.js** 版本 24、25 或 26。Node.js 负责运行这个应用。推荐用 24 这个 LTS 版本。LTS 是 Long Term Support(长期支持) 的缩写，指稳定版本。
- **Git**。Git 负责下载代码，也让应用日后能自我更新。

pnpm 是负责安装应用各个组成部分的包管理器。用安装程序或者 **start.bat** 启动脚本的话，不用自己装 pnpm。这两条路都会通过 Corepack(Node.js 自带的 pnpm 辅助工具) 或者临时下载来取得正确的 pnpm 版本。只有不走启动脚本的手动搭建才要求系统里有 `pnpm` 命令，那一节里给出了对应的安装步骤。

## 方式一：Windows 安装程序（推荐）

安装程序是最容易上手的方式。它会检查 Node.js 和 Git，缺哪个就帮你装哪个，然后下载应用、完成构建并创建快捷方式。

按以下步骤操作：

1. 在浏览器里打开 Marinara Engine 的发布页面。

```text
https://github.com/Pasta-Devs/Marinara-Engine/releases
```

2. 从该页面下载最新的 Windows 安装程序文件。
3. 运行安装程序，按屏幕提示往下走。如果缺 Node.js 或 Git，就让安装程序把它们装上。
4. 出现提示时选择安装文件夹，或者直接用默认值。
5. 等安装程序下载并构建应用。这一步可能要几分钟。
6. 完成后，双击桌面上新出现的快捷方式启动 Marinara Engine。

稍等片刻，浏览器应该会自动打开应用。如果没有自动打开，手动打开浏览器访问这个地址：

```text
http://127.0.0.1:7860
```

安装程序装出来的是一份基于 Git 的应用副本。也就是说，下次启动时它能自我更新。详见下面的更新一节。

如果杀毒软件对安装程序发出警告，这是已知的误报。安装程序会下载 Node.js 和 Git，有些杀毒工具会把这种行为标记出来。只运行从上面链接的官方发布页面下载的安装程序。

## 方式二：从源码安装

如果更愿意自己敲命令，或者想用测试版（staging），就选这种方式。

### 第 1 步：安装 Node.js 和 Git

1. 从官网下载 Node.js 安装程序并运行。

```text
https://nodejs.org/en/download
```

2. 从官网下载 Git 安装程序并运行。

```text
https://git-scm.com/download/win
```

3. 打开一个新的命令提示符窗口。确认 Node.js 是 24、25 或 26 版：

```bat
node -v
```

4. 确认 Git 已装好：

```bat
git --version
```

两条命令都应该输出一个版本号。如果提示找不到命令，关掉命令提示符再重新打开，或者把缺的那个工具重装一遍。

### 第 2 步：下载代码并启动

名为 **start.bat** 的启动脚本会替你完成搭建。它会挑选正确的 pnpm 版本、安装依赖、构建应用，并打开浏览器。

1. 用 Git 下载代码：

```bat
git clone https://github.com/Pasta-Devs/Marinara-Engine.git
```

2. 进入新建的文件夹：

```bat
cd Marinara-Engine
```

3. 可选：切换到测试版。下载下来默认是稳定版。想改用测试版（staging）的话，在第一次启动之前运行这条命令。要稳定版就跳过这一步。用测试版之前先备份数据。

```bat
git checkout staging
```

切换之后，启动脚本更新时会一直留在测试版上。

4. 运行启动脚本：

```bat
start.bat
```

第一次启动要几分钟，因为要安装和构建所有东西。就绪后浏览器会打开 `http://127.0.0.1:7860` 上的应用。之后想再启动应用，在同一个文件夹里运行 **start.bat** 即可。

启动脚本默认把应用开放给局域网，所以网络里的其他设备也能访问。详见下面的从其他设备访问一节。

### 不用启动脚本的手动搭建

如果不想用 **start.bat**，打算每条命令自己敲，就在 `Marinara-Engine` 文件夹里执行下面的操作。

1. 安装 pnpm。这条路不经过启动脚本，所以系统里必须有 `pnpm` 命令。`npm` 命令是 Node.js 自带的。这条只需运行一次：

```bat
npm install -g pnpm
```

2. 安装依赖：

```bat
pnpm install --force
```

3. 构建应用：

```bat
pnpm build
```

4. 启动服务器：

```bat
pnpm start
```

5. 在浏览器里打开应用：

```text
http://127.0.0.1:7860
```

一切都跑在自己的电脑上。走手动这条路时，应用监听的是 `127.0.0.1`，也就是说只有本机能访问。想让网络里的其他设备连进来，在 `Marinara-Engine` 文件夹里新建一个名为 `.env` 的文件，加上下面这行，然后重启服务器：

```env
HOST=0.0.0.0
```

## 可选：AI 立绘背景去除

Marinara Engine 在生成静态立绘时会请求原生透明背景，并内置了自适应蒙版清理，能处理纯色背景和早期的白色背景。此外还可以装一个名为 `backgroundremover` 的可选工具作为兜底，用来对付细节丰富的场景和其他非纯色背景。它之所以是可选的，是因为要下载体积很大的机器学习文件。

用它之前先要有 Python。从官网安装 Python 3.11，然后在 `Marinara-Engine` 文件夹里运行安装命令：

```text
https://www.python.org/downloads/windows/
```

运行安装步骤：

```bat
pnpm backgroundremover:install
```

这会在数据文件夹下建一个私有的 Python 文件夹（一个 venv）。之后 Marinara Engine 会自动用它来清理立绘。venv 是一套自成一体的 Python 环境，不会影响系统里的其他部分。

也可以让 **start.bat** 在下次启动时替你装好这个工具。往 `.env` 文件里加上这行：

```env
BACKGROUNDREMOVER_AUTO_INSTALL=true
```

## 从其他设备访问

可以从手机、平板或同一网络里的另一台电脑打开 Marinara Engine。搭建步骤和安全选项见[常见问题](../FAQ.md)指南。

## 更新 Marinara Engine

更新时聊天、角色和设置都会原样保留。在 Windows 上，Marinara Engine 提供三种更新方式。

### 用启动脚本自动更新

从基于 Git 的副本用桌面快捷方式或 **start.bat** 启动应用时，启动脚本会先检查更新。发现新版本就下载改动、重装依赖、重新构建应用，然后再启动。安装程序装的和手动克隆的都适用。

运行 `start.bat --skip-update` 可以跳过一次检查。想让已安装的 Engine 版本在每次启动时都保持不变，就往 `.env` 里加 `AUTO_UPDATE_ENABLED=false`。手动检查、应用内应用更新和手动 Git 更新依然可用。

如果代码里有还没保存的本地改动，启动脚本会尝试安全地把它们暂存起来，更新完再放回去。实在做不到时，它会保留当前版本并打印一条说明。

### 应用内更新

也可以在应用内检查更新。

1. 打开 **Settings**(设置)。
2. 切换到 **Advanced**(高级) 选项卡。
3. 找到 **Updates**(更新) 一节。
4. 在 **Release Channel**(发布通道) 里选一个通道。常规版本选 **Latest Stable**，抢先体验的测试版选 **Staging/UAT**。用测试版之前先备份数据。
5. 点击 **Check for Updates**(检查更新)。应用会告诉你有没有新版本。

出于安全考虑，**Apply Update**(应用更新) 按钮默认是关闭的。想在应用内直接更新，需要额外配置。在 `.env` 文件里设置以下值：

```env
UPDATES_APPLY_ENABLED=true
ADMIN_SECRET=your-own-secret-value
```

然后打开 **Settings**，切到 **Advanced** 选项卡，找到 **Admin Access**(管理员访问)，把同一个密钥值粘贴进去。这之后 **Apply Update** 按钮就可以用了。

如果是用连到这台 Windows 电脑的 iPhone 或 iPad 打开应用，**Apply Update** 更新的是这台 Windows 服务器。远程更新还要在 `.env` 里再加一个值：

```env
UPDATES_ALLOW_REMOTE_APPLY=true
```

不打算启用应用内更新的话，用快捷方式或 **start.bat** 重新启动应用即可完成更新。

### 手动更新

如果用的是 Git 副本又不走启动脚本，可以手动更新。下面这些命令在 `Marinara-Engine` 文件夹里运行。

1. 拉取最新的稳定版代码：

```bat
git fetch origin +refs/heads/main:refs/remotes/origin/main
```

2. 切到最新的稳定版本：

```bat
git merge --ff-only origin/main || git checkout --detach origin/main
```

3. 重装依赖：

```bat
pnpm install --force
```

4. 重新构建应用：

```bat
pnpm build
```

5. 再次启动服务器：

```bat
pnpm start
```

要用测试版就换成 staging 分支。用下面这两条命令代替上面的第 1、2 步，然后照旧继续做安装和构建那几步：

```bat
git fetch origin +refs/heads/staging:refs/remotes/origin/staging
```

```bat
git checkout -B staging origin/staging
```

## 出问题了怎么办

安装或启动失败时，先确认 Node.js 是 24、25 或 26 版，并且 Git 已装好。如果杀毒软件拦截了安装程序或下载过程，那是上面提到的已知误报。

更多解决办法见 [Marinara Engine 故障排查](../TROUBLESHOOTING.md)指南。

## 相关指南

- [Marinara Engine 安装](../INSTALLATION.md)：为自己的设备挑选合适的安装方式。
- [升级 Marinara Engine](../UPGRADING.md)：关于如何让应用保持最新的更多细节。
- [Marinara Engine 故障排查](../TROUBLESHOOTING.md)：常见问题的解决办法。
- [常见问题](../FAQ.md)：快速解答，包含网络访问相关内容。
