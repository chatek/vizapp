// Screen registry: the shell and the exporter read this array.
// Add one module per screen, export a Screen from ../design/contract.ts, then list it here.
import type { Screen } from "../design/contract.js";
import { home } from "./home.js";
import { nodes } from "./nodes.js";
import { fabric } from "./fabric.js";
import { pairing } from "./pairing.js";

// Order is the review order: the tamagotchi home first (the v2 narrative's idle screen),
// then the status pages (fleet, fabric), then the commissioning window. Every screen is a
// PROPOSAL — `proposal: true` makes the shell print the badge — because the F1 firmware
// does not exist yet; the header grammar and palette are the only firmware-cited things.
export const SCREENS: Screen[] = [home, nodes, fabric, pairing];
