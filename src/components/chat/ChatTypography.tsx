'use client';

export function ChatTypography({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="
        prose prose-invert max-w-none
        [--tw-prose-body:theme(colors.zinc.200)]
        [--tw-prose-headings:theme(colors.zinc.50)]
        [--tw-prose-links:theme(colors.sky.300)]
        [--tw-prose-bold:theme(colors.zinc.100)]
        [--tw-prose-counters:theme(colors.zinc.400)]
        [--tw-prose-bullets:theme(colors.zinc.500)]
        [--tw-prose-hr:theme(colors.zinc.800)]
        [--tw-prose-quotes:theme(colors.zinc.100)]
        [--tw-prose-quote-borders:theme(colors.zinc.700)]
        [--tw-prose-captions:theme(colors.zinc.400)]
        [--tw-prose-code:theme(colors.zinc.100)]
        [--tw-prose-pre-code:theme(colors.zinc.200)]
        [--tw-prose-pre-bg:theme(colors.zinc.900)]
        [--tw-prose-th-borders:theme(colors.zinc.700)]
        [--tw-prose-td-borders:theme(colors.zinc.800)]
        leading-7 text-[0.965rem]
        [&>p]:max-w-[var(--chat-max-ch)ch]
        [&>ul]:max-w-[var(--chat-max-ch)ch]
        [&>ol]:max-w-[var(--chat-max-ch)ch]
        [&>blockquote]:rounded-xl [&>blockquote]:bg-zinc-900/50
        [&>blockquote]:p-4 [&>blockquote>p]:m-0
        [&_code]:font-mono
      "
    >
      {children}
    </div>
  );
}
