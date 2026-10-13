# 从 SillyTavern 导入

本指南介绍如何把 SillyTavern(社区常称“酒馆”) 里的数据搬进 Marinara Engine。可以一次导入一个文件，也可以扫描整个 SillyTavern 文件夹，一次性全部导入。

## 可以搬过来的内容

Marinara Engine 能导入下面这几类 SillyTavern 数据：

- 角色（角色卡）
- 聊天（消息记录）
- 群聊（多个角色参与的聊天）
- 预设（生成设置）
- 世界书（SillyTavern 里叫“World Info”）
- 背景（聊天的背景图）
- 用户角色（代表你自己的 **{{user}}** 资料）

世界书就是一组笔记，聊天里出现特定词语时 AI 会读到它们。预设是一套保存好的生成设置。用户角色则是聊天里代表你的那份资料。

导入有两种方式。单个文件用单文件按钮。要把整套 SillyTavern 一次搬过来，就用 **Import from SillyTavern Folder**(从 SillyTavern 文件夹导入) 向导。

## 单文件快速导入

打开 **Settings**(设置)，切到 **Imports**(导入) 选项卡，找到 **SillyTavern Import**(SillyTavern 导入) 一节。它的说明文字是“Bring over characters, chats, presets, and lorebooks from SillyTavern files.”

这一节有四个单文件按钮。每一个都只打开普通的文件选择器，没有额外选项：

- **Import Character (JSON/PNG)**(导入角色卡) 接受 `.json` 或 `.png` 角色卡。
- **Import Chat (JSONL)**(导入聊天) 接受 `.jsonl` 聊天记录。它总是创建一个 **Roleplay**(角色扮演) 聊天，并直接切过去。
- **Import Preset (JSON)**(导入预设) 接受 `.json` 预设文件。
- **Import Lorebook (JSON)**(导入世界书) 接受 `.json` World Info 文件。

JSONL 的意思是每行一条 JSON 记录，SillyTavern 保存聊天记录用的就是这种格式。

导入的角色卡里如果内嵌了世界书，浏览器会弹出提示，问要不要把它同时导入成一本独立的 Marinara 世界书。点击 **OK**，这份 World Info 就会单独存成一本可以反复使用的世界书。点击 **Cancel** 则跳过这一步，只导入角色。

这几个快速按钮用的是固定默认值，在这里改不了。它们会保留源文件的全部标签，并把正则脚本的作用范围限定在该角色内。正则脚本是一条查找替换规则，在 AI 看到文本之前或之后改写文本。想自己挑这些选项，就改用 Characters(角色) 面板里的 **Import** 按钮。参见[导入和导出角色卡](../characters/import-export.md)。

### 把聊天导入到指定模式

上面那个单文件 **Import Chat (JSONL)** 按钮永远创建 **Roleplay** 聊天。想让聊天落到别的模式里，就改用聊天列表顶部的小导入按钮，它的提示文字是 **Import SillyTavern or Marinara chat JSONL**。这个按钮会把文件导入到当前打开的模式选项卡里，比如 Conversation、Roleplay 或 Game。聊天导入导出的更多内容，参见[导出与导入聊天](../chats/export-import.md)。

## 从 SillyTavern 文件夹导入

这个向导会扫描一整个 SillyTavern 文件夹，一次导入大量条目。角色、聊天、群聊、预设、世界书、背景和用户角色会一起读取。

打开方式：进入 **Settings**，再到 **Imports**，找到 **SillyTavern Import** 一节，点击 **Import from SillyTavern Folder**。会打开一个标题为 **Import from SillyTavern** 的窗口。

### 第 1 步：指向 SillyTavern 文件夹

1. 在标着 **SillyTavern Folder Path**(SillyTavern 文件夹路径) 的输入框里填 SillyTavern 文件夹的路径，例如 `/path/to/SillyTavern`。
2. 也可以点击 **Browse**(浏览)，用电脑自带的文件夹选择器来选。远程服务器或没有图形界面的机器上没有系统选择器，这时会改为打开应用内置的文件夹浏览器，里面有一个 **Select This Folder**(选择此文件夹) 按钮。
3. 指向 SillyTavern 的主文件夹。窗口里的提示说，这个文件夹里通常还有一个 `data/` 或 `public/` 文件夹。
4. 点击 **Scan Folder**(扫描文件夹)。扫描过程中按钮会显示 **Scanning...**。

