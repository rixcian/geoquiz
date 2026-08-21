import { ALL_CARDS } from "@/content";
import { DeckBuilder } from "@/components/DeckBuilder";

export default function HomePage() {
  return <DeckBuilder cards={ALL_CARDS} />;
}
