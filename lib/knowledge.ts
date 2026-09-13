export const supportedKnowledgeTypes = new Set(["text/plain", "text/markdown", "text/csv", "application/json", "application/pdf"]);

export async function extractDocumentText(data: Buffer, mimeType: string) {
  if (mimeType === "application/pdf") {
    const loadModule = eval("require") as NodeRequire;
    const pdfParse = loadModule("pdf-parse") as (input: Buffer) => Promise<{ text: string }>;
    const parsed = await pdfParse(data);
    return parsed.text;
  }
  return data.toString("utf8");
}

export function normalizeDocumentText(text: string) {
  return text.replace(/\u0000/g, "").replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function chunkDocumentText(text: string, size = 1200, overlap = 180) {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(text.length, start + size);
    if (end < text.length) { const boundary = text.lastIndexOf("\n", end); if (boundary > start + size * 0.65) end = boundary; }
    const chunk = text.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= text.length) break;
    start = Math.max(start + 1, end - overlap);
  }
  return chunks;
}