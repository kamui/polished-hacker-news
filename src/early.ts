import { applyDownvoteSlot } from "./page";
import { applySettings, readMirror } from "./settings";

applySettings(readMirror());
applyDownvoteSlot();
