# LLM Provider 配置指南

本文档说明如何修改 Get It 应用使用的 LLM provider。

## 当前架构

Get It 目前使用 **Codex CLI** (@openai/codex-sdk) 作为 LLM provider，配置在 `lib/codex.ts` 中。

## 可选方案

### 方案 1：修改 Codex CLI 的配置

如果你想继续使用 Codex CLI，但修改其配置（如模型、base URL 等），可以通过以下方式：

#### 1.1 修改配置文件

编辑 `~/.codex/config.toml`：

```toml
model_provider = "custom"
model = "gpt-5.5"

[model_providers.custom]
name = "custom"
wire_api = "responses"
requires_openai_auth = true
base_url = "https://api.bluesminds.com/v1"
```

**配置项说明：**
- `model_provider`: 使用的 provider 名称
  - `"chatgpt"` - OpenAI 官方
  - `"custom"` - 自定义 API
- `model`: 模型名称（如 `gpt-5.5`, `gpt-4`, `claude-3-5-sonnet-20241022` 等）
- `base_url`: API 端点 URL

#### 1.2 修改代码中的模型

编辑 `lib/codex.ts` 的第 53 行：

```typescript
export const CODEX_MODEL = "gpt-5.5"; // 改成你想要的模型
```

---

### 方案 2：切换到 Claude Code CLI

如果你想使用 Claude Code CLI 而不是 Codex CLI：

#### 2.1 安装 Claude Code CLI

```bash
# 如果还没安装
brew install claude-code
# 或从 https://claude.ai/download 下载
```

#### 2.2 修改 `lib/codex.ts`

将整个文件替换为调用 Claude CLI 的实现：

```typescript
import { spawn } from "node:child_process";
import { CODEX_SCRATCH_DIR } from "./paths";
import { CodexError, classifyCodexError } from "./codex-errors";

export type RunOptions = {
  reasoning?: "low" | "medium" | "high";
  webSearch?: boolean;
  signal?: AbortSignal;
};

export async function runJson<T>(
  prompt: string,
  outputSchema: object,
  opts: RunOptions = {},
): Promise<{ data: T; usage: unknown }> {
  return new Promise((resolve, reject) => {
    const jsonPrompt = `${prompt}\n\nRespond with valid JSON matching this schema:\n${JSON.stringify(outputSchema, null, 2)}`;
    
    const claude = spawn("claude", ["--model", "sonnet", "--output", "text"], {
      cwd: CODEX_SCRATCH_DIR,
      signal: opts.signal,
    });

    let stdout = "";
    let stderr = "";

    claude.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    claude.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    claude.stdin.write(jsonPrompt);
    claude.stdin.end();

    claude.on("close", (code) => {
      if (code === 0) {
        try {
          const cleaned = stdout.trim().replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
          const data = JSON.parse(cleaned) as T;
          resolve({ data, usage: {} });
        } catch (err) {
          reject(new CodexError("generic", `Failed to parse JSON: ${err.message}`));
        }
      } else {
        reject(new CodexError("generic", `Claude CLI exited with code ${code}: ${stderr}`));
      }
    });

    claude.on("error", (err) => {
      reject(new CodexError("generic", `Failed to spawn Claude CLI: ${err.message}`));
    });
  });
}

// 保留其他 health 相关的导出...
export { CodexError, classifyCodexError, toCodexErrorPayload } from "./codex-errors";
export type { CodexErrorKind } from "./codex-errors";
// ... (复制原有的 CodexHealth 相关代码)
```

---

### 方案 3：使用自定义 OpenAI 兼容 API

如果你想使用其他 OpenAI 兼容的 API（如 vLLM、Ollama、LM Studio 等）：

#### 3.1 修改 `lib/codex.ts`

```typescript
import { CodexError, classifyCodexError } from "./codex-errors";

export type RunOptions = {
  reasoning?: "low" | "medium" | "high";
  webSearch?: boolean;
  signal?: AbortSignal;
};

const BASE_URL = "https://api.example.com/v1"; // 你的 API 端点
const MODEL = "gpt-4"; // 你的模型名称

export async function runJson<T>(
  prompt: string,
  outputSchema: object,
  opts: RunOptions = {},
): Promise<{ data: T; usage: unknown }> {
  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // 如果需要 API key，取消注释下一行
        // "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        response_format: { 
          type: "json_schema", 
          json_schema: { strict: true, schema: outputSchema } 
        },
      }),
      signal: opts.signal,
    });

    if (!response.ok) {
      throw new CodexError("generic", `API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";
    const cleaned = content.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    const parsed = JSON.parse(cleaned) as T;

    return { data: parsed, usage: data.usage ?? {} };
  } catch (err) {
    throw classifyCodexError(err);
  }
}

// 保留其他导出...
export { CodexError, classifyCodexError, toCodexErrorPayload } from "./codex-errors";
export type { CodexErrorKind } from "./codex-errors";
```

---

## 环境变量配置

如果需要 API Key，在 `.env.local` 中添加：

```bash
# OpenAI API
OPENAI_API_KEY=sk-...

# Anthropic API
ANTHROPIC_API_KEY=sk-ant-...

# 自定义 API
CUSTOM_API_KEY=your-key-here
CUSTOM_API_BASE_URL=https://api.example.com/v1
```

然后在代码中使用：

```typescript
const API_KEY = process.env.OPENAI_API_KEY;
const BASE_URL = process.env.CUSTOM_API_BASE_URL || "https://api.openai.com/v1";
```

---

## 验证配置

修改后，重启开发服务器并测试：

```bash
# 重启服务器
npm run browser:dev

# 在浏览器中：
# 1. 上传一个 PDF
# 2. 点击一个 tag
# 3. 检查是否成功生成可视化
```

如果出现错误，检查：
1. **浏览器控制台** - 查看前端错误
2. **终端日志** - 查看后端错误
3. **Network 面板** - 查看 API 请求是否成功

---

## 常见问题

### Q: 修改后可视化生成失败

**A:** 检查以下几点：
1. 新的 LLM provider 是否支持 JSON schema 输出
2. API endpoint 是否可访问
3. API key 是否正确配置
4. 模型名称是否正确

### Q: 如何查看 LLM 调用日志？

**A:** 在 `lib/codex.ts` 的 `runJson` 函数中添加日志：

```typescript
console.log("Calling LLM with prompt:", prompt.substring(0, 100));
console.log("Response:", data);
```

### Q: 不同的 provider 有什么区别？

| Provider | 优点 | 缺点 |
|----------|------|------|
| **Codex CLI** | 官方集成、稳定、功能完整 | 依赖 Codex CLI 安装 |
| **Claude Code CLI** | Anthropic 官方、Claude 模型 | 需要单独安装 CLI |
| **自定义 API** | 灵活、可自托管 | 需要自己维护兼容性 |

---

## 支持

如果遇到问题：
1. 检查 [Codex SDK 文档](https://github.com/openai/codex-sdk)
2. 检查 [Claude Code 文档](https://claude.ai/code)
3. 提交 Issue 到项目仓库

---

**最后更新：** 2026-06-16
