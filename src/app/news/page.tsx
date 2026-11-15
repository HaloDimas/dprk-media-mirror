import NewsSearch from "@/components/NewsSearch";
import { getAllNews } from "@/lib/sources";


export default async function NewsPage() {
  const items = await getAllNews();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">News</h1>
        <p className="mt-1 text-sm text-zinc-400">
          KCNA articles from the Korea News Service — read in full on this site — together with the latest
          headlines from KCNA Watch.
        </p>
      </div>
      {items.length === 0 ? (
        <p className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-sm text-zinc-400">
          News is temporarily unavailable. Please try again later.
        </p>
      ) : (
        <NewsSearch items={items} />
      )}
    </div>
  );
}
