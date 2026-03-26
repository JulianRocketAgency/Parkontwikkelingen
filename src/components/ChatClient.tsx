'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Bericht {
  id: string
  park_id: string
  kavel_id: string | null
  from_id: string | null
  to_id: string | null
  bericht: string
  gelezen: boolean
  created_at: string
}

interface Owner {
  id: string
  name: string
  color: string
  email: string | null
}

interface Props {
  berichten: Bericht[]
  owners: Owner[]
  currentUserId: string
  currentUserName: string
}

const PARK_ID = '11111111-0000-0000-0000-000000000001'

function initials(name: string) {
  return name.split(/[\s\-]+/).filter(Boolean).slice(0,2).map(x => x[0].toUpperCase()).join('')
}

export function ChatClient({ berichten: initial, owners, currentUserId, currentUserName }: Props) {
  const [berichten, setBerichten] = useState(initial)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [berichten, selectedOwner])

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
      park_id: PARK_ID,
      from_id: currentUserId,
      to_id: selectedOwner?.id ?? null,
      bericht: input.trim(),
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

  // Filter berichten voor huidig gesprek
  const visibleBerichten = berichten.filter(b => {
    if (selectedOwner) {
      return b.to_id === selectedOwner.id || b.from_id === selectedOwner.id
    }
    return b.to_id === null // algemeen kanaal
  })

  // Groepeer per dag
  const grouped: { date: string; items: Bericht[] }[] = []
  visibleBerichten.forEach(b => {
    const d = formatDate(b.created_at)
    const last = grouped[grouped.length - 1]
    if (last?.date === d) last.items.push(b)
    else grouped.push({ date: d, items: [b] })
  })

  // Bereken ongelezen per eigenaar
  function unreadCount(ownerId: string | null) {
    return berichten.filter(b =>
      !b.gelezen && b.from_id !== currentUserId &&
      (ownerId ? b.from_id === ownerId : b.to_id === null)
    ).length
  }

  // Laatste bericht per eigenaar
  function lastMessage(ownerId: string | null) {
    const msgs = berichten.filter(b =>
      ownerId ? b.to_id === ownerId || b.from_id === ownerId : b.to_id === null
    )
    return msgs[msgs.length - 1]
  }

  // Sidebar items
  const sidebarItems = [
    { id: null, name: 'Algemeen', color: '#6e6e73' },
    ...owners.map(o => ({ id: o.id, name: o.name, color: o.color })),
  ]

  const filteredSidebarItems = sidebarItems.filter(item => {
    const unread = unreadCount(item.id)
    if (filter === 'unread') return unread > 0
    if (filter === 'read') return unread === 0
    return true
  })

  return (
    <div className="flex p-7 gap-4 max-w-[1200px]" style={{height: 'calc(100vh - 40px)'}}>
      {/* Left: gesprekken sidebar */}
      <div className="w-[260px] flex-shrink-0 bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-black/[0.05] flex flex-col overflow-hidden">
        <div className="px-4 py-4 border-b border-black/[0.05]">
          <div className="text-[14px] font-semibold text-[#1d1d1f] mb-3">Gesprekken</div>
          <div className="flex gap-1">
            {[['all','Alle'],['unread','Ongelezen'],['read','Gelezen']].map(([v,l]) => (
              <button key={v} onClick={() => setFilter(v as 'all'|'unread'|'read')}
                className={`flex-1 py-1 rounded-full text-[11px] font-medium transition-all
                  ${filter === v
                    ? 'bg-[rgba(0,113,227,0.10)] text-[#004f9e]'
                    : 'text-[#6e6e73] hover:bg-black/[0.05]'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredSidebarItems.map(item => {
            const last = lastMessage(item.id)
            const unread = unreadCount(item.id)
            const isSelected = selectedOwner?.id === item.id || (!selectedOwner && item.id === null)
            return (
              <div key={String(item.id)} onClick={() => setSelectedOwner(item.id ? owners.find(o => o.id === item.id) ?? null : null)}
                className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-all border-b border-black/[0.04]
                  ${isSelected ? 'bg-[rgba(0,113,227,0.08)]' : 'hover:bg-black/[0.02]'}`}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-semibold text-white flex-shrink-0"
                  style={{ background: item.color }}>
                  {initials(item.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[13px] font-medium text-[#1d1d1f] truncate">{item.name}</span>
                    {last && <span className="text-[10px] text-[#aeaeb2] flex-shrink-0">{formatTime(last.created_at)}</span>}
                  </div>
                  {last && (
                    <div className="text-[11px] text-[#6e6e73] truncate mt-0.5">{last.bericht}</div>
                  )}
                </div>
                {unread > 0 && (
                  <div className="w-5 h-5 rounded-full bg-[#0071e3] flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0">
                    {unread}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Right: chat venster */}
      <div className="flex-1 flex flex-col bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-black/[0.05] overflow-hidden">
        {/* Chat header */}
        <div className="px-5 py-4 border-b border-black/[0.05] flex items-center gap-3 flex-shrink-0">
          {selectedOwner ? (
            <>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white"
                style={{ background: selectedOwner.color }}>{initials(selectedOwner.name)}</div>
              <div>
                <div className="text-[14px] font-semibold">{selectedOwner.name}</div>
                <div className="text-[11px] text-[#6e6e73]">{selectedOwner.email ?? ''}</div>
              </div>
            </>
          ) : (
            <>
              <div className="w-8 h-8 rounded-full bg-[#6e6e73] flex items-center justify-center text-[11px] font-semibold text-white">#</div>
              <div>
                <div className="text-[14px] font-semibold">Algemeen</div>
                <div className="text-[11px] text-[#6e6e73]">Teamchat</div>
              </div>
            </>
          )}
        </div>

        {/* Berichten */}
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
                    <div className="w-7 h-7 rounded-full bg-[#0071e3] flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0 mt-0.5">
                      {isMe ? initials(currentUserName) : (selectedOwner ? initials(selectedOwner.name) : 'T')}
                    </div>
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

        {/* Input */}
        <div className="border-t border-black/[0.05] px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder={selectedOwner ? 'Stuur bericht naar ' + selectedOwner.name + '...' : 'Stuur bericht naar het team...'}
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
