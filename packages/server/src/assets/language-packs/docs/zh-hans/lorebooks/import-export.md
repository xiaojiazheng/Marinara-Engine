# 导入与导出世界书

本指南介绍如何把世界书导入 Marinara Engine，以及如何把它保存成文件。内容包括单个文件、一次多个文件，还有两种导出格式。世界书就是一组由关键词触发的设定笔记，聊天里出现匹配的词时，Marinara 会把对应内容加进发给 AI 的提示词。有些别的角色扮演工具把这个功能叫作 **World Info**。

## 可以导入哪些文件

Marinara 能读两类世界书文件，而且会自动判断你给的是哪一类：

- 从 Marinara 自己导出的世界书。字段和文件夹结构一个都不丢。
- 来自其他工具的 **World Info** 文件。这包括 SillyTavern 的 World Info 文件，以及 V2 角色卡里的“character-book”格式。Marinara 会把其他工具的字段映射到自己的字段上。

两类都是普通的 `.json` 文件。导入世界书不需要账号，也不需要 API 密钥。

## 导入一个世界书

按下面的步骤导入单个世界书文件。

1. 从应用左侧打开 **Lorebooks**(世界书) 面板。
2. 点击顶部操作栏里的下载箭头图标，它的提示文字是 **Import**(导入)，位置在加号图标（**New**，新建）和对勾图标（**Select**，选择）之间。这三个按钮只有图标，把鼠标移上去才能看到名称。
3. **Import Lorebook**(导入世界书) 窗口打开，里面有一个方框，写着 **Drop one or more lorebook files here or click to browse**。
4. 把 `.json` 文件拖进方框，或者点击方框去选文件。
5. 等待结果。每个文件要么显示绿色对勾和 **Imported lorebook**，要么显示红色标记和一条错误信息。
6. 点击 **Close**。新的世界书这就出现在 **Lorebooks** 面板的列表里了。

世界书的创建日期沿用导入文件里自带的日期，不是你执行导入的那一刻。

## 一次导入多个世界书（批量导入）

**Import Lorebook** 窗口一次可以接收多个文件。

1. 打开 **Lorebooks** 面板，点击下载箭头图标，它的提示文字是 **Import**。
2. 把多个 `.json` 文件同时拖进拖放框，或者点击方框后选中多个文件。
3. Marinara 会逐个导入，并为每个文件列出一行结果。末尾还有一行汇总，显示成功和失败各多少个。

同一批里可以混着放 Marinara 的文件和 **World Info** 文件，Marinara 会分别判断每个文件。

## 导出一个世界书

导出会把一个世界书保存成设备上的文件。想分享世界书，或者把它挪到另一个安装实例里，就用这种方式。

1. 在 **Lorebooks** 面板里点击某个世界书，打开它的编辑器。
2. 点击编辑器顶部的导出图标，它的提示文字是 **Export lorebook**(导出世界书)。
3. **Export Lorebook** 窗口打开，里面有两个选项，选一个：
   - **Marinara Native** 会保留 Marinara 的文件夹结构和条目的全部字段。要把世界书原封不动地搬到另一个 Marinara 实例，就选它。文件名以 `.marinara.json` 结尾。
   - **Compatible JSON** 保存的是给其他角色扮演工具用的 **World Info** 文件，没有文件夹结构，部分 Marinara 独有的细节会丢失。文件名以 `.json` 结尾。
4. 浏览器随即下载该文件。

文件是给 Marinara 用的就选 **Marinara Native**，给别的工具用的就选 **Compatible JSON**。

## 一次导出多个世界书（批量导出）

多个世界书可以一起存进一个 zip 文件。

1. 在 **Lorebooks** 面板里点击顶部操作栏的对勾图标，它的提示文字是 **Select**。
2. 勾选每个想导出的世界书。
3. 点击底部选择栏里的 **Export**(导出)。
4. 浏览器会下载一个名为 `marinara-lorebooks.zip` 的压缩包。

批量导出固定使用 **Marinara Native** 格式，所以再导回 Marinara 时不会有任何丢失。

## 导入整个 SillyTavern 文件夹

上面几节导入的是手头已有的世界书文件。你也可以直接从完整的 SillyTavern 安装文件夹里把世界书拉过来，这条路径还会一并抓取角色、聊天和预设，走的是另一个文件夹导入向导。参见[从 SillyTavern 导入](../data/importing-from-sillytavern.md)。

## 导入之后

导入的世界书立刻就能用关键词触发。如果你还用语义搜索（按含义匹配条目的那种检索方式），导入后需要重新构建它的向量。参见[世界书的语义搜索](semantic-search.md)。

## 相关指南

- [世界书总览](overview.md)
- [把世界书关联到角色和用户角色](linking-to-characters.md)
- [世界书的语义搜索](semantic-search.md)
- [从 SillyTavern 导入](../data/importing-from-sillytavern.md)
