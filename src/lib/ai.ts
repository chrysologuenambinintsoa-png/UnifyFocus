export function extractImagesFromResponse(text: string): string[] {
  const imageRegex = /https?:\/\/[^"\s]+?\.(?:jpe?g|png|gif|webp|svg|bmp)(?:\?[^\s"<>]*)?/gi;
  const matches = text.match(imageRegex);
  return matches ? [...new Set(matches)] : [];
}

export function extractCodeBlocks(text: string): Array<{ language: string; code: string }> {
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  const blocks: Array<{ language: string; code: string }> = [];
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    blocks.push({
      language: match[1] || "text",
      code: match[2],
    });
  }

  return blocks;
}
