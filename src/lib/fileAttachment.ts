// File attachment utilities for chat
export interface AttachedFile {
  file: File;
  id: string;
  preview?: string;
  type: 'image' | 'text' | 'code' | 'document' | 'other';
  content?: string; // For text files
}

export async function processFile(file: File): Promise<AttachedFile> {
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const type = getFileType(file);
  
  let content: string | undefined;
  let preview: string | undefined;

  // Process based on file type
  if (type === 'image') {
    preview = await readFileAsDataURL(file);
  } else if (type === 'text' || type === 'code') {
    content = await readFileAsText(file);
  }

  return {
    file,
    id,
    preview,
    type,
    content
  };
}

function getFileType(file: File): AttachedFile['type'] {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  
  // Images
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
    return 'image';
  }
  
  // Code files
  if (['js', 'ts', 'tsx', 'jsx', 'py', 'java', 'cpp', 'c', 'cs', 'go', 'rs', 'php', 'rb', 'swift', 'kt', 'dart'].includes(ext)) {
    return 'code';
  }
  
  // Text files
  if (['txt', 'md', 'json', 'xml', 'yaml', 'yml', 'toml', 'ini', 'conf', 'log', 'csv'].includes(ext)) {
    return 'text';
  }
  
  // Documents
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) {
    return 'document';
  }
  
  return 'other';
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getFileIcon(type: AttachedFile['type']): string {
  switch (type) {
    case 'image':
      return '🖼️';
    case 'code':
      return '💻';
    case 'text':
      return '📄';
    case 'document':
      return '📑';
    default:
      return '📎';
  }
}

// Format file content for inclusion in message
export function formatFileForMessage(attachedFile: AttachedFile): string {
  const { file, type, content, preview } = attachedFile;
  
  let formatted = `\n\n---\n**Attached File: ${file.name}** (${formatFileSize(file.size)})\n`;
  
  if (type === 'image') {
    formatted += `Type: Image\n`;
    if (preview) {
      formatted += `[Image data included]\n`;
    }
  } else if ((type === 'text' || type === 'code') && content) {
    const truncatedContent = content.length > 2000 
      ? content.substring(0, 2000) + '\n...(truncated)'
      : content;
    formatted += `\`\`\`${getLanguageFromFilename(file.name)}\n${truncatedContent}\n\`\`\`\n`;
  } else {
    formatted += `Type: ${type}\n`;
  }
  
  formatted += `---\n`;
  return formatted;
}

function getLanguageFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const langMap: Record<string, string> = {
    'js': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'jsx': 'javascript',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'go': 'go',
    'rs': 'rust',
    'php': 'php',
    'rb': 'ruby',
    'swift': 'swift',
    'kt': 'kotlin',
    'dart': 'dart',
    'json': 'json',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'md': 'markdown',
  };
  
  return langMap[ext] || '';
}