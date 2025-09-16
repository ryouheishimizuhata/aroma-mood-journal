import React, { useEffect, useState } from 'react'
import localforage from 'localforage'

type Entry = {
  id: string
  timestamp: string
  scent: string
  source: 'perfume' | 'food' | 'environment' | 'other'
  intensity: number // 0-5
  valence: number   // -3..+3
  arousal: number   // 1..5
  moodTags: string[]
  place?: string
  notes?: string
}

const store = localforage.createInstance({ name: 'aroma-journal' })
const KEY = 'entries'

export default function App() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [pwaInstallable, setPwaInstallable] = useState(false)
  const [deferred, setDeferred] = useState<any>(null)

  // Android向けPWAインストールプロンプト
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault()
      setDeferred(e)
      setPwaInstallable(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // ロード
  useEffect(() => {
    (async () => {
      const saved = (await store.getItem<Entry[]>(KEY)) || []
      setEntries(saved)
    })()
  }, [])

  // 追加
  async function addEntry(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const now = new Date().toISOString()
    const entry: Entry = {
      id: crypto.randomUUID(),
      timestamp: now,
      scent: String(form.get('scent') || '').trim(),
      source: (form.get('source') as Entry['source']) || 'environment',
      intensity: Number(form.get('intensity') || 0),
      valence: Number(form.get('valence') || 0),
      arousal: Number(form.get('arousal') || 3),
      moodTags: Array.from(form.getAll('mood') as string[]),
      place: String(form.get('place') || '') || undefined,
      notes: String(form.get('notes') || '') || undefined
    }
    const updated = [entry, ...entries]
    await store.setItem(KEY, updated)
    setEntries(updated)
    e.currentTarget.reset()
  }

  // CSVエクスポート
  function exportCsv() {
    const header = ['timestamp','scent','source','intensity','valence','arousal','moodTags','place','notes']
    const rows = entries.map(r => [
      r.timestamp, r.scent, r.source, r.intensity, r.valence, r.arousal,
      r.moodTags.join('|'), r.place ?? '', (r.notes ?? '').replaceAll('\n',' ')
    ])
    const csv = [header, ...rows].map(a => a.map(s => `"${String(s).replaceAll('"','""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `aroma_journal_${new Date().toISOString().slice(0,10)}.csv`
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

  return (
    <div style={{maxWidth: 560, margin: '0 auto', padding: 16}}>
      <header style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h1 style={{fontSize:20}}>香り気分日記</h1>
        <div>
          {pwaInstallable && <button onClick={installPWA}>インストール</button>}
          <button onClick={exportCsv} style={{marginLeft:8}}>CSV</button>
        </div>
      </header>

      <form onSubmit={addEntry} style={{display:'grid',gap:12,marginTop:12}}>
        <input name="scent" placeholder="香り（例：レモン/コーヒー/雨上がり…）" required />
        <div>
          出所：
          <select name="source" defaultValue="environment">
            <option value="perfume">自分の香水</option>
            <option value="food">食べ物/飲み物</option>
            <option value="environment">環境</option>
            <option value="other">その他</option>
          </select>
        </div>
        <label>強度 0–5：<input name="intensity" type="range" min="0" max="5" defaultValue="3" /></label>
        <label>好ましさ −3〜+3：<input name="valence" type="range" min="-3" max="3" defaultValue="0" /></label>
        <label>活性度 1–5：<input name="arousal" type="range" min="1" max="5" defaultValue="3" /></label>

        <fieldset style={{border:'1px solid #e5e7eb',padding:8}}>
          <legend>気分タグ（最大3つ目安）</legend>
          {['集中','穏やか','前向き','疲れ','不安','眠い','ワクワク'].map(tag => (
            <label key={tag} style={{marginRight:8}}>
              <input type="checkbox" name="mood" value={tag} /> {tag}
            </label>
          ))}
        </fieldset>

        <input name="place" placeholder="場所（例：研究室/自宅/電車）" />
        <textarea name="notes" placeholder="メモ（任意）" rows={2} />

        <button type="submit" style={{padding:'10px 14px'}}>保存</button>
      </form>

      <h2 style={{marginTop:24,fontSize:18}}>履歴</h2>
      <ul style={{listStyle:'none',padding:0,display:'grid',gap:10}}>
        {entries.map(e => (
          <li key={e.id} style={{border:'1px solid #e5e7eb',borderRadius:8,padding:12}}>
            <div style={{fontSize:12,color:'#6b7280'}}>{new Date(e.timestamp).toLocaleString()}</div>
            <div style={{fontWeight:600}}>{e.scent}（強度{e.intensity}）</div>
            <div>好ましさ {e.valence} / 活性度 {e.arousal}</div>
            {e.moodTags.length>0 && <div>気分：{e.moodTags.join('・')}</div>}
            {e.place && <div>場所：{e.place}</div>}
            {e.notes && <div>メモ：{e.notes}</div>}
          </li>
        ))}
      </ul>
    </div>
  )
}
