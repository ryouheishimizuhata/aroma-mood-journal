import React, { useEffect, useState } from 'react'
import localforage from 'localforage'

type EntryImage = {
  name: string
  type: string
  dataUrl: string
}

type EntryParams = {
  intensity: number
  pleasantness: number
  familiarity: number
  freshness: number
  sweetness: number
}

type Entry = {
  id: string
  timestamp: string
  text: string
  image?: EntryImage
  params: EntryParams
}

const store = localforage.createInstance({ name: 'aroma-journal' })
const KEY = 'entries_v2'

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function App() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [pwaInstallable, setPwaInstallable] = useState(false)
  const [deferred, setDeferred] = useState<any>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault()
      setDeferred(e)
      setPwaInstallable(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  useEffect(() => {
    ;(async () => {
      const saved = (await store.getItem<Entry[]>(KEY)) || []
      setEntries(saved)
    })()
  }, [])

  async function addEntry(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const now = new Date().toISOString()

    const file = form.get('image')
    let image: EntryImage | undefined

    if (file instanceof File && file.size > 0) {
      const dataUrl = await fileToDataUrl(file)
      image = {
        name: file.name,
        type: file.type,
        dataUrl
      }
    }

    const entry: Entry = {
      id: crypto.randomUUID(),
      timestamp: now,
      text: String(form.get('text') || '').trim(),
      image,
      params: {
        intensity: Number(form.get('intensity') || 0),
        pleasantness: Number(form.get('pleasantness') || 0),
        familiarity: Number(form.get('familiarity') || 0),
        freshness: Number(form.get('freshness') || 0),
        sweetness: Number(form.get('sweetness') || 0)
      }
    }

    const updated = [entry, ...entries]
    await store.setItem(KEY, updated)
    setEntries(updated)
    setPreviewUrl('')
    e.currentTarget.reset()
  }

  function exportCsv() {
    const header = [
      'timestamp',
      'text',
      'intensity',
      'pleasantness',
      'familiarity',
      'freshness',
      'sweetness',
      'imageName',
      'imageType',
      'hasImage'
    ]

    const rows = entries.map((r) => [
      r.timestamp,
      r.text.replaceAll('\n', ' '),
      r.params.intensity,
      r.params.pleasantness,
      r.params.familiarity,
      r.params.freshness,
      r.params.sweetness,
      r.image?.name ?? '',
      r.image?.type ?? '',
      r.image ? 'true' : 'false'
    ])

    const csv = [header, ...rows]
      .map((a) => a.map((s) => `"${String(s).replaceAll('"', '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `aroma_journal_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function installPWA() {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
    setPwaInstallable(false)
  }

  async function clearAll() {
    const ok = window.confirm('すべての記録を削除します。よろしいですか？')
    if (!ok) return
    await store.setItem(KEY, [])
    setEntries([])
  }

  function handlePreview(file: File | null) {
    if (!file) {
      setPreviewUrl('')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setPreviewUrl(String(reader.result))
    reader.readAsDataURL(file)
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: 16 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 20, margin: 0 }}>におい記録</h1>
        <div>
          {pwaInstallable && <button onClick={installPWA}>インストール</button>}
          <button onClick={exportCsv} style={{ marginLeft: 8 }}>CSV</button>
          <button onClick={clearAll} style={{ marginLeft: 8 }}>全削除</button>
        </div>
      </header>

      <form onSubmit={addEntry} style={{ display: 'grid', gap: 12, marginTop: 16 }}>
        <div>
          <label htmlFor="image">画像</label>
          <input
            id="image"
            name="image"
            type="file"
            accept="image/*"
            onChange={(e) => handlePreview(e.target.files?.[0] ?? null)}
          />
          {previewUrl && (
            <div style={{ marginTop: 8 }}>
              <img
                src={previewUrl}
                alt="preview"
                style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
            </div>
          )}
        </div>

        <div>
          <label htmlFor="text">自由記述</label>
          <textarea
            id="text"
            name="text"
            placeholder="においの印象、状況、感じたことなど"
            rows={4}
            required
            style={{ width: '100%' }}
          />
        </div>

        <label>
          強さ 0–10：
          <input name="intensity" type="range" min="0" max="10" defaultValue="5" />
        </label>

        <label>
          快・不快 -5〜+5：
          <input name="pleasantness" type="range" min="-5" max="5" defaultValue="0" />
        </label>

        <label>
          なじみ 0–10：
          <input name="familiarity" type="range" min="0" max="10" defaultValue="5" />
        </label>

        <label>
          さわやかさ 0–10：
          <input name="freshness" type="range" min="0" max="10" defaultValue="5" />
        </label>

        <label>
          甘さ 0–10：
          <input name="sweetness" type="range" min="0" max="10" defaultValue="5" />
        </label>

        <button type="submit" style={{ padding: '10px 14px' }}>保存</button>
      </form>

      <h2 style={{ marginTop: 24, fontSize: 18 }}>履歴</h2>
      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 12 }}>
        {entries.map((e) => (
          <li key={e.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              {new Date(e.timestamp).toLocaleString()}
            </div>

            {e.image && (
              <div style={{ marginTop: 8 }}>
                <img
                  src={e.image.dataUrl}
                  alt={e.image.name}
                  style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 8 }}
                />
              </div>
            )}

            <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{e.text}</div>

            <div style={{ marginTop: 8 }}>
              強さ {e.params.intensity} / 快不快 {e.params.pleasantness} / なじみ {e.params.familiarity}
            </div>
            <div>
              さわやかさ {e.params.freshness} / 甘さ {e.params.sweetness}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
