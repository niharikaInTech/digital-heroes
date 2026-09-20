import Link from 'next/link';

// Shows the charity image, or a coloured block with its first letter.
export function CharityImage({ charity, className = 'h-44' }) {
  if (charity.image_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={charity.image_url} alt="" className={`${className} w-full object-cover`} />;
  }
  return (
    <div className={`${className} flex w-full items-center justify-center bg-forest`}>
      <span className="font-serif text-6xl italic text-sage">{charity.name.charAt(0)}</span>
    </div>
  );
}

export default function CharityCard({ charity }) {
  const upcoming = (charity.events || []).length;
  return (
    <Link
      href={`/charities/${charity.id}`}
      className="group overflow-hidden rounded-2xl border border-cream/10 bg-forest/30 transition hover:border-sage/60"
    >
      <CharityImage charity={charity} />
      <div className="p-5">
        <h3 className="text-lg font-semibold group-hover:text-sage">{charity.name}</h3>
        <p className="muted mt-2 line-clamp-3 text-sm">{charity.description}</p>
        {upcoming > 0 && (
          <p className="mt-3 text-xs text-copper">
            {upcoming} upcoming event{upcoming > 1 ? 's' : ''}
          </p>
        )}
      </div>
    </Link>
  );
}
