# Marinara Engine 入门

欢迎使用 Marinara Engine。本指南介绍这个应用是什么、主页上各部分都是什么，以及开启第一次聊天要做的几步。全文面向新手，不需要任何配置经验。

## Marinara Engine 是什么

Marinara Engine 是一个本地应用，用来和 AI 角色聊天、玩角色扮演。它跑在自己的电脑上，再接到一家自选的 AI 服务上。角色可以自己创建，也可以导入现成的，选好聊天方式就能开聊。Marinara 本身不运行 AI，所以第一件事是添加一个连接。多数人会连到线上的 AI 服务商。应用也内置了一个可下载的小型 **Local Model**(本地模型)，它适合做些轻量的辅助工作，不适合当主力聊天模型，详见[本地模型设置](../connections/local-model.md)。这一步配置完成后，剩下的事情在应用里就能全部搞定。

## 主页一览

没有打开任何聊天时，看到的就是主页。它的布局像一个 Windows 11 桌面：底部是任务栏，任务栏上方会展开 **Start**(开始) 菜单。

- **桌面**：壁纸上有应用图标、**Marinara Engine** 字样，下面是版本号。图标沿桌面左侧排列，和全新安装的 Windows 11 一个样子。双击图标即可打开：**Conversation**、**Roleplay** 和 **Game** 会新建一个对应模式的聊天，**Recent Chats**(最近聊天)、**What's New**(更新内容)、**Learn the Engine**(了解引擎)、**Community**(社区)、**Clock**(时钟) 和 **Achievements**(成就) 会打开各自的窗口，**Character Library**(角色库)、**Professor Mari**、**Discovery**(发现) 和 **Character of the Day**(当日角色) 则打开应用里对应的界面。拖动图标可以把它换到别的位置。在桌面空白处点右键，可以调整图标大小、按名称排序、刷新桌面，或打开 **Personalize**(个性化)；在图标上点右键则只有 **Open**(打开) 和 **Refresh**(刷新)。
- **Professor Mari 助手**：桌面上浮着一个小小的 Professor Mari。点一下她，就能问某个功能在哪儿，她会指给你，需要时也可以打开她自己的聊天。参见 [Professor Mari，你的应用内助手](professor-mari.md)。
- **任务栏**：位于屏幕底部居中的一条栏。上面有 **Start** 按钮、一个 **Search**(搜索) 框（让 Professor Mari 帮你找东西）、**Home** 和 **Professor Mari** 两个选项卡、**Character Library**(角色库) 快捷入口，以及三种聊天模式快捷入口。右端是 **Achievements**(成就) 铃铛（只有开启成就设置时才出现）和时钟。在任务栏上点右键，可以打开 **Taskbar settings**(任务栏设置)。
- **Start 菜单**：点击 **Start** 打开。**Pinned**(固定) 区域放着主要入口：新建对话、角色扮演和游戏三个快捷入口、角色库、**Discord**、**Support**(支持)、**Documentation**(文档)、**Tutorial**(教程)、**FAQ**(常见问题) 和 **Achievements**(成就，只有开启成就设置时才出现)。下面的 **Recommended**(推荐) 区域列出你最近的聊天，点一下就能重新打开。底部横栏显示应用版本号和 **Credits**(致谢) 按钮。
- **时钟和快速设置**：点击任务栏右端的时钟打开日历，点旁边的音量图标打开快速设置。快速设置里的滑杆和开关只是装饰性的，不会改变应用的真实设置。

在窄屏上，任务栏会隐藏三个聊天模式快捷入口和托盘里的音量按钮；角色库保留，桌面上的图标依然可以新建聊天。

第一次打开 Marinara 时会有一段简短的引导，指出主要按钮和几种聊天模式。完整流程见[首次使用的引导教程](tutorial.md)。

## 上手第一步

按顺序做完下面几步，就能开始第一次聊天。

1. 安装 Marinara Engine，然后在浏览器里打开。到 [Marinara Engine 安装](../INSTALLATION.md)里选择自己的平台。
2. 添加一个连接，应用才能接上 AI 服务。一个连接会保存服务商、API 密钥和模型。API 密钥是一串秘密字符，作用有点像密码，由 AI 服务商发放。参见[连接 AI 服务商](../connections/connecting-to-a-provider.md)。
3. 创建或导入一个用来聊天的角色。打开 **Characters**(角色) 面板，点击 **New**(新建) 打开 **Create Character**(创建角色) 窗口，或者点击 **Import**(导入) 从文件导入一张角色卡。参见[创建和编辑角色](../characters/creating-and-editing-characters.md)。
4. 开始聊天。在聊天侧边栏里选一个模式选项卡，然后点击 **+** 按钮。这个按钮会随选项卡变成 **New Conversation**、**New Roleplay** 或 **New Game**。新聊天打开后会弹出一个设置窗口，带着走完剩下的步骤。如果还没有保存过任何连接，会先出现 **Set Up Conversation**、**Set Up Roleplay** 或 **Set Up Game** 窗口。在那里选好连接，再点击 **Create Chat**。

哪一步卡住了，就去问内置助手。读一读 [Professor Mari，你的应用内助手](professor-mari.md)，看看她都能做什么。

## 三种聊天模式

Marinara 有三种聊天模式，新建聊天时选择其中一种。

- **Conversation**(对话模式)：朴素直接的 AI 聊天，没有角色扮演成分，界面像即时通讯软件。参见 [Conversation 模式：入门](../conversation/getting-started.md)。
- **Roleplay**(角色扮演)：沉浸式角色扮演，带角色、场景追踪和世界状态。参见 [Roleplay 模式：入门](../roleplay/getting-started.md)。
- **Game**(游戏模式)：由 AI 担任游戏主持人（GM）的单人角色扮演游戏，有队伍、骰子、地图和任务。参见 [Game Mode：入门](../game/getting-started.md)。

## 到哪里求助

不用离开应用就有好几种求助途径：

- 问 **Professor Mari**：点主页桌面上的悬浮助手，或者任务栏上她的选项卡，配置问题和操作方法都能答。
- 打开 **Start** 菜单，选 **FAQ**(常见问题)，常见问题在那里有速查答案。
- 用 **Start** 菜单里的 **Documentation**(文档) 打开应用内指南。
- 在 **Start** 菜单里选 **Discord** 进入社区，或者选 **Support**(支持) 支持这个项目。

如果哪里坏了、用不了，参见 [Marinara Engine 故障排查](../TROUBLESHOOTING.md)。

## 相关指南

- [Marinara Engine 安装](../INSTALLATION.md)
- [连接 AI 服务商](../connections/connecting-to-a-provider.md)
- [创建和编辑角色](../characters/creating-and-editing-characters.md)
- [首次使用的引导教程](tutorial.md)
- [Professor Mari，你的应用内助手](professor-mari.md)
- [Conversation 模式：入门](../conversation/getting-started.md)
- [Roleplay 模式：入门](../roleplay/getting-started.md)
- [Game Mode：入门](../game/getting-started.md)
