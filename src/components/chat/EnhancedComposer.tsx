'use client';
import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import {
  Paperclip,
  Send,
  Globe,
  Sparkles,
  ChevronDown,
  PlusCircle,
  Brain,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MODELS } from '@/lib/constants';

interface EnhancedComposerProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  className?: string;
  hasThread?: boolean; // true if conversation has ≥1 messages
  currentModel?: string;
  onModelChange?: (model: string) => void;
}

export function EnhancedComposer({ 
  onSend, 
  disabled, 
  className, 
  hasThread = false,
  currentModel,
  onModelChange
}: EnhancedComposerProps) {
  const [text, setText] = React.useState('');
  const [context, setContext] = React.useState('');
  const [attachedFiles, setAttachedFiles] = React.useState<File[]>([]);
  const [mode, setMode] = React.useState<'Auto' | 'Manual'>(() => {
    // Load mode from localStorage or default to Auto
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('composer-mode') as 'Auto' | 'Manual') || 'Auto';
    }
    return 'Auto';
  });
  const [sources, setSources] = React.useState<'All Sources' | 'Local' | 'Web'>('All Sources');
  const [showContext, setShowContext] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Save mode to localStorage when it changes
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('composer-mode', mode);
    }
  }, [mode]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    
    // Prepend context if provided
    const fullMessage = context ? `Context: ${context}\n\n${trimmed}` : trimmed;
    onSend(fullMessage);
    
    setText('');
    setContext('');
    setAttachedFiles([]);
    textareaRef.current?.focus();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setContext(prev => prev ? `${prev}\n${text}` : text);
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn(
        'w-full bg-transparent',
        // State-based layout
        hasThread ? 'composer-compact' : 'composer-expanded',
        className
      )}>
        {/* Main Composer Container */}
        <div className={cn(
          'mx-auto transition-all duration-300 ease-out',
          // Max width based on state
          hasThread 
            ? 'max-w-[700px] md:max-w-[800px]' 
            : 'max-w-[900px] lg:max-w-[1100px]',
          // Vertical spacing
          hasThread ? 'py-3' : 'py-6'
        )}>
          
          {/* Context Panel (only show in expanded mode) */}
          {!hasThread && showContext && (
            <Card className="mb-4 w-full max-w-md mx-auto border-primary/20 ring-1 ring-primary/10 rounded-2xl bg-background/95 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-primary">Context</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setShowContext(false)}
                  >
                    ×
                  </Button>
                </div>
                <Textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="Add context here..."
                  className="min-h-[120px] text-sm resize-none border-primary/20 focus-visible:ring-primary"
                />
                
                {/* Attached files in context panel */}
                {attachedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {attachedFiles.map((file, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="bg-primary/10 text-primary border-primary/20 text-xs"
                      >
                        {file.name.length > 15 ? file.name.substring(0, 15) + '...' : file.name}
                        <button
                          onClick={() => removeFile(index)}
                          className="ml-1 hover:text-primary/80"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Main Composer Card */}
          <Card className={cn(
            'border border-border/20 shadow-sm rounded-2xl bg-background/95 backdrop-blur-sm transition-all duration-300',
            // Focus ring when textarea is focused - thin glow
            'focus-within:ring-1 focus-within:ring-primary/40 focus-within:border-primary/30'
          )}>
            <CardContent className={cn(
              'transition-all duration-300 relative',
              // Compact padding for Claude-like proportions
              hasThread ? 'p-0' : 'p-4'
            )}>

              {/* Textarea Container */}
              <div className={cn(
                'relative flex items-center gap-3 transition-all duration-300',
                // Claude-style height and padding
                hasThread 
                  ? 'min-h-[60px] max-h-[70px] px-4 py-3' 
                  : 'min-h-[64px] px-5 py-4'
              )}>
                
                {/* Left side icons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                    accept="*/*"
                  />

                  {/* Attachment button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                          'h-8 w-8 text-muted-foreground/70 hover:text-foreground hover:bg-accent/50 transition-colors',
                          hasThread ? 'text-sm' : ''
                        )}
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Attach file</TooltipContent>
                  </Tooltip>

                  {/* Context button (only in expanded mode) */}
                  {!hasThread && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setShowContext(!showContext)}
                          className={cn(
                            'h-8 w-8 text-muted-foreground/70 hover:text-foreground hover:bg-accent/50 transition-colors',
                            showContext && "bg-accent/50 text-foreground"
                          )}
                        >
                          <PlusCircle className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Add context</TooltipContent>
                    </Tooltip>
                  )}
                </div>

                {/* Textarea - centered with balanced padding */}
                <Textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={hasThread ? "Message..." : "Ask, search, or make anything..."}
                  className={cn(
                    'flex-1 resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300',
                    'placeholder:text-muted-foreground/75 scrollbar-thin',
                    // Claude-style centered text with proper line-height for vertical centering
                    hasThread 
                      ? 'text-[15px] py-0' 
                      : 'text-base py-0',
                    // Max height for auto-resize
                    'max-h-[40vh] overflow-y-auto'
                  )}
                  disabled={disabled}
                  aria-label="Message"
                  rows={1}
                  style={{
                    resize: 'none',
                    scrollbarWidth: 'thin',
                    lineHeight: hasThread ? '36px' : '40px',
                    minHeight: hasThread ? '36px' : '40px'
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />

                {/* Send button - aligned with text baseline */}
                <div className="flex-shrink-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleSend}
                        disabled={disabled || !text.trim()}
                        size="icon"
                        className={cn(
                          'rounded-full shadow-md transition-all duration-200 flex-shrink-0',
                          'bg-primary hover:bg-primary/90 text-primary-foreground',
                          'disabled:opacity-50 disabled:cursor-not-allowed',
                          // Claude-style circular button sizing
                          hasThread ? 'h-8 w-8' : 'h-9 w-9',
                          !disabled && text.trim() && 'hover:shadow-lg hover:scale-105 hover:brightness-105'
                        )}
                        aria-label="Send message"
                      >
                        <Send className={hasThread ? "h-3.5 w-3.5" : "h-4 w-4"} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {disabled ? 'Please wait...' : 'Send message (Enter)'}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* Footer controls (only in expanded mode) */}
              {!hasThread && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
                  <div className="flex items-center gap-2">
                    <Separator orientation="vertical" className="mx-1 h-5" />

                    {/* Mode toggle */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="gap-2 text-muted-foreground/70 hover:text-foreground hover:bg-accent/50"
                        >
                          {mode === 'Auto' ? (
                            <Brain className="h-4 w-4" />
                          ) : (
                            <Settings className="h-4 w-4" />
                          )}
                          {mode}
                          <ChevronDown className="h-4 w-4 opacity-70" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => setMode('Auto')}>
                          <Brain className="h-4 w-4 mr-2" />
                          <div className="flex flex-col">
                            <span>Auto</span>
                            <span className="text-xs text-muted-foreground">AI selects best model</span>
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setMode('Manual')}>
                          <Settings className="h-4 w-4 mr-2" />
                          <div className="flex flex-col">
                            <span>Manual</span>
                            <span className="text-xs text-muted-foreground">Choose specific model</span>
                          </div>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Model Selection (only in Manual mode) */}
                    {mode === 'Manual' && currentModel && onModelChange && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="gap-2 text-muted-foreground/70 hover:text-foreground hover:bg-accent/50"
                          >
                            <Settings className="h-4 w-4" />
                            {MODELS.find(m => m.id === currentModel)?.name || 'Select Model'}
                            <ChevronDown className="h-4 w-4 opacity-70" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-64">
                          {MODELS.map((model) => (
                            <DropdownMenuItem
                              key={model.id}
                              onClick={() => onModelChange(model.id)}
                              className="flex flex-col items-start"
                            >
                              <div className="font-medium">{model.name}</div>
                              <div className="text-xs text-muted-foreground">{model.description}</div>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}

                    {/* Sources toggle */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="gap-2 text-muted-foreground/70 hover:text-foreground hover:bg-accent/50"
                        >
                          <Globe className="h-4 w-4" />
                          {sources}
                          <ChevronDown className="h-4 w-4 opacity-70" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => setSources('All Sources')}>
                          <Globe className="h-4 w-4 mr-2" />
                          All Sources
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSources('Local')}>
                          Local
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSources('Web')}>
                          Web
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )}

              {/* Compact mode hint - Claude-style subtle text */}
              {hasThread && (
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
                  <span className="text-[11px] text-muted-foreground/50 whitespace-nowrap">
                    Enter to send • Shift+Enter for new line
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}
