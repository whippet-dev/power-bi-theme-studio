import type { ReactNode } from "react";
import type { VisualKind } from "./visualCatalog";

type VisualIconProps = { kind: VisualKind };

function IconFrame({ kind, children }: { kind: VisualKind; children: ReactNode }) {
  return (
    <svg
      className="visual-rail__icon"
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
      data-visual-icon={kind}
    >
      {children}
    </svg>
  );
}

const axis = <path d="M5 5v22h22" className="visual-icon__muted" />;

/** Independent, deliberately simple visual-type symbols for the picker. */
export function VisualIcon({ kind }: VisualIconProps) {
  switch (kind) {
    case "card":
      return <IconFrame kind={kind}><rect x="4" y="6" width="24" height="20" rx="3" /><path d="M9 12h8M9 17h14M9 21h10" /></IconFrame>;
    case "bar":
      return <IconFrame kind={kind}>{axis}<path d="M7 9h8M7 12h13M7 17h15M7 20h10" /></IconFrame>;
    case "column":
      return <IconFrame kind={kind}>{axis}<path d="M9 25V15h3v10M14 25V9h3v16M20 25V18h3v7M25 25V12h3v13" /></IconFrame>;
    case "stackedBar":
      return <IconFrame kind={kind}>{axis}<path d="M7 10h8v4H7zM15 10h9v4h-9zM7 18h11v4H7zM18 18h7v4h-7z" /></IconFrame>;
    case "stackedColumn":
      return <IconFrame kind={kind}>{axis}<path d="M9 18h5v7H9zM9 10h5v8H9zM19 15h5v10h-5zM19 7h5v8h-5z" /></IconFrame>;
    case "line":
      return <IconFrame kind={kind}>{axis}<polyline points="7,22 12,15 18,18 25,8" /><circle cx="7" cy="22" r="1.4" /><circle cx="12" cy="15" r="1.4" /><circle cx="18" cy="18" r="1.4" /><circle cx="25" cy="8" r="1.4" /></IconFrame>;
    case "table":
      return <IconFrame kind={kind}><rect x="5" y="6" width="22" height="20" rx="1" /><path d="M5 12h22M5 18h22M12 6v20M20 6v20" /></IconFrame>;
    case "matrix":
      return <IconFrame kind={kind}><rect x="5" y="6" width="22" height="20" rx="1" /><path d="M5 12h22M5 18h22M12 6v20M20 6v20" /><path d="M6 7h20v4H6zM6 13h5v12H6z" className="visual-icon__fill" /></IconFrame>;
    case "pie":
      return <IconFrame kind={kind}><path d="M15 5a11 11 0 1 0 11 11H15z" /><path d="M18 5v8h8A11 11 0 0 0 18 5z" className="visual-icon__fill" /></IconFrame>;
    case "slicer":
      return <IconFrame kind={kind}><path d="M6 8h15M6 15h15M6 22h15" /><rect x="23" y="6" width="4" height="4" rx="1" /><rect x="23" y="13" width="4" height="4" rx="1" /><path d="M23 21h4v4h-4z" className="visual-icon__fill" /></IconFrame>;
    case "shape":
      return <IconFrame kind={kind}><circle cx="12" cy="16" r="7" /><path d="m21 8 7 8-7 8-7-8z" className="visual-icon__fill" /></IconFrame>;
    case "actionButton":
      return <IconFrame kind={kind}><rect x="4" y="8" width="24" height="16" rx="4" /><path d="M11 16h10M18 12l4 4-4 4" /></IconFrame>;
    case "bookmarkNavigator":
      return <IconFrame kind={kind}><rect x="4" y="8" width="8" height="16" rx="2" className="visual-icon__fill" /><rect x="13" y="8" width="8" height="16" rx="2" /><rect x="22" y="8" width="6" height="16" rx="2" /></IconFrame>;
    case "pageNavigator":
      return <IconFrame kind={kind}><path d="m5 16 5-5v3h8v-3l5 5-5 5v-3h-8v3z" /><path d="M25 8v16" className="visual-icon__muted" /></IconFrame>;
    case "textbox":
      return <IconFrame kind={kind}><path d="M6 8h14M13 8v17M9 25h8" /><path d="M20 15h7M20 20h7M20 25h5" className="visual-icon__muted" /></IconFrame>;
    case "image":
      return <IconFrame kind={kind}><rect x="4" y="6" width="24" height="20" rx="2" /><circle cx="21" cy="12" r="2" /><path d="m6 23 7-8 5 5 3-3 5 6" /></IconFrame>;
  }
}
