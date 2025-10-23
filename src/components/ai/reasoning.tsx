"use client";

import * as React from "react";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import { ChevronRight, Brain, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const AUTO_CLOSE_DELAY = 1000; // 1 second after streaming ends

interface ReasoningContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isStreaming: boolean;
  duration: number;
  startTime: React.MutableRefObject<number | null>;
}

const ReasoningContext = React.createContext<ReasoningContextValue | null>(null);

function useReasoning() {
  const context = React.useContext(ReasoningContext);
  if (!context) {
    throw new Error("useReasoning must be used within a Reasoning component");
  }
  return context;
}

export interface ReasoningProps extends React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Root> {
  isStreaming?: boolean;
  duration?: number;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

const Reasoning = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.Root>,
  ReasoningProps
>(({ 
  isStreaming = false, 
  duration: controlledDuration, 
  onOpenChange, 
  defaultOpen = false, 
  className,
  children,
  ...props 
}, ref) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const [internalDuration, setInternalDuration] = React.useState(0);
  const startTime = React.useRef<number | null>(null);
  const intervalRef = React.useRef<NodeJS.Timeout>();
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  // Use controlled duration if provided, otherwise use internal
  const duration = controlledDuration ?? internalDuration;

  // Handle auto-open/close behavior
  React.useEffect(() => {
    if (isStreaming) {
      // Start streaming: open and start timer
      setIsOpen(true);
      if (!startTime.current) {
        startTime.current = Date.now();
      }
      
      // Update duration every second
      intervalRef.current = setInterval(() => {
        if (startTime.current) {
          setInternalDuration(Math.floor((Date.now() - startTime.current) / 1000));
        }
      }, 1000);
    } else {
      // Stop streaming: clear interval and auto-close after delay
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      if (startTime.current) {
        const finalDuration = Math.floor((Date.now() - startTime.current) / 1000);
        setInternalDuration(finalDuration);
      }
      
      // Auto-close after delay
      timeoutRef.current = setTimeout(() => {
        setIsOpen(false);
        startTime.current = null;
      }, AUTO_CLOSE_DELAY);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isStreaming]);

  const handleOpenChange = React.useCallback((open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
    
    // If manually closed, reset timer
    if (!open) {
      startTime.current = null;
      setInternalDuration(0);
    }
  }, [onOpenChange]);

  const contextValue: ReasoningContextValue = {
    isOpen,
    setIsOpen: handleOpenChange,
    isStreaming,
    duration,
    startTime,
  };

  return (
    <ReasoningContext.Provider value={contextValue}>
      <CollapsiblePrimitive.Root
        ref={ref}
        open={isOpen}
        onOpenChange={handleOpenChange}
        className={cn("space-y-2", className)}
        {...props}
      >
        {children}
      </CollapsiblePrimitive.Root>
    </ReasoningContext.Provider>
  );
});
Reasoning.displayName = "Reasoning";

export interface ReasoningTriggerProps extends React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Trigger> {
  title?: string;
  className?: string;
  children?: React.ReactNode;
}

const ReasoningTrigger = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.Trigger>,
  ReasoningTriggerProps
>(({ title = "Reasoning", className, children, ...props }, ref) => {
  const { isOpen, isStreaming, duration } = useReasoning();

  return (
    <CollapsiblePrimitive.Trigger
      ref={ref}
      className={cn(
        "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md",
        "border border-border bg-background/50 hover:bg-accent/50",
        "transition-all duration-200 ease-in-out",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        "data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
        className
      )}
      {...props}
    >
      <Brain className={cn(
        "w-4 h-4 transition-colors duration-200",
        isStreaming ? "text-blue-500 animate-pulse" : "text-muted-foreground"
      )} />
      
      <span className="flex-1 text-left">
        {isStreaming ? "Thinking..." : title}
      </span>
      
      {duration > 0 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>
            {isStreaming ? `${duration}s` : `Thought for ${duration}s`}
          </span>
        </div>
      )}
      
      <ChevronRight className={cn(
        "w-4 h-4 transition-transform duration-200",
        isOpen && "rotate-90"
      )} />
      
      {children}
    </CollapsiblePrimitive.Trigger>
  );
});
ReasoningTrigger.displayName = "ReasoningTrigger";

export interface ReasoningContentProps extends React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Content> {
  children: React.ReactNode;
  className?: string;
}

const ReasoningContent = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.Content>,
  ReasoningContentProps
>(({ className, children, ...props }, ref) => {
  return (
    <CollapsiblePrimitive.Content
      ref={ref}
      className={cn(
        "overflow-hidden",
        "data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
      )}
      {...props}
    >
      <div className={cn(
        "px-4 py-3 mt-2 rounded-md",
        "border border-border bg-muted/30",
        "text-sm text-muted-foreground leading-relaxed",
        "max-h-80 overflow-y-auto",
        "prose prose-sm dark:prose-invert max-w-none",
        "[&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded",
        "[&_pre]:bg-gray-900 [&_pre]:border [&_pre]:border-border",
        "dark:[&_pre]:bg-gray-950",
        className
      )}>
        {children}
      </div>
    </CollapsiblePrimitive.Content>
  );
});
ReasoningContent.displayName = "ReasoningContent";

export { Reasoning, ReasoningTrigger, ReasoningContent, useReasoning };