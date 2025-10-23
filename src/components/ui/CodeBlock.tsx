'use client';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import hljs from 'highlight.js/lib/core';
import { CopyButton } from './copy-button';

// Import themes
import 'highlight.js/styles/monokai.css';
import 'highlight.js/styles/github.css';

// Import common languages
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import java from 'highlight.js/lib/languages/java';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import sql from 'highlight.js/lib/languages/sql';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import markdown from 'highlight.js/lib/languages/markdown';

// Register languages
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('java', java);
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('csharp', csharp);
hljs.registerLanguage('go', go);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('json', json);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('css', css);
hljs.registerLanguage('markdown', markdown);

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
  variant?: 'default' | 'reasoning'; // reasoning uses special styling
}

export function CodeBlock({ code, language, className, variant = 'default' }: CodeBlockProps) {
  const codeRef = useRef<HTMLElement>(null);
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (codeRef.current && mounted) {
      if (language && hljs.getLanguage(language)) {
        codeRef.current.innerHTML = hljs.highlight(code, { language }).value;
      } else {
        codeRef.current.innerHTML = hljs.highlightAuto(code).value;
      }
    }
  }, [code, language, mounted]);

  if (!mounted) {
    return (
      <div className={`relative group my-3 sm:my-4 ${className || ''}`}>
        <div className="animate-pulse bg-zinc-900 h-20 rounded-lg"></div>
      </div>
    );
  }

  const isDark = resolvedTheme === 'dark';
  const isReasoning = variant === 'reasoning';
  
  // Theme-specific styles
  const headerBg = isDark 
    ? (isReasoning ? 'bg-gray-800' : 'bg-zinc-900')
    : (isReasoning ? 'bg-gray-100' : 'bg-gray-50');
  
  const codeBg = isDark 
    ? (isReasoning ? 'bg-gray-900' : 'bg-zinc-950')
    : (isReasoning ? 'bg-white' : 'bg-white');
    
  const borderColor = isDark 
    ? (isReasoning ? 'border-gray-700' : 'border-zinc-800')
    : (isReasoning ? 'border-gray-300' : 'border-gray-200');
    
  const textColor = isDark ? 'text-zinc-100' : 'text-gray-900';

  return (
    <div className={`relative group my-3 sm:my-4 ${className || ''}`}>
      <div className={`flex items-center justify-between px-3 sm:px-4 py-1.5 sm:py-2 ${headerBg} border ${borderColor} border-b-0 rounded-t-lg sm:rounded-t-xl`}>
        <span className={`text-[10px] sm:text-xs font-mono ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
          {language || 'code'}
        </span>
        <CopyButton text={code} />
      </div>
      <pre className={`overflow-x-auto p-3 sm:p-4 ${codeBg} border ${borderColor} rounded-b-lg sm:rounded-b-xl text-xs sm:text-sm`}>
        <code 
          ref={codeRef} 
          className={`language-${language || 'plaintext'} ${textColor} ${isDark ? 'hljs-monokai' : 'hljs-github'}`}
        >
          {code}
        </code>
      </pre>
    </div>
  );
}
