'use client';

import ReactMarkdown from 'react-markdown';

interface MarkdownOutputProps {
  content: string;
}

export default function MarkdownOutput({ content }: MarkdownOutputProps) {
  return (
    <div className="prose prose-invert prose-sm max-w-none
      prose-headings:text-gray-100 prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2
      prose-h1:text-base prose-h2:text-sm prose-h3:text-sm
      prose-p:text-gray-300 prose-p:leading-relaxed prose-p:my-1.5
      prose-strong:text-white prose-strong:font-semibold
      prose-em:text-gray-200
      prose-li:text-gray-300 prose-li:my-0.5
      prose-ul:my-1.5 prose-ol:my-1.5
      prose-code:text-blue-300 prose-code:bg-blue-500/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-[''] prose-code:after:content-['']
      prose-pre:bg-gray-950 prose-pre:border prose-pre:border-gray-800 prose-pre:rounded-md
      prose-blockquote:border-l-blue-500/50 prose-blockquote:text-gray-400
      prose-hr:border-gray-800
      text-xs leading-relaxed
    ">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
