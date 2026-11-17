import type { Metadata } from "next";
import { notFound } from "next/navigation";
import StationPlayer from "@/components/StationPlayer";
import { RADIO_STATIONS } from "@/lib/types";

/** One page per radio station: /radio/kcbs, /radio/kcbs2, /radio/pyfm.
 *  Static — the three stations are known at build time; an unknown
 *  slug 404s. (No `dynamicParams` export: it is incompatible with
 *  cacheComponents — on-demand rendering of unlisted params is the
 *  default under PPR, so unknown slugs must 404 explicitly here.) */
export function generateStaticParams() {
  return RADIO_STATIONS.map((s) => ({ station: s.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ station: string }> }): Promise<Metadata> {
  const { station } = await params;
  const s = RADIO_STATIONS.find((x) => x.id === station);
  if (!s) return { title: "Radio — DPRK Media Mirror" };
  return {
    title: `${s.name} — Radio — DPRK Media Mirror`,
    description: `${s.name} (${s.korean}), streaming live on this site.`,
  };
}

export default async function StationPage({ params }: { params: Promise<{ station: string }> }) {
  const { station } = await params;
  const s = RADIO_STATIONS.find((x) => x.id === station);
  if (!s) notFound();
  return <StationPlayer station={s} />;
}
