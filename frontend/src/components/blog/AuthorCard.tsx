'use client'

interface AuthorCardProps {
  name: string
  avatarUrl?: string
  bio?: string
}

export default function AuthorCard({ name, avatarUrl, bio }: AuthorCardProps) {
  const defaultBio = 'Principal Technical Writer and AI Analyst at Trinetra AI. Writing about voice AI agents, conversational technology, automation, and system integrations.'

  return (
    <div className="rounded-3xl border border-white/[0.06] bg-gradient-to-br from-[#130324]/50 to-[#070010]/80 p-6 backdrop-blur-xl">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
        {/* Avatar */}
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-violet-500/20 bg-violet-600/10">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xl font-bold text-violet-300">
              {name.charAt(0)}
            </div>
          )}
        </div>

        {/* Text Details */}
        <div className="text-center sm:text-left">
          <h4 className="font-display text-lg font-bold text-white">
            Written by {name}
          </h4>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400 font-medium">
            {bio || defaultBio}
          </p>
        </div>
      </div>
    </div>
  )
}
