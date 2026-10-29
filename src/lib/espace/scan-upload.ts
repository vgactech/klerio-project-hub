import { api, fileToBase64 } from "./api";
import type { DocumentReceipt } from "../document-intake";

export async function uploadScan(file: File, language: string) {
  const image = await createImageBitmap(file);
  const scale = Math.min(1, 2000 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image illisible");
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("Image illisible")), "image/jpeg", 0.85));
  return api<DocumentReceipt>("/api/documents", { method: "POST", body: JSON.stringify({
    name: file.name || "Scan.jpg", type: "image/jpeg", scan: true, language, data: await fileToBase64(blob),
  }) });
}