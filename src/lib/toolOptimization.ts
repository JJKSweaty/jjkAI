// Compact tool schemas for reduced token usage
export interface CompactToolConfig {
  enabled: boolean;
  schema: 'minimal' | 'standard' | 'full';
  essentialFields: string[];
  maxResults?: number;
}

// Tool configurations by depth mode
export const TOOL_CONFIGS = {
  Quick: {
    enabled: false,
    schema: 'minimal',
    essentialFields: ['result'],
    maxResults: 3
  },
  Standard: {
    enabled: true,
    schema: 'minimal',
    essentialFields: ['result', 'source'],
    maxResults: 5
  },
  DeepDive: {
    enabled: true,
    schema: 'full',
    essentialFields: ['result', 'source', 'metadata', 'context'],
    maxResults: 10
  }
} as const;

// Compact tool schemas (reduced descriptions and keys)
export const COMPACT_TOOL_SCHEMAS = {
  // File operations
  read_file: {
    minimal: {
      desc: "Read file content",
      params: {
        path: { type: "string", desc: "File path" },
        lines: { type: "string", desc: "Line range (1-50)" }
      }
    },
    standard: {
      description: "Read file content with line range",
      parameters: {
        filePath: { type: "string", description: "Absolute file path" },
        startLine: { type: "number", description: "Start line" },
        endLine: { type: "number", description: "End line" }
      }
    }
  },

  // Search operations
  search: {
    minimal: {
      desc: "Search workspace",
      params: {
        q: { type: "string", desc: "Search query" },
        max: { type: "number", desc: "Max results" }
      }
    },
    standard: {
      description: "Search workspace files and content",
      parameters: {
        query: { type: "string", description: "Search query" },
        maxResults: { type: "number", description: "Maximum results to return" },
        filePattern: { type: "string", description: "Optional file pattern filter" }
      }
    }
  },

  // Terminal operations
  run_cmd: {
    minimal: {
      desc: "Run terminal command",
      params: {
        cmd: { type: "string", desc: "Command to run" },
        bg: { type: "boolean", desc: "Run in background" }
      }
    },
    standard: {
      description: "Execute terminal command",
      parameters: {
        command: { type: "string", description: "Shell command to execute" },
        workingDirectory: { type: "string", description: "Working directory" },
        isBackground: { type: "boolean", description: "Run as background process" }
      }
    }
  },

  // File editing
  edit_file: {
    minimal: {
      desc: "Edit file content",
      params: {
        path: { type: "string", desc: "File path" },
        old: { type: "string", desc: "Text to replace" },
        new: { type: "string", desc: "Replacement text" }
      }
    },
    standard: {
      description: "Replace text in file",
      parameters: {
        filePath: { type: "string", description: "File to edit" },
        oldString: { type: "string", description: "Exact text to replace" },
        newString: { type: "string", description: "New text content" }
      }
    }
  }
};

// Tool response compressor - returns only essential fields
export class ToolResponseCompressor {
  
  compress(toolName: string, response: any, config: CompactToolConfig): any {
    if (!config.enabled) return null;
    
    switch (config.schema) {
      case 'minimal':
        return this.extractMinimal(toolName, response, config.essentialFields);
      case 'standard':
        return this.extractStandard(toolName, response, config.essentialFields);
      case 'full':
        return response; // No compression
      default:
        return response;
    }
  }

  private extractMinimal(toolName: string, response: any, essentialFields: string[]): any {
    if (typeof response === 'string') {
      return { result: response.substring(0, 500) + (response.length > 500 ? '...' : '') };
    }
    
    if (Array.isArray(response)) {
      return {
        results: response.slice(0, 3).map(item => 
          typeof item === 'string' ? item.substring(0, 100) : this.extractFields(item, essentialFields)
        ),
        total: response.length
      };
    }
    
    return this.extractFields(response, essentialFields);
  }

  private extractStandard(toolName: string, response: any, essentialFields: string[]): any {
    if (typeof response === 'string') {
      return { 
        result: response.substring(0, 1000) + (response.length > 1000 ? '...' : ''),
        length: response.length 
      };
    }
    
    if (Array.isArray(response)) {
      return {
        results: response.slice(0, 5).map(item => this.extractFields(item, essentialFields)),
        total: response.length,
        hasMore: response.length > 5
      };
    }
    
    return this.extractFields(response, essentialFields);
  }

