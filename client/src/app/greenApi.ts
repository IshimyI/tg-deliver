const BASE_URL = 'https://api.green-api.com'

export interface Credentials {
  idInstance: string
  apiTokenInstance: string
}

export interface CheckAccountResult {
  exist: boolean
  chatId: string
}

export interface IncomingNotification {
  receiptId: number
  body: {
    typeWebhook: string
    senderData?: {
      chatId: string
      sender: string
      senderName?: string
    }
    messageData?: {
      typeMessage: string
      textMessageData?: {
        textMessage: string
      }
    }
  }
}

function url(creds: Credentials, method: string): string {
  return `${BASE_URL}/waInstance${creds.idInstance}/${method}/${creds.apiTokenInstance}`
}

export async function checkAccount(
  creds: Credentials,
  phoneNumber: string
): Promise<CheckAccountResult> {
  const res = await fetch(url(creds, 'checkAccount'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: Number(phoneNumber) }),
  })
  if (!res.ok) {
    throw new Error(`checkAccount failed: ${res.status}`)
  }
  return res.json()
}

export async function sendMessage(
  creds: Credentials,
  chatId: string,
  message: string
): Promise<{ idMessage: string }> {
  const res = await fetch(url(creds, 'sendMessage'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId, message }),
  })
  if (!res.ok) {
    throw new Error(`sendMessage failed: ${res.status}`)
  }
  return res.json()
}

export async function receiveNotification(
  creds: Credentials
): Promise<IncomingNotification | null> {
  const res = await fetch(url(creds, 'receiveNotification'), {
    method: 'GET',
  })
  if (!res.ok) {
    throw new Error(`receiveNotification failed: ${res.status}`)
  }
  const text = await res.text()
  if (!text) return null
  const data = JSON.parse(text)
  return data ?? null
}

export async function deleteNotification(
  creds: Credentials,
  receiptId: number
): Promise<void> {
  const res = await fetch(`${url(creds, 'deleteNotification')}/${receiptId}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    throw new Error(`deleteNotification failed: ${res.status}`)
  }
}
