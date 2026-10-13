# Conversation Mode 个人资料（显示名称、自我介绍、行为指令）

本指南介绍每个角色和用户角色在 Conversation(对话模式) 里都会有的一份小资料。个人资料分三块：一个显示名称、一段自我介绍，还有一条行为指令。这些字段的用法和聊天软件里的个人资料一样（可以想想 Discord）。它们只在 Conversation 模式下生效，Roleplay(角色扮演) 和 Game Mode(游戏模式) 里从不使用。

Conversation 模式就是私信、即时通讯风格的聊天。第一次接触的话，先读 [Conversation 模式：入门](getting-started.md)。用户角色就是聊天里代表你本人（也就是 `{{user}}`）的那份资料。

## 这些字段在哪里

每个资料字段都在名为 **Convo**(对话) 的选项卡里。角色和用户角色都有这个选项卡。

1. 编辑角色的个人资料：在 **Character Editor**(角色编辑器) 里打开角色，点击 **Convo** 选项卡。
2. 编辑用户角色的个人资料：在 **Persona Editor**(用户角色编辑器) 里打开用户角色，点击 **Convo** 选项卡。

**Convo** 选项卡里有三个字段：**Convo Display Name**、**About Me** 和 **Convo Behavior**。角色和用户角色的这三项完全一样，只有一处小差别，下面会说明。

## Convo Display Name

**Convo Display Name**(对话显示名称) 是这个角色或用户角色在 Conversation 模式聊天里显示的名字。留空就沿用卡片本身的名字。改动之后，已有消息上的名字会立刻跟着变。它只影响 Conversation 模式。

角色（用户角色没有）还多一个复选框：**Declare this name on the card in the prompt**(在提示词的角色卡里声明这个名字)。开启后，Marinara 会在角色卡文本里加上一句短说明，告诉模型哪张卡对应哪个显示名称。要用这个复选框，得先填好显示名称。

`{{convo_display}}` 宏可以把正在回复的角色的显示名称放进自定义提示词。宏就是 `{{convo_display}}` 这样的占位符，实际发送时会替换成真正的文本。在 Conversation 模式之外，它解析为空。参见[宏](../prompts/macros.md)。

## About Me

**About Me**(自我介绍) 是角色或用户角色的一段简短自述，会在 Conversation 模式里显示。可以写一两句话，可以只放一个 emoji，可以是个玩笑，也可以完全空着。文本框工具栏上有一个 emoji 按钮，方便直接往自述里插 emoji。

这段自述不只是装饰。默认情况下，Marinara 每一轮都会把在场每个角色和用户角色的 **About Me** 加进提示词，形式是一份简短的参与者资料列表。这样模型始终清楚每个人是怎么介绍自己的。这个过程不需要任何手动设置。

### 用 Professor Mari 写 About Me

自述不一定要自己写。从主页打开 Professor Mari，让她给指定的角色或用户角色写一段 **About Me**，或者改写现有的。她会先读取已保存的资料，再用那个人的口吻写一段简短的自述，然后直接存进真正的 **About Me** 字段。

比如可以这样说：`Write Luna's About Me as a cryptic one-line bio.` 也可以要求改写，例如把现有的自述改得更好笑、更短、更亲切，或者更贴合角色卡。

Professor Mari 用的是她自己配置好的模型。角色编辑器和用户角色编辑器里没有单独的 About Me 连接、来源选择器或生成按钮。她保存的改动会走平常的审核流程，你可以选择保留或恢复。在编辑器里手动修改时仍然有 **Revert**(恢复) 按钮，它会把文本恢复到这次编辑之前的状态。

## Convo Behavior

**Convo Behavior**(对话行为) 是一条自由文本指令，规定角色或用户角色在 Conversation 模式里该怎么表现。比如：回复要短、全部小写，像真人发消息而不是旁白叙述。这条指令在 Roleplay 和 Game Mode 里绝不会发送。

### Insertion(指令放在哪里)

**Convo Behavior** 输入框下面是 **Insertion**(插入位置) 下拉菜单，用来决定这条指令在提示词里的位置。可选项有：

- **Constant** 里标着“after the card”的那项（默认）：始终加入，紧跟在角色卡文本之后。
- **Constant** 里标着“before the card”的那项：始终加入，紧挨在角色卡文本之前。
- **Append to post-history**：加在 post-history 指令的末尾。
- **Prepend to post-history**：加在 post-history 指令的开头。
- **Replace post-history**：用它取代 post-history 指令。
- **Only where `{{convo_behavior}}` is placed**：只插入到你在自定义提示词里放 `{{convo_behavior}}` 宏的位置。

post-history 指令是应用放在最近聊天记录之后的一段提示词文本。如果不写自定义提示词，保持默认即可。

## 单个聊天专属的 About Me 覆盖

卡片上的 **About Me** 是各处通用的默认自述。也可以只给某一个聊天设置不同的自述，这就是聊天专属覆盖，入口在个人资料弹出卡里。

1. 在 Conversation 模式的聊天里，点击角色或用户角色的头像或名字。
2. 头像旁边会弹出一张小资料卡。手机上则从底部滑出。
3. 卡片上有放大的头像、名字和当前的 **About Me**。
4. 有一个标记：显示卡片自述时是 **Default**，使用了单聊天覆盖时是 **Chat-specific**。角色还会在这里显示状态：**Online**、**Away**、**Busy** 或 **Offline**。

设置覆盖的步骤：

1. 在弹出卡里点击 **Edit**(编辑)。
2. 输入这个聊天专用的自述。会有一个 emoji 选择器，其中包含 **Custom emojis** 选项卡。
3. 点击 **Save**(保存)。应该会看到一条提示，说明聊天专属的自我介绍已保存。

编辑过程中，**Revert** 按钮可以撤销未保存的改动，**Cancel**(取消) 则不保存直接退出编辑模式。已经存在覆盖时，**Clear**(清除) 按钮会删掉它，回到卡片上的默认值。保存一段空白自述同样会清除覆盖。记住：默认的 **About Me** 在卡片上编辑，覆盖只在那一个聊天里生效。

## 让角色按需自己更新 About Me

还有一个叫 **update_about_me** 的工具，角色可以在聊天当下调用它来改自己的自述。它默认关闭。在 **Chat Settings**(聊天设置) 的 **Function Calling**(函数调用) 部分开启：打开 **Enable Tool Use**(启用工具调用)，再添加 **update_about_me** 工具。

开启之后，角色可以用两种方式更新自己的自述：

- Public 范围改的是所有聊天里都能看到的真实自述，这种改动会先交给你确认。
- Chat 范围改动的自述只在当前这次聊天里可见。

## 在自定义提示词里使用这些资料

资料要送到模型那里并不需要宏。**About Me** 自述会自动加进提示词，**Convo Behavior** 则按 **Insertion** 的设置走。宏是给自定义提示词用的，适合想亲手把某个值放到确切位置的时候。

有四个宏可以把这些资料值直接嵌进去。在 Conversation 模式之外，它们都解析为空：

- `{{convo_display}}`：正在回复的角色的显示名称。
- `{{char_about}}`：角色实际生效的 **About Me**。
- `{{persona_about}}`：用户角色实际生效的 **About Me**。
- `{{convo_behavior}}`：角色的 **Convo Behavior** 指令。

完整宏列表见[宏](../prompts/macros.md)。

## 相关指南

- [Conversation 模式：入门](getting-started.md)
- [创建和编辑角色](../characters/creating-and-editing-characters.md)
- [用户角色：创建与编辑](../characters/personas.md)
- [可下载智能体参考](../agents/built-in-agents.md)
- [宏](../prompts/macros.md)
