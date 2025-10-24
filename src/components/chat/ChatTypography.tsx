'use client';

export function ChatTypography({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="
        prose max-w-none
        [--tw-prose-body:hsl(var(--foreground))]
        [--tw-prose-headings:hsl(var(--foreground))]
        [--tw-prose-links:hsl(var(--primary))]
        [--tw-prose-bold:hsl(var(--foreground))]
        [--tw-prose-counters:hsl(var(--muted-foreground))]
        [--tw-prose-bullets:hsl(var(--muted-foreground))]
        [--tw-prose-hr:hsl(var(--border))]
        [--tw-prose-quotes:hsl(var(--foreground))]
        [--tw-prose-quote-borders:hsl(var(--border))]
        [--tw-prose-captions:hsl(var(--muted-foreground))]
        [--tw-prose-code:hsl(var(--foreground))]
        [--tw-prose-pre-code:hsl(var(--foreground))]
        [--tw-prose-pre-bg:#1a1a1a]
        [--tw-prose-th-borders:hsl(var(--border))]
        [--tw-prose-td-borders:hsl(var(--border))]
        leading-7 text-[0.965rem]
        [&>p]:max-w-[var(--chat-max-ch)ch]
        [&>ul]:max-w-[var(--chat-max-ch)ch]
        [&>ol]:max-w-[var(--chat-max-ch)ch]
        [&>blockquote]:rounded-xl [&>blockquote]:bg-muted/50 [&>blockquote]:border [&>blockquote]:border-border/50
        [&>blockquote]:p-4 [&>blockquote>p]:m-0
        [&_code]:font-mono
      "
    >
      {children}
    </div>
  );
}
