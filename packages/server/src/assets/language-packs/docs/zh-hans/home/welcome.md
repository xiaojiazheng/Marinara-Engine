# Marinara Engine 入门

欢迎使用 Marinara Engine。本指南介绍这个应用是什么、主页上各部分都是什么，以及开启第一次聊天要做的几步。全文面向新手，不需要任何配置经验。

## Marinara Engine 是什么

Marinara Engine 是一个本地应用，用来和 AI 角色聊天、玩角色扮演。它跑在自己的电脑上，再接到一家自选的 AI 服务上。角色可以自己创建，也可以导入现成的，选好聊天方式就能开聊。Marinara 本身不运行 AI，所以第一件事是添加一个连接。多数人会连到线上的 AI 服务商。应用也内置了一个可下载的小型 **Local Model**(本地模型)，它适合做些轻量的辅助工作，不适合当主力聊天模型，详见[本地模型设置](../connections/local-model.md)。这一步配置完成后，剩下的事情在应用里就能全部搞定。

## 主页一览

没有打开任何聊天时，看到的就是主页。从上到下依次是这些部分：

- 应用图标、**Marinara Engine** 字样，下面是版本号。
- 一排最近聊天：最多 3 条，显示成小方块，点一下就能重新打开。一条都没有时，这一排会显示“No chats yet”。
- **Ask Professor Mari**(问问 Professor Mari) 卡片：一个聊天框，内置助手会在这里讲解应用、帮忙完成配置。旁边的 **FAQ**(常见问题) 收录了常见问题和解答。
- **Achievements**(成就) 按钮，只有开启了成就设置才会出现。
- 底栏，包含这几个按钮：**Discord**、**Support**(支持)、**Credits**(致谢)、**Documentation**(文档) 和 **Replay Tutorial**(重看教程)。

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

- 在主页问 **Professor Mari**，配置问题和操作方法都能答。
- 看主页上的 **FAQ**，常见问题在那里有速查答案。
- 用主页底栏的 **Documentation** 按钮打开应用内指南。
- 点击底栏的 **Discord** 进入社区，或者点击 **Support** 支持这个项目。

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
