import Image from 'next/image'

// Layout для сторінок авторизації — з фоном замку академії
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Фон — замок академії */}
      <Image
        src="/academy-castle.png"
        alt=""
        fill
        className="object-cover object-center"
        priority
      />
      {/* Темний оверлей */}
      <div className="absolute inset-0 bg-black/65" />

      {/* Декоративні зірки */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-10">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 3 + 1 + 'px',
              height: Math.random() * 3 + 1 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              opacity: Math.random() * 0.6 + 0.1,
            }}
          />
        ))}
      </div>

      <div className="relative z-20 w-full flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}
