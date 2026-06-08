# 算式找茬

面向小学生的四则运算找茬小游戏。系统会随机生成 1 个错误算式和 3 个正确算式，玩家需要在倒计时内找出错误算式。游戏会根据错误原因记录错题，并支持按错题模板进行专项练习。

## 功能特性

- 每题 20 秒倒计时，使用时钟指针展示剩余时间。
- 随机题目包含 1 个错题和 3 个正确算式。
- 答对后有明显反馈，答错或超时会显示正确答案和错误原因。
- 自动记录错题集，并按错误归因分类。
- 支持专项练习页面，可针对每种错题模板生成 10 道同类练习题。
- 支持 Android APK 封装，可安装到平板上离线游玩。
- 包含沉浸式 BGM、按钮音效、正确和错误反馈音效。
- 支持积分、连胜 Combo、全对奖励和本地历史排行榜。

## 错题模板

当前内置 5 类常见错误：

1. 加法进位漏算
2. 减法退位忘记
3. 乘法口诀记错
4. 除法商算错
5. 混合运算先加后乘
6. 多数字加减漏算
7. 多数字乘加顺序错

## 积分规则

- 每次随机找茬训练共 20 题。
- 答对加 1 分，答错扣 2 分。
- 从 3 连胜开始，答对每题加 2 分。
- 连胜时会显示 `x5连胜` 这类飘字，数字为真实连胜数。
- 答错会中断连胜。
- 全部答对额外奖励 10 分。
- 每次挑战结束后，分数会保存到本地排行榜。

## 本地运行

这是一个静态 Web 项目，可以直接打开 `index.html`，也可以启动本地静态服务：

```bash
python3 -m http.server 5173
```

然后访问：

```text
http://localhost:5173
```

## Android APK 构建

项目已经包含一个最小 Android WebView 封装工程，位于 `android/` 目录。Web 资源会打包进 APK 的 `assets`，不依赖网络。

### 环境要求

- Android Studio 或 Android SDK
- Gradle
- JDK

macOS 如果已经通过 Homebrew 安装 OpenJDK，但 `java -version` 不可用，可以在构建命令中显式设置 `JAVA_HOME`。

### 构建 Debug APK

```bash
cd android
JAVA_HOME=/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home \
ANDROID_HOME=$HOME/Library/Android/sdk \
gradle :app:assembleDebug --no-daemon
```

构建产物：

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

### 安装到 Android 设备

设备开启 USB 调试后执行：

```bash
$HOME/Library/Android/sdk/platform-tools/adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## 项目结构

```text
.
├── index.html
├── styles.css
├── script.js
├── android/
│   ├── settings.gradle
│   ├── build.gradle
│   └── app/
│       ├── build.gradle
│       └── src/main/
│           ├── AndroidManifest.xml
│           ├── assets/
│           ├── java/
│           └── res/
└── README.md
```

## 发布说明

`.gitignore` 已忽略 Android 和 Gradle 构建产物，例如 `android/.gradle/`、`android/build/`、`android/app/build/` 和 APK 文件。发布到 GitHub 时建议提交源码和 Android 工程配置，不提交本地构建产物。

## 音频资源

音频文件位于 `assets/audio/`，来源和许可证记录在 `assets/audio/README.md`。当前使用的音频均来自 OpenGameArt，许可证为 CC0。
