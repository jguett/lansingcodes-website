import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { DataStore, StoredDoc } from './types'

// One JSON file per collection, so parallel syncs of different
// collections (e.g. /api/sync/all) never overwrite each other.
const DATA_DIR = path.join(process.cwd(), '.data')

function fileFor(collection: string) {
  return path.join(DATA_DIR, `${collection}.json`)
}

async function readCollection(collection: string): Promise<Record<string, StoredDoc>> {
  try {
    return JSON.parse(await readFile(fileFor(collection), 'utf8'))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}
    throw error
  }
}

export const localStore: DataStore = {
  async listDocs<T>(collection: string, opts: Parameters<DataStore['listDocs']>[1] = {}) {
    let docs = Object.entries(await readCollection(collection)).map(
      ([id, doc]) => ({ id, ...doc }) as T & { id: string } & StoredDoc,
    )

    const { range, orderBy } = opts
    if (range) {
      docs = docs.filter((doc) => {
        const value = doc[range.field] as number
        return value >= range.min && value <= range.max
      })
    }
    if (orderBy) {
      docs.sort((a, b) => {
        const x = a[orderBy] as string | number
        const y = b[orderBy] as string | number
        return x < y ? -1 : x > y ? 1 : 0
      })
    }
    return docs
  },

  // Write to a temp file then rename, so a crash never leaves a partial file.
  async replaceCollection(collection, docs) {
    await mkdir(DATA_DIR, { recursive: true })
    const file = fileFor(collection)
    await writeFile(`${file}.tmp`, JSON.stringify(docs, null, 2))
    await rename(`${file}.tmp`, file)
  },
}
