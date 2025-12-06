import "./chunk-2OQEBDUJ.js";
import {
  AccessibilitySystem,
  DOMPipe,
  EventSystem,
  FederatedContainer,
  accessibilityTarget
} from "./chunk-3VP6347N.js";
import "./chunk-YXOWDNXQ.js";
import "./chunk-RRDNFVBD.js";
import {
  Container,
  extensions
} from "./chunk-YR6V32XD.js";
import "./chunk-5WRI5ZAA.js";

// node_modules/pixi.js/lib/accessibility/init.mjs
extensions.add(AccessibilitySystem);
extensions.mixin(Container, accessibilityTarget);

// node_modules/pixi.js/lib/events/init.mjs
extensions.add(EventSystem);
extensions.mixin(Container, FederatedContainer);

// node_modules/pixi.js/lib/dom/init.mjs
extensions.add(DOMPipe);
//# sourceMappingURL=browserAll-IPHVUEOD.js.map
