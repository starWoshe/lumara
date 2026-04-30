'use client'

export default function ToggleButton({
  mage,
  enabled,
}: {
  mage: string
  enabled: boolean
}) {
  const label = enabled ? 'Вимкнути' : 'Увімкнути'
  const style = enabled
    ? 'bg-red-900/40 text-red-200 hover:bg-red-900/60'
    : 'bg-green-900/40 text-green-200 hover:bg-green-900/60'

  return (
    <button
      className={`text-xs px-3 py-1 rounded-full transition ${style}`}
      onClick={async () => {
        try {
          const res = await fetch('/api/userbot/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mage: mage.toLowerCase(), enabled: !enabled }),
          })
          if (res.ok) {
            window.location.reload()
          } else {
            alert('Помилка зміни статусу')
          }
        } catch {
          alert('Помилка зміни статусу')
        }
      }}
    >
      {label}
    </button>
  )
}
