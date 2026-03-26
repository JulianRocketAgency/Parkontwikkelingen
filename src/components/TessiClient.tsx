'use client'
import { useState, useRef, useEffect } from 'react'
import { Bot, Send } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  'Hoeveel kavels zijn er nog beschikbaar?',
  'Welke eigenaren hebben nog openstaande termijnen?',
  'Wat is de voortgang van fase 1?',
  'Welke kavels zijn nog niet verkocht?',
  'Wie zijn de vakmannen in het team?',
]

export function TessiClient({ userName }: { userName: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function send(text?: string) {
    const msg = text ?? input.trim()
    if (!msg || loading) return
    setInput('')
    const newMessages: Message[] = [...messages, { role: 'user', content: msg }]
    setMessages(newMessages)
    setLoading(true)
    try {
      const res = await fetch('/api/tessi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Er is een fout opgetreden. Probeer het opnieuw.' }])
    }
    setLoading(false)
  }

  function formatTime() {
    return new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col p-7 max-w-[860px]" style={{height: 'calc(100vh - 40px)'}}>
      <div className="mb-4 flex-shrink-0 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#bf5af2] to-[#0071e3] flex items-center justify-center flex-shrink-0">
          <Bot size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.5px]">Tessi</h1>
          <p className="text-[13px] text-[#6e6e73]">AI assistent — heeft toegang tot alle parkdata</p>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.07)] border border-black/[0.05] flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center gap-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#bf5af2] to-[#0071e3] flex items-center justify-center">
                <Bot size={28} className="text-white" />
              </div>
              <div className="text-center">
                <div className="text-[16px] font-semibold text-[#1d1d1f] mb-1">Hoi {userName}, ik ben Tessi</div>
                <div className="text-[13px] text-[#6e6e73]">Stel me een vraag over het park, kavels of eigenaren.</div>
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-w-[500px]">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => send(s)}
                    className="text-[12px] px-3.5 py-2 rounded-full bg-[#f5f5f7] border border-black/[0.06] text-[#3a3a3c] hover:bg-[#e8e8ed] hover:border-[rgba(0,113,227,0.3)] transition-all">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => {
            const isUser = m.role === 'user'
            return (
              <div key={i} className={'flex gap-3 mb-4 ' + (isUser ? 'flex-row-reverse' : 'flex-row')}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0 mt-0.5 ${isUser ? 'bg-[#0071e3] text-white' : 'bg-gradient-to-br from-[#bf5af2] to-[#0071e3] text-white'}`}>
                  {isUser ? 'JV' : <Bot size={13} />}
                </div>
                <div className={'max-w-[80%] flex flex-col gap-1 ' + (isUser ? 'items-end' : 'items-start')}>
                  <div className={`px-4 py-3 rounded-[14px] text-[13px] leading-relaxed whitespace-pre-wrap ${isUser ? 'bg-[#0071e3] text-white rounded-tr-[4px]' : 'bg-[#f5f5f7] text-[#1d1d1f] rounded-tl-[4px]'}`}>
                    {m.content}
                  </div>
                  <span className="text-[10px] text-[#aeaeb2]">{formatTime()}</span>
                </div>
              </div>
            )
          })}

          {loading && (
            <div className="flex gap-3 mb-4">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#bf5af2] to-[#0071e3] flex items-center justify-center flex-shrink-0">
                <Bot size={13} className="text-white" />
              </div>
              <div className="px-4 py-3 bg-[#f5f5f7] rounded-[14px] rounded-tl-[4px] flex gap-1.5 items-center">
                <div className="w-1.5 h-1.5 bg-[#aeaeb2] rounded-full animate-bounce" style={{animationDelay:'0ms'}} />
                <div className="w-1.5 h-1.5 bg-[#aeaeb2] rounded-full animate-bounce" style={{animationDelay:'150ms'}} />
                <div className="w-1.5 h-1.5 bg-[#aeaeb2] rounded-full animate-bounce" style={{animationDelay:'300ms'}} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-black/[0.05] px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Stel Tessi een vraag..."
            className="flex-1 bg-[#f5f5f7] border border-black/[0.05] rounded-full px-4 py-2.5 text-[13px] outline-none focus:border-[#bf5af2] focus:bg-white transition-all" />
          <button onClick={() => send()} disabled={loading || !input.trim()}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-[#bf5af2] to-[#0071e3] flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition-all">
            <Send size={14} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}