  private extractFields(obj: any, fields: string[]): any {
    if (!obj || typeof obj !== 'object') return obj;
    
    const result: any = {};
    fields.forEach(field => {
      if (obj[field] !== undefined) {
        result[field] = obj[field];
      }
    });
    
    return result;
  }
}

// Tool usage optimizer - reduces unnecessary tool calls
export class ToolUsageOptimizer {
  private recentTools = new Map<string, { count: number, lastUsed: number }>();
  private maxRecentTools = 10;
  private cooldownMs = 5000; // 5 second cooldown for repeated tools

  shouldUseTool(toolName: string, depthMode: string, query: string): boolean {
    const config = TOOL_CONFIGS[depthMode as keyof typeof TOOL_CONFIGS];
    
    // Check if tools are enabled for this depth mode
    if (!config.enabled) return false;
    
    // Check cooldown for repeated tool usage
    const recent = this.recentTools.get(toolName);
    const now = Date.now();
    
    if (recent && (now - recent.lastUsed) < this.cooldownMs && recent.count > 2) {
      console.log(`[ToolOptimizer] Tool ${toolName} on cooldown`);
      return false;
    }
    
    // Update usage tracking
    this.updateToolUsage(toolName, now);
    
    return true;
  }

  private updateToolUsage(toolName: string, timestamp: number): void {
    const existing = this.recentTools.get(toolName);
    if (existing) {
      existing.count += 1;
      existing.lastUsed = timestamp;
    } else {
      this.recentTools.set(toolName, { count: 1, lastUsed: timestamp });
    }
    
    // Cleanup old entries
    if (this.recentTools.size > this.maxRecentTools) {
      const entries = Array.from(this.recentTools.entries());
      entries.sort((a, b) => a[1].lastUsed - b[1].lastUsed);
      entries.slice(0, 5).forEach(([key]) => {
        this.recentTools.delete(key);
      });
    }
  }

  getToolSchema(toolName: string, depthMode: string): any {
    const config = TOOL_CONFIGS[depthMode as keyof typeof TOOL_CONFIGS];
    const schemas = COMPACT_TOOL_SCHEMAS[toolName as keyof typeof COMPACT_TOOL_SCHEMAS];
    
    if (!schemas) return null;
    
    return schemas[config.schema as keyof typeof schemas] || schemas.standard;
  }

  // Reset cooldowns (call when starting new conversation)
  reset(): void {
    this.recentTools.clear();
  }
}

// Batch tool execution for efficiency
export class ToolBatcher {
  private pendingBatch: Array<{ tool: string, params: any, resolve: Function, reject: Function }> = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private batchDelayMs = 100; // 100ms batch window

  async executeTool(toolName: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.pendingBatch.push({ tool: toolName, params, resolve, reject });
      
      if (!this.batchTimeout) {
        this.batchTimeout = setTimeout(() => {
          this.processBatch();
        }, this.batchDelayMs);
      }
    });
  }

  private async processBatch(): Promise<void> {
    if (this.pendingBatch.length === 0) return;
    
    const batch = [...this.pendingBatch];
    this.pendingBatch = [];
    this.batchTimeout = null;
    
    console.log(`[ToolBatcher] Processing batch of ${batch.length} tools`);
    
    // Group by tool type for potential parallel execution
    const groupedTools = batch.reduce((groups, item) => {
      if (!groups[item.tool]) groups[item.tool] = [];
      groups[item.tool].push(item);
      return groups;
    }, {} as Record<string, typeof batch>);
    
    // Execute each group
    for (const [toolName, tools] of Object.entries(groupedTools)) {
      try {
        // For now, execute sequentially within each tool type
        // In production, implement actual tool execution logic here
        for (const toolCall of tools) {
          const result = await this.executeActualTool(toolCall.tool, toolCall.params);
          toolCall.resolve(result);
        }
      } catch (error) {
        tools.forEach(toolCall => toolCall.reject(error));
      }
    }
  }

  private async executeActualTool(toolName: string, params: any): Promise<any> {
    // Placeholder for actual tool execution
    // In production, this would call the real tool functions
    console.log(`[ToolBatcher] Executing ${toolName} with params:`, params);
    return { result: `${toolName} executed successfully`, params };
  }
}

// Export instances
export const toolResponseCompressor = new ToolResponseCompressor();
export const toolUsageOptimizer = new ToolUsageOptimizer();
export const toolBatcher = new ToolBatcher();