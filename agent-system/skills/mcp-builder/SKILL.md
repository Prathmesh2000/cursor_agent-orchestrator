---
name: mcp-builder
description: Use when creating a new MCP (Model Context Protocol) server from scratch. Triggers: "create MCP server", "build MCP", "new MCP tool", "MCP server for", "expose [tool/API/DB] via MCP", or when a service needs to be accessible by an AI agent through the MCP protocol. MCP servers give AI agents structured access to tools, resources, and prompts.
---

# MCP Builder Skill

Design and implement production-ready MCP (Model Context Protocol) servers that expose tools, resources, and prompts to AI agents in Cursor, Claude Desktop, or any MCP-compatible client.

---

## MCP Architecture

```
MCP Client (Cursor / Claude Desktop / AI Agent)
         │  JSON-RPC 2.0 over stdio/SSE/HTTP
         ▼
    MCP Server
    ├── Tools     → Functions the AI can call (read files, run queries, call APIs)
    ├── Resources → Data the AI can read (files, DB records, API data)
    └── Prompts   → Reusable prompt templates with parameters
```

---

## MCP Server Structure

```
mcp-[name]/
  src/
    index.ts          ← Entry point + server init
    tools/
      [tool-name].ts  ← One file per tool
    resources/
      [resource].ts   ← Resource handlers
    prompts/
      [prompt].ts     ← Prompt templates
    utils/
      validators.ts   ← Input validation
      errors.ts       ← Error types
  package.json
  tsconfig.json
  README.md           ← Required: tool descriptions for AI
```

---

## Full MCP Server Implementation (TypeScript)

```typescript
// src/index.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { registerTools, handleToolCall } from './tools/index.js';
import { registerResources, handleResourceRead } from './resources/index.js';
import { registerPrompts, handlePromptGet } from './prompts/index.js';

const server = new Server(
  {
    name: 'my-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

// ── Tool Handlers ──────────────────────────────────────────────
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: registerTools(),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  return handleToolCall(name, args);
});

// ── Resource Handlers ──────────────────────────────────────────
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: registerResources(),
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  return handleResourceRead(request.params.uri);
});

// ── Prompt Handlers ────────────────────────────────────────────
server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: registerPrompts(),
}));

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  return handlePromptGet(request.params.name, request.params.arguments);
});

// ── Start ──────────────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Server running on stdio'); // stderr only
}

main().catch(console.error);
```

---

## Tool Implementation Pattern

```typescript
// src/tools/database-query.ts
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { db } from '../utils/database.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

// Schema for input validation
const QuerySchema = z.object({
  sql: z.string().min(1).max(2000),
  params: z.array(z.any()).optional().default([]),
  limit: z.number().int().min(1).max(1000).optional().default(100),
});

// Tool definition (shown to AI)
export const databaseQueryTool: Tool = {
  name: 'database_query',
  description: `Execute a read-only SQL query against the database.
    - Only SELECT statements allowed
    - Results capped at 1000 rows
    - Use for: exploring data, checking records, generating reports
    - Do NOT use for: INSERT, UPDATE, DELETE (use database_write tool)`,
  inputSchema: {
    type: 'object',
    properties: {
      sql: {
        type: 'string',
        description: 'SQL SELECT query to execute',
      },
      params: {
        type: 'array',
        description: 'Query parameters for parameterized queries ($1, $2...)',
        items: {},
      },
      limit: {
        type: 'number',
        description: 'Maximum rows to return (default: 100, max: 1000)',
        default: 100,
      },
    },
    required: ['sql'],
  },
};

// Tool handler
export async function handleDatabaseQuery(args: unknown) {
  const input = QuerySchema.parse(args);

  // Security: only allow SELECT
  const normalized = input.sql.trim().toUpperCase();
  if (!normalized.startsWith('SELECT')) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Only SELECT statements are allowed in database_query. Use database_write for mutations.'
    );
  }

  try {
    const result = await db.query(input.sql, input.params);
    const rows = result.rows.slice(0, input.limit);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            rowCount: rows.length,
            totalRows: result.rows.length,
            truncated: result.rows.length > input.limit,
            columns: result.fields.map(f => ({ name: f.name, type: f.dataTypeID })),
            rows,
          }, null, 2),
        },
      ],
    };
  } catch (error: any) {
    throw new McpError(
      ErrorCode.InternalError,
      `Query failed: ${error.message}`
    );
  }
}
```

