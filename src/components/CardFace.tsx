import Image from "next/image";
import type { Card } from "@/lib/types";
import { Schematic } from "./Schematic";

/**
 * The front of a card. Uses a real photo when the content has one (scraped or
 * hand-added) and falls back to the schematic otherwise.
 */
export function CardFace({ card, priority }: { card: Card; priority?: boolean }) {
  if (card.image) {
    return (
      <figure className="relative h-full w-full">
        <Image
          src={card.image.src}
          // Never name the country here: the photo is the question and the
          // country is the answer, so this would read it out before the flip.
          alt={card.image.alt || `A roadside ${card.category.replace(/-/g, " ")} photo`}
          fill
          priority={priority}
          sizes="(max-width: 768px) 100vw, 720px"
          className="object-cover"
        />
        {card.image.credit ? (
          <figcaption className="absolute bottom-0 right-0 bg-black/55 px-2 py-1 text-[10px] text-white">
            {card.image.creditUrl ? (
              <a href={card.image.creditUrl} target="_blank" rel="noreferrer noopener" className="underline">
                {card.image.credit}
              </a>
            ) : (
              card.image.credit
            )}
          </figcaption>
        ) : null}
      </figure>
    );
  }

  return <Schematic art={card.art} className="p-6" />;
}
