import { useEffect, useRef, useState } from 'react'
import {
  checkAccount,
  deleteNotification,
  receiveNotification,
  sendMessage,
  type Credentials,
} from './greenApi'
import './App.css'

interface ChatMessage {
  id: string
  text: string
  fromMe: boolean
}

const CREDS_KEY = 'green-api-creds'

function loadCreds(): Credentials | null {
  const raw = localStorage.getItem(CREDS_KEY)
  return raw ? JSON.parse(raw) : null
}

function LoginForm({ onLogin }: { onLogin: (creds: Credentials) => void }) {
  const [idInstance, setIdInstance] = useState(
    import.meta.env.DEV ? import.meta.env.VITE_ID_INSTANCE ?? '' : ''
  )
  const [apiTokenInstance, setApiTokenInstance] = useState(
    import.meta.env.DEV ? import.meta.env.VITE_API_TOKEN_INSTANCE ?? '' : ''
  )
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!idInstance.trim() || !apiTokenInstance.trim()) {
      setError('Заполните оба поля')
      return
    }
    const creds = { idInstance: idInstance.trim(), apiTokenInstance: apiTokenInstance.trim() }
    localStorage.setItem(CREDS_KEY, JSON.stringify(creds))
    onLogin(creds)
  }

  return (
    <div className="screen">
      <form className="card" onSubmit={handleSubmit}>
        <h1>Вход в GREEN-API</h1>
        <label>
          idInstance
          <input
            value={idInstance}
            onChange={(e) => setIdInstance(e.target.value)}
            placeholder="1101123456"
          />
        </label>
        <label>
          apiTokenInstance
          <input
            value={apiTokenInstance}
            onChange={(e) => setApiTokenInstance(e.target.value)}
            placeholder="d75b3a66374942c5b3c019c698abd2..."
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit">Войти</button>
      </form>
    </div>
  )
}

function NewChatForm({
  creds,
  onChatReady,
}: {
  creds: Credentials
  onChatReady: (chatId: string, phone: string) => void
}) {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!phone.trim()) return
    setLoading(true)
    try {
      const result = await checkAccount(creds, phone.trim())
      if (!result.exist) {
        setError('У этого номера нет Telegram или скрыты настройки приватности')
        return
      }
      onChatReady(result.chatId, phone.trim())
    } catch {
      setError('Не удалось проверить номер. Проверьте данные и попробуйте снова')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="screen">
      <form className="card" onSubmit={handleSubmit}>
        <h1>Новый чат</h1>
        <label>
          Номер телефона получателя
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="79991234567"
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Проверка...' : 'Создать чат'}
        </button>
      </form>
    </div>
  )
}

function ChatWindow({
  creds,
  chatId,
  phone,
}: {
  creds: Credentials
  chatId: string
  phone: string
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false

    async function poll() {
      while (!cancelled) {
        try {
          const notification = await receiveNotification(creds)
          if (notification) {
            const { body, receiptId } = notification
            if (
              body.typeWebhook === 'incomingMessageReceived' &&
              body.senderData?.chatId === chatId &&
              body.messageData?.typeMessage === 'textMessage' &&
              body.messageData.textMessageData
            ) {
              setMessages((prev) => [
                ...prev,
                {
                  id: String(receiptId),
                  text: body.messageData!.textMessageData!.textMessage,
                  fromMe: false,
                },
              ])
            }
            await deleteNotification(creds, receiptId)
          } else {
            await new Promise((r) => setTimeout(r, 2000))
          }
        } catch {
          await new Promise((r) => setTimeout(r, 3000))
        }
      }
    }

    poll()
    return () => {
      cancelled = true
    }
  }, [creds, chatId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text || sending) return
    setSending(true)
    setDraft('')
    setMessages((prev) => [...prev, { id: `local-${Date.now()}`, text, fromMe: true }])
    try {
      await sendMessage(creds, chatId, text)
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `error-${Date.now()}`, text: 'Не удалось отправить сообщение', fromMe: false },
      ])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="chat">
      <div className="chat-header">{phone}</div>
      <div className="chat-messages">
        {messages.map((m) => (
          <div key={m.id} className={`bubble ${m.fromMe ? 'bubble-out' : 'bubble-in'}`}>
            {m.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form className="chat-input" onSubmit={handleSend}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Сообщение"
        />
        <button type="submit" disabled={sending}>
          Отправить
        </button>
      </form>
    </div>
  )
}

function App() {
  const [creds, setCreds] = useState<Credentials | null>(() => loadCreds())
  const [chat, setChat] = useState<{ chatId: string; phone: string } | null>(null)

  if (!creds) {
    return <LoginForm onLogin={setCreds} />
  }

  if (!chat) {
    return (
      <NewChatForm
        creds={creds}
        onChatReady={(chatId, phone) => setChat({ chatId, phone })}
      />
    )
  }

  return <ChatWindow creds={creds} chatId={chat.chatId} phone={chat.phone} />
}

export default App
