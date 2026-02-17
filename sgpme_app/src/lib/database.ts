import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

export async function readData<T>(filename: string): Promise<T[]> {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, `${filename}.json`);

  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function writeData<T>(filename: string, data: T[]): Promise<void> {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, `${filename}.json`);

  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export async function initializeData<T>(
  filename: string,
  defaultData: T[]
): Promise<T[]> {
  const existing = await readData<T>(filename);

  if (existing.length === 0 && defaultData.length > 0) {
    await writeData(filename, defaultData);
    return defaultData;
  }

  return existing;
}