```typescript
// src/tools/index.ts
import { databaseQueryTool, handleDatabaseQuery } from './database-query.js';
import { fileReadTool, handleFileRead } from './file-reader.js';
import { apiCallTool, handleApiCall } from './api-caller.js';

const TOOLS = {
  database_query: { definition: databaseQueryTool, handler: handleDatabaseQuery },
  file_read: { definition: fileReadTool, handler: handleFileRead },
  api_call: { definition: apiCallTool, handler: handleApiCall },
};

export function registerTools() {
  return Object.values(TOOLS).map(t => t.definition);
}

export async function handleToolCall(name: string, args: unknown) {
  const tool = TOOLS[name as keyof typeof TOOLS];
  if (!tool) {
    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }
  return tool.handler(args);
}
```

---

## Resource Implementation

```typescript
// src/resources/database-schema.ts
import { Resource } from '@modelcontextprotocol/sdk/types.js';
import { db } from '../utils/database.js';

export const schemaResource: Resource = {
  uri: 'db://schema',
  name: 'Database Schema',
  description: 'Current database schema — all tables, columns, and relationships',
  mimeType: 'application/json',
};

export async function handleSchemaRead() {
  const result = await db.query(`
    SELECT 
      table_name,
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `);

  // Group by table
  const schema = result.rows.reduce((acc, row) => {
    if (!acc[row.table_name]) acc[row.table_name] = [];
    acc[row.table_name].push({
      column: row.column_name,
      type: row.data_type,
      nullable: row.is_nullable === 'YES',
      default: row.column_default,
    });
    return acc;
  }, {});

  return {
    contents: [{
      uri: 'db://schema',
      mimeType: 'application/json',
      text: JSON.stringify(schema, null, 2),
    }],
  };
}
```

---

## Prompt Template

```typescript
// src/prompts/code-review.ts
export const codeReviewPrompt = {
  name: 'code_review',
  description: 'Review code for quality, security, and correctness',
  arguments: [
    { name: 'language', description: 'Programming language', required: true },
    { name: 'focus', description: 'Review focus: security | performance | all', required: false },
  ],
};

export function getCodeReviewPrompt(args: Record<string, string>) {
  const focus = args.focus || 'all';
  return {
    messages: [{
      role: 'user' as const,
      content: {
        type: 'text' as const,
        text: `Review the following ${args.language} code with focus on: ${focus}.
          
Check for:
${focus === 'security' || focus === 'all' ? '- Security vulnerabilities (injection, auth, data exposure)\n' : ''}
${focus === 'performance' || focus === 'all' ? '- Performance issues (N+1, memory leaks, blocking calls)\n' : ''}
- Correctness and edge cases
- Error handling completeness

Output format: Critical issues → Important issues → Minor issues → Summary`,
      },
    }],
  };
}
```

---

## package.json

```json
{
  "name": "mcp-[name]",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts",
    "test": "jest"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "tsx": "^4.0.0",
    "jest": "^29.0.0"
  }
}
```

---

## Cursor Integration (`.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["./mcp-my-server/dist/index.js"],
      "env": {
        "DATABASE_URL": "${DATABASE_URL}",
        "API_KEY": "${API_KEY}"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/project"]
    }
  }
}
```

---

## MCP Server README Template

```markdown
# MCP Server: [Name]

## What This Server Does
[1-paragraph description for AI agents]

## Tools
| Tool | Description | Required Params |
|---|---|---|
| database_query | Execute SELECT queries | sql |
| file_read | Read file contents | path |

## Resources
| URI | Description |
|---|---|
| db://schema | Current database schema |
| config://env | Available environment config |

## Prompts
| Name | Description |
|---|---|
| code_review | Code review prompt template |

## Setup
\`\`\`bash
npm install && npm run build
\`\`\`

## Environment Variables
| Variable | Required | Description |
|---|---|---|
| DATABASE_URL | Yes | PostgreSQL connection string |
```

Save to: `output/code/mcp-[name]/`
