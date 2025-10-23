'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { Card } from '@/components/ui/card';

export function ReasoningTest() {
  const [showReasoning, setShowReasoning] = useState(false);

  const testMessage = {
    role: 'assistant' as const,
    content: `Based on my analysis, here's how to implement a secure authentication system:

\`\`\`typescript
// JWT Authentication with refresh tokens
const authConfig = {
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
  algorithm: 'RS256'
};
\`\`\`

This approach provides both security and user convenience.`,
    reasoning: showReasoning ? {
      content: `Let me think through this authentication problem step by step.

First, I need to consider the security requirements:
1. User sessions should be secure
2. Tokens shouldn't be long-lived
3. We need refresh capability

The main approaches are:
- Session cookies (server-side storage)
- JWT tokens (stateless)
- OAuth2 with refresh tokens

For this use case, JWT with refresh tokens seems optimal because:
- Stateless scaling
- Mobile app support  
- Industry standard

I'll recommend a 15-minute access token with 7-day refresh tokens. This balances security (short access token lifetime) with UX (users don't re-login constantly).

The implementation should use RS256 for asymmetric signing so multiple services can verify tokens without sharing secrets.`,
      isStreaming: false,
      duration: 12
    } : undefined
  };

  return (
    <Card className="p-6 max-w-4xl mx-auto">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">AI Reasoning Test</h2>
          <Button 
            onClick={() => setShowReasoning(!showReasoning)}
            variant={showReasoning ? 'default' : 'outline'}
          >
            {showReasoning ? 'Hide Reasoning' : 'Show Reasoning Example'}
          </Button>
        </div>
        
        <div className="border rounded-lg p-4 bg-background/50">
          <ChatBubble
            role={testMessage.role}
            reasoning={testMessage.reasoning}
          >
            {testMessage.content}
          </ChatBubble>
        </div>

        <div className="text-sm text-muted-foreground space-y-2">
          <p><strong>💡 This shows:</strong></p>
          <ul className="list-disc ml-4 space-y-1">
            <li>Reasoning section appears above the main response</li>
            <li>Brain icon indicates AI thinking process</li>
            <li>"Thought for 12 seconds" shows effort invested</li>
            <li>Step-by-step analysis is collapsible</li>
            <li>Code blocks use theme-appropriate highlighting</li>
          </ul>
          
          <p className="mt-4"><strong>🤖 To see real reasoning:</strong></p>
          <ul className="list-disc ml-4 space-y-1">
            <li>Use DeepSeek R1 or OpenAI o1 models</li>
            <li>Ask complex problems that require thinking</li>
            <li>The reasoning will stream in real-time</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}