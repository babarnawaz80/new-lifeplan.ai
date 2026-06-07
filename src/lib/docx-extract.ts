// Client-side DOCX text extraction using mammoth.
// Returns concatenated plain text.

export async function extractDocxText(file: File): Promise<string> {
  const mammoth = await import("mammoth/mammoth.browser");
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
