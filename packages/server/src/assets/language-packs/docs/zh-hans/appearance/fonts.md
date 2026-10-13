# 自定义字体与 Google Fonts

本指南介绍如何更换 Marinara Engine 全局使用的字体。可以直接用内置字体，也可以放入自己的字体文件，还能按名字从 Google Fonts 下载。

## 选择应用字体

字体设置在 **Settings**(设置) 的 **Appearance**(外观) 选项卡里，位于 **Text & Scale**(文字与缩放) 区域。

1. 打开 **Settings**，点击 **Appearance** 选项卡。
2. 找到 **Text & Scale** 区域。
3. 打开 **Font**(字体) 下拉菜单。
4. 从列表里选一款字体。

默认是 **Default (Inter)**。Inter 是一款为屏幕阅读挑选的清爽字体。自己添加的字体会出现在同一个 **Font** 下拉菜单里，排在默认项下面。

字体选择会跨设备同步。选定一款字体后，连到同一台 Marinara 服务器的所有浏览器和设备都会跟着切换。想了解同步的原理，见[设置总览](../settings/settings-overview.md)。

## 添加自己的字体

把字体文件放进服务器上的一个文件夹，就能添加自定义字体。这里说的服务器，就是运行 Marinara 的那台机器。

1. 在服务器机器上，找到 Marinara 数据文件夹里的 `data/fonts/` 文件夹。
2. 把字体文件复制进去。
3. 回到 **Settings**，依次进入 **Appearance**、**Text & Scale**。
4. 打开 **Font** 下拉菜单，字体已经出现在列表里。
5. 选中它。

Marinara 能读取这几种字体文件格式：`.ttf`、`.otf`、`.woff` 和 `.woff2`。其他后缀的文件一律忽略。

Marinara 会根据文件名生成显示名称。例如文件 `OpenSans-Bold.ttf` 会显示成“Open Sans”。想让列表整齐一点，文件名就起得清楚一些。

`data/fonts/` 文件夹里的字体文件存在服务器上，连到同一台 Marinara 服务器的所有设备都能用。字体选择在这些设备之间同样会同步，所以看到的字体都一样。

## 从 Google Fonts 下载

Marinara 可以直接替你从 Google Fonts 取字体。这需要服务器能连接互联网。

1. 打开 **Settings**，依次进入 **Appearance**、**Text & Scale**。
2. 找到 **Google Fonts** 输入框。
3. 输入准确的字体名，例如 `Fira Code` 或 `Lora`。
4. 点击 **Add**(添加)。
5. 等下载完成，新字体随后会出现在 **Font** 下拉菜单里。

名字要和 Google Fonts 上的写法完全一致。输入框旁边有 **Browse fonts at fonts.google.com** 链接，点击会在新标签里打开 Google Fonts 网站，方便查名字。

名字只能包含字母、数字和空格。之后再下载同一款字体时，Marinara 会替换旧的那份，不会重复添加。

下载失败时，先看报错信息。连不上 Google Fonts 时，Marinara 会提示检查网络连接。提示找不到字体则有两种可能：一是名字和 Google Fonts 上的字体对不上；二是这款字体没有 regular(400) 字重，也就是常规的非粗体样式。请核对拼写，并在 Google Fonts 网站上确认这款字体提供 Regular 样式。

## Open Fonts Folder 只对本机有效

**Font** 下拉菜单旁边有一个 **Open Fonts Folder**(打开字体文件夹) 按钮，它会在服务器机器的文件管理器里打开 `data/fonts/` 文件夹。

这个按钮操作的是服务器，而不是正在浏览 Marinara 的这台设备。如果 Marinara 就跑在自己的电脑上，它会正常打开文件夹；如果是从手机或另一台电脑连过来的，这个按钮对你没有用。这种情况下，自己把字体文件复制到服务器的 `data/fonts/` 文件夹里。

## 相关指南

- [外观设置](appearance-settings.md)
