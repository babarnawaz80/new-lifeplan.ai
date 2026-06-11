// Client-side DOCX text extraction using mammoth.
// Returns concatenated plain text.

export async function extractDocxText(file: File): Promise<string> {
  // @ts-expect-error - mammoth.browser has no types
  const mammoth = await import("mammoth/mammoth.browser.js");
  const buf = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buf });
  return (result?.value ?? "").trim();
}

export async function extractSampleText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) {
    const { extractPdfText } = await import("./pdf-extract");
    return extractPdfText(file);
  }
  if (name.endsWith(".docx")) {
    return extractDocxText(file);
  }
  throw new Error("Unsupported file type. Upload a PDF or DOCX.");
}

// Source-document extraction for plan starts: PDF, DOCX/DOC, plain-text files.
// Always runs in the browser — the raw file never leaves the machine.
export async function extractDocumentText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) {
    const { extractPdfText } = await import("./pdf-extract");
    return extractPdfText(file);
  }
  if (name.endsWith(".docx") || name.endsWith(".doc")) return extractDocxText(file);
  return file.text();
}
