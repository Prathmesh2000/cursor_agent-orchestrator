---
name: "mcp-integrator"
description: "Use when integrating with existing MCP servers, configuring MCP clients, chaining multiple MCP tools in a workflow, or debugging MCP connections. Triggers: \"integrate MCP\", \"connect to MCP server\", \"configure MCP\", \"use MCP tool\", \"MCP not working\", \"chain MCP tools\", or when an AI agent needs to use tools from an MCP server that already exists."
---


# MCP Integrator Skill

Configure MCP clients, integrate with existing MCP servers, chain tools across multiple servers, and debug MCP connections.

---

## Common MCP Server Registry

```
Official Anthropic servers (use npx — no install needed):
  @modelcontextprotocol/server-filesystem    → Read/write local files
  @modelcontextprotocol/server-github        → GitHub repos, PRs, issues
  @modelcontextprotocol/server-postgres      → PostgreSQL queries
  @modelcontextprotocol/server-sqlite        → SQLite queries
  @modelcontextprotocol/server-puppeteer     → Browser automation
  @modelcontextprotocol/server-brave-search  → Web search
  @modelcontextprotocol/server-fetch         → HTTP requests
  @modelcontextprotocol/server-slack         → Slack messages/channels
  @modelcontextprotocol/server-google-drive  → Google Drive files
  @modelcontextprotocol/server-memory        → Persistent key-value memory

Community servers (curated):
  @upstash/mcp-server-redis                  → Redis operations
  mcp-server-docker                          → Docker container management
  mcp-server-kubernetes                      → K8s resources
  mcp-server-aws                             → AWS services
  mcp-server-jira                            → Jira tickets
  mcp-server-linear                          → Linear issues
  mcp-server-notion                          → Notion pages/databases
```

---

## Cursor MCP Configuration

### `.cursor/mcp.json` (Project-level)

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/absolute/path/to/project",
        "/absolute/path/to/docs"
      ]
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_URL": "postgresql://user:pass@localhost:5432/mydb"
      }
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "custom-server": {
      "command": "node",
      "args": ["./mcp-custom/dist/index.js"],
      "env": {
        "API_URL": "https://api.example.com",
        "API_KEY": "${API_KEY}"
      }
    }
  }
}
```

### `~/.cursor/mcp.json` (Global — all projects)

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    },
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "${BRAVE_API_KEY}"
      }
    }
  }
}
```

---

## Claude Desktop Configuration

### `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/username/Documents",
        "/Users/username/projects"
      ]
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_URL": "postgresql://localhost:5432/mydb"
      }
    }
  }
}
```

---

## Programmatic MCP Client (Node.js)

```typescript
// For custom agents that need to call MCP servers directly
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

class MCPClientManager {
  private clients: Map<string, Client> = new Map();

  async connect(name: string, command: string, args: string[], env?: Record<string, string>) {
    const transport = new StdioClientTransport({
      command,
      args,
      env: { ...process.env, ...env },
    });

    const client = new Client({ name: 'my-agent', version: '1.0.0' }, { capabilities: {} });
    await client.connect(transport);

    this.clients.set(name, client);
    return client;
  }

  async listTools(serverName: string) {
    const client = this.clients.get(serverName);
    if (!client) throw new Error(`Server ${serverName} not connected`);
    return client.listTools();
  }

  async callTool(serverName: string, toolName: string, args: Record<string, unknown>) {
    const client = this.clients.get(serverName);
    if (!client) throw new Error(`Server ${serverName} not connected`);

    return client.callTool({ name: toolName, arguments: args });
  }

  async readResource(serverName: string, uri: string) {
    const client = this.clients.get(serverName);
    if (!client) throw new Error(`Server ${serverName} not connected`);
    return client.readResource({ uri });
  }

  async disconnectAll() {
    for (const [name, client] of this.clients) {
      await client.close();
      this.clients.delete(name);
    }
  }
}

// Usage
const manager = new MCPClientManager();

await manager.connect(
  'postgres',
  'npx',
  ['-y', '@modelcontextprotocol/server-postgres'],
  { POSTGRES_URL: process.env.DATABASE_URL }
);

await manager.connect(
  'filesystem',
  'npx',
  ['-y', '@modelcontextprotocol/server-filesystem', '/app']
);

// Chain tools — read schema, then generate query, then execute
const schema = await manager.readResource('postgres', 'postgres://schema');
const queryResult = await manager.callTool('postgres', 'query', {
  sql: 'SELECT * FROM users WHERE created_at > $1',
  params: ['2024-01-01'],
});
```

---

## Multi-Server Tool Chaining

```typescript
// Pattern: Chain multiple MCP servers in an AI workflow
async function analyzeCodeAndCreateIssue(filePath: string) {
  // 1. Read file via filesystem MCP
  const fileContent = await manager.readResource('filesystem', `file://${filePath}`);
  
  // 2. Search for similar issues via GitHub MCP
  const existingIssues = await manager.callTool('github', 'search_issues', {
    query: 'bug label:bug state:open',
    repo: 'owner/repo',
  });

  // 3. AI analysis (using the gathered context)
  const analysis = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `Analyze this code and create a bug report if issues found.
      
File: ${filePath}
Content: ${fileContent.contents[0].text}
Similar existing issues: ${JSON.stringify(existingIssues)}`,
    }],
  });

  // 4. Create GitHub issue if bugs found
  if (analysis.content[0].text.includes('BUG_FOUND')) {
    await manager.callTool('github', 'create_issue', {
      repo: 'owner/repo',
      title: `Bug in ${filePath}`,
      body: analysis.content[0].text,
      labels: ['bug', 'auto-detected'],
    });
  }
}
```

---

## Debugging MCP Connections

```bash
# Test an MCP server directly via stdin/stdout
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' \
  | npx -y @modelcontextprotocol/server-filesystem /tmp

# Inspect available tools
echo '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' \
  | npx -y @modelcontextprotocol/server-postgres

# Enable debug logging (most servers)
MCP_DEBUG=1 node ./mcp-server/dist/index.js

# Check if server is running (Cursor)
# Open Cursor → Settings → MCP → should show server as "connected"
```

### Common Issues

| Problem | Cause | Fix |
|---|---|---|
| Server not showing in Cursor | Config JSON syntax error | Validate JSON in `.cursor/mcp.json` |
| `spawn ENOENT` | Command not found | Use full path or `npx -y` prefix |
| Tool calls return empty | Tool not implemented | Check server logs via `MCP_DEBUG=1` |
| `Permission denied` | File path not in allowed list | Add path to filesystem server args |
| Env vars not passed | Missing from config | Add to `"env"` in mcp.json |
| Server disconnects | Process crash | Check stderr — add `MCP_DEBUG=1` |

---

## Integration Verification Checklist

```
After configuring MCP integration:
- [ ] Server appears in Cursor MCP settings as "connected"
- [ ] Tools list is visible (Cursor shows tool count)
- [ ] Test call to each tool returns expected result
- [ ] Error handling works (bad params → informative error)
- [ ] Env vars loaded correctly (not exposed in logs)
- [ ] Multiple servers don't conflict (unique names)
- [ ] Server restarts cleanly if crashed
```

Save configs to: `output/code/mcp-config/`
