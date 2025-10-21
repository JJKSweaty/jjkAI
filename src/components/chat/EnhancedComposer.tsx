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
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnhancedComposerProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

export function EnhancedComposer({ onSend, disabled, className }: EnhancedComposerProps) {
  const [text, setText] = React.useState('');
  const [context, setContext] = React.useState('');
  const [attachedFiles, setAttachedFiles] = React.useState<File[]>([]);
  const [mode, setMode] = React.useState<'Auto' | 'Manual'>('Auto');
  const [sources, setSources] = React.useState<'All Sources' | 'Local' | 'Web'>('All Sources');
  const [showContext, setShowContext] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
      <div className={cn('w-full bg-transparent', className)}>
        <div className="w-full p-4 flex gap-4">
          {/* Context Panel (Expandable) */}
          {showContext && (
            <Card className="w-64 border-primary/20 ring-1 ring-primary/10 rounded-2xl bg-background/95 backdrop-blur">
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
          <Card className="flex-1 border-primary/20 ring-1 ring-primary/10 shadow-lg shadow-primary/5 rounded-2xl bg-background/95 backdrop-blur">
            <CardContent className="p-4">

              {/* Textarea */}
              <div className="relative">
                <Textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Ask, search, or make anything..."
                  className="min-h-[80px] text-sm resize-y border-muted-foreground/20 focus-visible:ring-primary focus-visible:border-primary rounded-xl"
                  disabled={disabled}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
              </div>

              {/* Footer controls */}
              <div className="mt-3 flex items-center gap-2">
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                  accept="*/*"
                />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      className="hover:bg-primary/10 hover:text-primary"
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Attach file</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setShowContext(!showContext)}
                      className={cn(
                        "hover:bg-primary/10 hover:text-primary",
                        showContext && "bg-primary/10 text-primary"
                      )}
                    >
                      <PlusCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Add context</TooltipContent>
                </Tooltip>

                <Separator orientation="vertical" className="mx-1 h-5" />

                {/* Mode toggle */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="gap-2 hover:bg-primary/10 hover:text-primary"
                    >
                      <Sparkles className="h-4 w-4" />
                      {mode}
                      <ChevronDown className="h-4 w-4 opacity-70" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => setMode('Auto')}>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Auto
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setMode('Manual')}>
                      Manual
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Sources toggle */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="gap-2 hover:bg-primary/10 hover:text-primary"
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

                <div className="ml-auto" />

                {/* Send button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleSend}
                      disabled={disabled || !text.trim()}
                      size="icon"
                      className={cn(
                        'h-10 w-10 rounded-full shadow-lg',
                        'bg-primary hover:bg-primary/90 text-primary-foreground',
                        'transition-all',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        !disabled && text.trim() && 'shadow-primary/50 hover:shadow-primary/70'
                      )}
                      aria-label="Send message"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {disabled ? 'Please wait...' : 'Send message (Enter)'}
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}
