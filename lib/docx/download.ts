import { Document, Packer } from "docx";

export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^\w\s.-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

export async function buildDocxBuffer(doc: Document): Promise<Buffer> {
  return Packer.toBuffer(doc);
}

export function docxResponse(buffer: Buffer, filename: string): Response {
  const safe = sanitizeFilename(filename);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${safe}.docx"`,
      "Cache-Control": "no-store",
    },
  });
}
