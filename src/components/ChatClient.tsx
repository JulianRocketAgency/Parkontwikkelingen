'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronRight } from 'lucide-react'

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

interface Colleague {
  id: string
  naam: string | null
  full_name: string | null
  email: string | null
  role: string | null
  avatar_color: string | null
}

type Contact = { id: string; name: string; color: string; email: string | null; type: 'algemeen' | 'collega' | 'eigenaar' }

interface Props {
  berichten: Bericht[]
  owners: Owner[]
  colleagues: Colleague[]
  currentUserId: string
  currentUserName: string
}

const PARK_ID = '11111111-0000-0000-0000-000000000001'

function initials(name: string) {
  return name.split(/[\s\-]+/).filter(Boolean).slice(0,2).map(x => x[0].toUpperCase()).join('') || '?'
}

export function ChatClient({ berichten: initial, owners, colleagues, currentUserId, currentUserName }: Props) {
  const [berichten, setBerichten] = useState(initial)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [selected, setSelected] = useState<Contact>({ id: 'algemeen', name: 'Algemeen', color: '#6e6e73', email: null, type: 'algemeen' })
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [colleaguesOpen, setColleaguesOpen] = useState(true)
  const [ownersOpen, setOwnersOpen] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [berichten, selected])

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
      to_id: selected.type === 'algemeen' ? null : selected.id,
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

  function unreadCount(contact: Contact) {
    return berichten.filter(b => {
      if (!b.gelezen && b.from_id !== currentUserId) {
        if (contact.type === 'algemeen') return b.to_id === null
        return b.from_id === contact.id
      }
      return false
    }).length
  }

  function lastMessage(contact: Contact) {
    const msgs = berichten.filter(b =>
      contact.type === 'algemeen'
        ? b.to_id === null
        : b.from_id === contact.id || b.to_id === contact.id
    )
    return msgs[msgs.length - 1]
  }

  const visibleBerichten = berichten.filter(b =>
    selected.type === 'algemeen'
      ? b.to_id === null
      : b.from_id === selected.id || b.to_id === selected.id
  )

  const grouped: { date: string; items: Bericht[] }[] = []
  visibleBerichten.forEach(b => {
    const d = formatDate(b.created_at)
    const last = grouped[grouped.length - 1]
    if (last?.date === d) last.items.push(b)
    else grouped.push({ date: d, items: [b] })
  })

  const colleagueContacts: Contact[] = colleagues.map(c => ({
    id: c.id,
    name: c.naam ?? c.full_name ?? c.email ?? 'Gebruiker',
    color: c.avatar_color ?? '#6e6e73',
    email: c.email,
    type: 'collega',
  }))

  const ownerContacts: Contact[] = owners.map(o => ({
    id: o.id,
    name: o.name,
    color: o.color,
    email: o.email,
    type: 'eigenaar',
  }))

  function filterContact(c: Contact) {
    if (filter === 'unread') return unreadCount(c) > 0
    return true
  }

  const algemeen: Contact = { id: 'algemeen', name: 'Algemeen', color: '#6e6e73', email: null, type: 'algemeen' }

  function ContactRow({ contact }: { contact: Contact }) {
    const last = lastMessage(contact)
    const unread = unreadCount(contact)
    const isSelected = selected.id === contact.id
    return (
      <div onClick={() => setSelected(contact)}
        className={'flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-all ' +
          (isSelected ? 'bg-[rgba(0,113,227,0.08)]' : 'hover:bg-black/[0.02]')}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0"
          style={{ background: contact.color }}>{initials(contact.name)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[12px] font-medium text-[#1d1d1f] truncate">{contact.name}</span>
            {last && <span className="text-[10px] text-[#aeaeb2] flex-shrink-0">{formatTime(last.created_at)}</span>}
          </div>
          {last && <div className="text-[11px] text-[#6e6e73] truncate">{last.bericht}</div>}
        </div>
        {unread > 0 && (
          <div className="w-5 h-5 rounded-full bg-[#0071e3] flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0">{unread}</div>
        )}
      </div>
    )
  }

  function Section({ title, open, onToggle, contacts, badge }: {
    title: string; open: boolean; onToggle: () => void; contacts: Contact[]; badge?: number
  }) {
    const filtered = contacts.filter(filterContact)
    return (
      <div>
        <div onClick={onToggle}
          className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-black/[0.02] transition-all">
          <ChevronRight size={12} className={'text-[#aeaeb2] transition-transform ' + (open ? 'rotate-90' : '')} />
          <span className="text-[11px] font-semibold text-[#aeaeb2] uppercase tracking-[0.06em] flex-1">{title}</span>
          {badge !== undefined && badge > 0 && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[rgba(0,113,227,0.10)] text-[#004f9e]">{badge}</span>
          )}
          <span className="text-[10px] text-[#aeaeb2]">{contacts.length}</span>
        </div>
        {open && filtered.map(c => <ContactRow key={c.id} contact={c} />)}
        {open && filtered.length === 0 && (
          <div className="px-3 py-2 text-[11px] text-[#aeaeb2]">Geen gesprekken</div>
        )}
      </div>
    )
  }

  return (
    <div className="flex p-7 gap-4 max-w-[1200px]" style={{height: 'calc(100vh - 40px)'}}>
      {/* Sidebar */}
      <div className="w-[240px] flex-shrink-0 bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-black/[0.05] flex flex-col overflow-hidden">
        <div className="px-3 py-3.5 border-b border-black/[0.05]">
          <div className="text-[13px] font-semibold text-[#1d1d1f] mb-2.5">Gesprekken</div>
          <div className="flex gap-1">
            {[['all','Alle'],['unread','Ongelezen']].map(([v,l]) => (
              <button key={v} onClick={() => setFilter(v as 'all'|'unread')}
                className={'flex-1 py-1 rounded-full text-[11px] font-medium transition-all ' +
                  (filter === v ? 'bg-[rgba(0,113,227,0.10)] text-[#004f9e]' : 'text-[#6e6e73] hover:bg-black/[0.05]')}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {/* Algemeen */}
          {filterContact(algemeen) && <ContactRow contact={algemeen} />}
          <div className="h-px bg-black/[0.05] mx-3 my-1" />
          {/* Collega's */}
          <Section
            title="Collega's"
            open={colleaguesOpen}
            onToggle={() => setColleaguesOpen(o => !o)}
            contacts={colleagueContacts}
            badge={colleagueContacts.reduce((s, c) => s + unreadCount(c), 0)}
          />
          <div className="h-px bg-black/[0.05] mx-3 my-1" />
          {/* Eigenaren */}
          <Section
            title="Eigenaren"
            open={ownersOpen}
            onToggle={() => setOwnersOpen(o => !o)}
            contacts={ownerContacts}
            badge={ownerContacts.reduce((s, c) => s + unreadCount(c), 0)}
          />
        </div>
      </div>

      {/* Chat venster */}
      <div className="flex-1 flex flex-col bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-black/[0.05] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-black/[0.05] flex items-center gap-3 flex-shrink-0">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0"
            style={{ background: selected.color }}>{initials(selected.name)}</div>
          <div>
            <div className="text-[14px] font-semibold">{selected.name}</div>
            <div className="text-[11px] text-[#6e6e73]">
              {selected.type === 'algemeen' ? 'Teamchat'
                : selected.type === 'collega' ? 'Collega'
                : 'Eigenaar'}
            </div>
          </div>
        </div>

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
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0 mt-0.5"
                      style={{ background: isMe ? '#0071e3' : selected.color }}>
                      {isMe ? initials(currentUserName) : initials(selected.name)}
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

        <div className="border-t border-black/[0.05] px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder={'Bericht naar ' + selected.name + '...'}
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
