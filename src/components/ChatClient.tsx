'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Bericht {
  id: string
  park_id: string
  kavel_id: string | null
  from_id: string | null
  bericht: string
  gelezen: boolean
  created_at: string
}

interface Props {
  berichten: Bericht[]
  owners: { id: string; name: string; color: string }[]
  currentUserId: string
}

const PARK_ID = '11111111-0000-0000-0000-000000000001'

export function ChatClient({ berichten: initial, currentUserId }: Props) {
  const [berichten, setBerichten] = useState(initial)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [berichten])

  useEffect(() => {
    const channel = supabase.channel('berichten')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'berichten', filter: 'park_id=eq.' + PARK_ID },
        (payload) => setBerichten(prev => [...prev, payload.new as Bericht]))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function handleSend() {
    if (!input.trim()) return
    setSending(true)
    const { data } = await supabase.from('berichten').insert({
      park_id: PARK_ID, from_id: currentUserId, bericht: input.trim(),
    }).select().single()
    if (data) setBerichten(prev => [...prev, data])
    setInput('')
    setSending(false)
  }

  function formatTime(ts: string) {
    return new Date(ts).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
  }

  function formatDate(ts: string) {
    return new Date(ts).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })
  }

  const grouped: { date: string; items: Bericht[] }[] = []
  berichten.forEach(b => {
    const d = formatDate(b.created_at)
    const last = grouped[grouped.length - 1]
    if (last?.date === d) last.items.push(b)
    else grouped.push({ date: d, items: [b] })
  })

  return (
    <div className="flex flex-col p-7 max-w-[900px]" style={{height: 'calc(100vh - 40px)'}}>
      <div className="mb-4 flex-shrink-0">
        <h1 className="text-[26px] font-bold tracking-[-0.5px]">Chat</h1>
        <p className="text-[14px] text-[#6e6e73] mt-0.5">Communicatie met eigenaren en team</p>
      </div>
      <div className="flex-1 bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-black/[0.05] flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {grouped.length === 0 && (
            <div className="h-full flex items-center justify-center text-[13px] text-[#aeaeb2]">Nog geen berichten</div>
          )}
          {grouped.map(({ date, items }) => (
            <div key={date}>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-black/[0.06]" />
                <span className="text-[11px] text-[#aeaeb2] font-medium">{date}</span>
                <div className="flex-1 h-px bg-black/[0.06]" />
              </div>
              {items.map(b => {
                const isMe = b.from_id === currentUserId
                const bubbleClass = isMe
                  ? 'bg-[#0071e3] text-white rounded-tr-[4px]'
                  : 'bg-[#f5f5f7] text-[#1d1d1f] rounded-tl-[4px]'
                return (
                  <div key={b.id} className={'flex gap-2.5 mb-3 ' + (isMe ? 'flex-row-reverse' : 'flex-row')}>
                    <div className="w-7 h-7 rounded-full bg-[#0071e3] flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0 mt-0.5">JD</div>
                    <div className={'max-w-[70%] flex flex-col gap-1 ' + (isMe ? 'items-end' : 'items-start')}>
                      <div className={'px-3.5 py-2.5 rounded-[14px] text-[13px] leading-relaxed ' + bubbleClass}>
                        {b.bericht}
                      </div>
                      <span className="text-[10px] text-[#aeaeb2]">{formatTime(b.created_at)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="border-t border-black/[0.05] px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Bericht sturen..."
            className="flex-1 bg-[#f5f5f7] border border-black/[0.05] rounded-full px-4 py-2.5 text-[13px] outline-none focus:border-[#0071e3] focus:bg-white transition-all" />
          <button onClick={handleSend} disabled={sending || !input.trim()}
            className="px-5 py-2.5 rounded-full bg-[#0071e3] text-white text-[13px] font-medium hover:bg-[#0077ed] disabled:opacity-40 transition-all">
            {sending ? '...' : 'Stuur'}
          </button>
        </div>
      </div>
    </div>
  )
}
