// Screen registry: the shell and the exporter read this array.
// Add one module per screen, export a Screen from ../design/contract.ts, then list it here.
import type { Screen } from "../design/contract.js";
import { home } from "./home.js";
import { pets } from "./pets.js";
import { roads } from "./roads.js";
import { today } from "./today.js";
import { adopt } from "./adopt.js";

// Order is the page cycle (SPEC §5): the tamagotchi home first, then the four pages in
// BOOT-short order — pets(1/4) -> roads(2/4) -> today(3/4) -> adopt(4/4). Every screen is a
// PROPOSAL — `proposal: true` makes the shell print the badge — because the F1 firmware
// does not exist yet; the header grammar and palette are the only firmware-cited things.
export const SCREENS: Screen[] = [home, pets, roads, today, adopt];
