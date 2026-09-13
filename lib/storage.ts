import fs from "node:fs/promises";
import path from "node:path";

const uploadDirectory = path.join(process.cwd(), "data", "uploads");

export async function saveUpload(storageKey: string, data: ArrayBuffer | Uint8Array) {
  const filePath = path.join(uploadDirectory, storageKey);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  await fs.writeFile(filePath, Buffer.from(bytes));
}

export async function readUpload(storageKey: string) {
  const filePath = path.join(uploadDirectory, storageKey);
  return fs.readFile(filePath);
}

export async function removeUpload(storageKey: string) {
  await fs.rm(path.join(uploadDirectory, storageKey), { force: true });
}