export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden px-6 py-20 text-center">
        <div className="mx-auto max-w-4xl">
          {/* Icon */}
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="h-32 w-32 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                <svg className="h-16 w-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="absolute -right-2 -top-2 text-2xl">✨</div>
              <div className="absolute -left-2 -bottom-2 text-2xl">✨</div>
            </div>
          </div>

          {/* Headline */}
          <h1 className="mb-6 text-5xl font-bold leading-tight md:text-6xl">
            The AI Life Coach<br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              That Pays You to Improve
            </span>
          </h1>

          <p className="mb-10 text-xl text-gray-400">
            Track your day, get AI insights, earn $LIFE tokens for hitting your goals
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <a
              href="https://github.com/0xrichyrich/lifelog-agent"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-blue-600 px-8 py-4 font-semibold text-white hover:bg-blue-700 transition"
            >
              View on GitHub
            </a>
            <a
              href="#features"
              className="rounded-lg border border-gray-700 px-8 py-4 font-semibold hover:bg-gray-900 transition"
            >
              Learn More
            </a>
          </div>

          {/* Tags */}
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <span className="rounded-full bg-gray-900 px-4 py-2 text-sm">🔒 Privacy-First</span>
            <span className="rounded-full bg-gray-900 px-4 py-2 text-sm">📱 iOS App</span>
            <span className="rounded-full bg-gray-900 px-4 py-2 text-sm">💰 Earn $LIFE</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-20 bg-gray-950">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-4xl font-bold">How It Works</h2>
          
          <div className="grid gap-8 md:grid-cols-3">
            {/* Feature 1 */}
            <div className="rounded-xl bg-gray-900 p-8">
              <div className="mb-4 text-4xl">📝</div>
              <h3 className="mb-3 text-xl font-bold">Quick Logging</h3>
              <p className="text-gray-400">
                2-tap check-ins, voice notes, or manual entries. Your timeline updates in real-time.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-xl bg-gray-900 p-8">
              <div className="mb-4 text-4xl">🧠</div>
              <h3 className="mb-3 text-xl font-bold">AI Insights</h3>
              <p className="text-gray-400">
                Pattern detection, coaching, and smart nudges. Your personal life analyst.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-xl bg-gray-900 p-8">
              <div className="mb-4 text-4xl">💰</div>
              <h3 className="mb-3 text-xl font-bold">Token Rewards</h3>
              <p className="text-gray-400">
                Earn $LIFE tokens by completing goals. Crypto meets self-improvement.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Screenshots */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-4xl font-bold">Beautiful iOS App</h2>
          
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="overflow-hidden rounded-2xl bg-gray-900">
              <img src="/screenshots/01-checkin.png" alt="Check In" className="w-full" />
              <p className="p-4 text-center text-sm text-gray-400">Quick Check-in</p>
            </div>
            <div className="overflow-hidden rounded-2xl bg-gray-900">
              <img src="/screenshots/02-timeline.png" alt="Timeline" className="w-full" />
              <p className="p-4 text-center text-sm text-gray-400">Timeline View</p>
            </div>
            <div className="overflow-hidden rounded-2xl bg-gray-900">
              <img src="/screenshots/03-goals.png" alt="Goals" className="w-full" />
              <p className="p-4 text-center text-sm text-gray-400">Goals & Streaks</p>
            </div>
            <div className="overflow-hidden rounded-2xl bg-gray-900">
              <img src="/screenshots/04-settings.png" alt="Settings" className="w-full" />
              <p className="p-4 text-center text-sm text-gray-400">Settings</p>
            </div>
          </div>
        </div>
      </section>

      {/* Token */}
      <section className="px-6 py-20 bg-gray-950">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-6 text-4xl font-bold">$LIFE Token</h2>
          <p className="mb-12 text-xl text-gray-400">
            Built on Monad and Solana. Earn tokens by improving yourself.
          </p>

          <div className="grid gap-6 md:grid-cols-3 mb-12">
            <div>
              <div className="text-3xl font-bold text-blue-400">100</div>
              <div className="text-sm text-gray-400">$LIFE per daily goal</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-400">500</div>
              <div className="text-sm text-gray-400">$LIFE per weekly goal</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-yellow-400">50</div>
              <div className="text-sm text-gray-400">$LIFE per day streak</div>
            </div>
          </div>

          <a
            href="https://github.com/0xrichyrich/lifelog-agent"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-lg bg-blue-600 px-8 py-4 font-semibold text-white hover:bg-blue-700 transition"
          >
            Get Started
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-6 py-12 text-center text-gray-400">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 flex justify-center gap-6">
            <a href="https://github.com/0xrichyrich/lifelog-agent" className="hover:text-white transition">GitHub</a>
            <a href="https://x.com/SkynetSays" className="hover:text-white transition">Twitter</a>
          </div>
          <p className="text-sm">
            Built for <a href="https://moltiverse.xyz" className="text-blue-400 hover:underline">Moltiverse Hackathon</a>
          </p>
        </div>
      </footer>
    </main>
  )
}