扫描结束后，Marinara 会报告每一类各找到多少条。读不了这个文件夹时会显示错误，比如“Could not find SillyTavern data directory.”

### 第 2 步：选择要导入的内容

下一屏的标题是 **Choose exactly what to import**。每一类都有一份勾选清单：**Characters**、**Chats**(聊天)、**Group Chats**(群聊)、**Presets**(预设)、**Lorebooks**(世界书)、**Backgrounds**(背景) 和 **Personas**(用户角色)。计数器会显示已经选中多少条。

每一类都带 **All**(全选) 和 **None**(全不选) 按钮，还有一个 **Show**(显示) / **Hide**(隐藏) 开关，可以展开查看具体条目和它们的日期。

几乎所有条目一开始都是选中的，只有 SillyTavern 自带的预设例外。Marinara 会识别出它们并保持不勾选，页面上有横幅说明原因。这些是 `default`、`deterministic`、`neutral` 以及 `universal-*` 之类的出厂预设。除非确实想要一份副本，否则别去勾。

如果扫描到了角色，还会多出两个控件：

- **Imported character tags**(导入的角色标签) 决定标签怎么导入。选 **All tags** 保留源文件的标签，选 **No tags** 全部跳过，选 **Existing only** 则只保留 Marinara 里已经有的标签。默认是 **All tags**。
- **Imported regex scripts**(导入的正则脚本) 决定正则脚本放到哪里。选 **Character only**，脚本只对各自的角色生效；选 **Global**，脚本会加进 **Presets -> Regexes**，对所有聊天生效。默认是 **Character only**。

选好之后点击 **Import Selected**(导入所选)。点击 **Back**(返回) 可以回到选文件夹那一步。

### 第 3 步：看进度

Marinara 会一条一条地导入。屏幕上有一个转圈图标、当前的类别和条目名称、一条进度条，以及各类别的实时计数。

### 第 4 步：看结果

最后一步：导入成功会显示 **Import complete!** 横幅，失败则显示错误横幅。成功时，每一类都有一张卡片给出最终数量。如果有单条失败，警告列表会为每次失败列出一行，比如 `Character "Foo": error message`。点击 **Done**(完成) 关闭窗口。

### 向导怎么处理数据

- 导入是逐条尽力而为。某个角色、聊天、预设、世界书、背景或用户角色失败了，Marinara 会跳过它、记下一条警告，然后继续处理剩下的。
- 属于同一个角色的多个聊天文件，会作为同一个聊天的多个分支导入，而不是拆成好几个聊天。
- 群聊一律作为 **Roleplay** 聊天导入。
- 导入的条目在 Marinara 里沿用源文件的最后修改日期，而不是运行导入的那一刻。

## 访问权限和文件夹规则

单文件导入按钮人人都能用，不需要额外设置。

**Import from SillyTavern Folder** 向导要从磁盘读文件，所以需要特权访问。在服务器所在的这台机器上（环回地址），不用额外设置就能用。从其他设备或浏览器访问时，必须先在服务器上设置管理员密钥，再把同样的值保存到 **Settings -> Advanced -> Admin Access**。管理员密钥怎么设，参见[服务器配置参考](../CONFIGURATION.md)。

如果服务器设了 `IMPORT_ALLOWED_ROOTS`，Marinara 会拒绝这些文件夹之外的手输路径。用 **Browse** 或内置文件夹浏览器选出来的路径始终可用，开了这项设置也一样。

## 不会搬过来的内容

文件夹向导只扫描上面列出的七个类别。其他 SillyTavern 数据，比如全局应用设置和快速回复，向导不会读取，也不会导入。

SillyTavern 自带的预设默认不勾选，所以不自己去勾就不会搬过来。

只要某一条转换失败，Marinara 就会跳过它。想知道具体漏了什么，看向导最后一步的警告列表。

## 相关指南

- [导入和导出角色卡](../characters/import-export.md)
- [导入与导出世界书](../lorebooks/import-export.md)
- [导出与导入聊天](../chats/export-import.md)
- [正则脚本](../extending/regex-scripts.md)
