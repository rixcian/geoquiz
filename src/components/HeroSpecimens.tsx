import type { Card } from "@/lib/types";
import { Schematic } from "./Schematic";

/**
 * Decorative stack for the hero: three real cards from the deck, drawn with
 * the same schematic renderer the drill uses. Showing actual product output
 * beats an abstract illustration, and it costs nothing extra to render.
 *
 * Hidden below `lg`, where the hero copy already fills the width.
 */
export function HeroSpecimens({ cards }: { cards: Card[] }) {
  if (cards.length === 0) return null;

  const tilts = ["-rotate-6", "rotate-3", "-rotate-2"];
  const offsets = ["translate-y-4", "-translate-y-3", "translate-y-6"];

  return (
    <div aria-hidden className="pointer-events-none hidden select-none items-center gap-3 lg:flex">
      {cards.slice(0, 3).map((card, i) => (
        <div
          key={card.id}
          className={`art-stage grid h-40 w-28 place-items-center overflow-hidden rounded-2xl border border-line/80 p-2.5 shadow-xl shadow-black/25 [&_svg]:max-h-full [&_svg]:w-auto [&_svg]:max-w-full ${tilts[i]} ${offsets[i]}`}
        >
          <Schematic art={card.art} />
        </div>
      ))}
    </div>
  );
}
