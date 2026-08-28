"use client";

import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState } from "react";

/**
 * A fidelity comparison needs literal authored output, not a fit-to-frame
 * presentation. The gallery supplies false only for its selected 1:1 Hero.
 */
export const PresentationScaleEnabledContext = createContext(true);

/** A disabled presentation layer must not leave even an identity transform. */
export function presentationScaleTransform(enabled: boolean, scale?: number): string | undefined {
  return enabled && scale !== undefined ? `scale(${scale})` : undefined;
}

/**
 * Displays a finished visual at whatever size the UI has room for, without
 * letting that size reach the visual.
 *
 * The distinction this exists to enforce:
 *
 * - **authored size** — the dimensions ChartLayout and the renderer believe
 *   the Power BI visual has. Gutters, typography, the category scale and the
 *   marks are all computed against it.
 * - **presentation size** — how large Theme Studio happens to show the
 *   finished result.
 *
 * Only the second one varies. The children render at `width` regardless, and
 * a uniform CSS transform fits the result to the container afterwards, so a
 * narrower panel can never quietly re-flow a chart into different geometry.
 * That is the whole point: a preview that re-laid itself out at display size
 * would be measuring a visual nobody authored.
 *
 * Scaling is down-only. Enlarging is the hero tile's job and it already does
 * it one level up; doing it here too would compound the two.
 */
export function PresentationScale({
  width,
  children,
}: {
  /** The authored width the children render at, in CSS pixels. */
  width: number;
  children: React.ReactNode;
}) {
  const enabled = useContext(PresentationScaleEnabledContext);
  const frameRef = useRef<HTMLSpanElement>(null);
  const contentRef = useRef<HTMLSpanElement>(null);
  const [fit, setFit] = useState<{ scale: number; height: number } | null>(null);

  const measure = useCallback(() => {
    const frame = frameRef.current;
    const content = contentRef.current;
    if (!frame || !content) return;
    // offsetWidth, not a client rect: the hero tile scales this whole
    // subtree with a CSS transform, and a painted width would make the fit
    // compound with that scale instead of composing with it.
    const available = frame.offsetWidth;
    // offsetHeight is a layout size, so the transform below cannot feed back
    // into it — which is what stops this from oscillating.
    // scrollHeight as well as offsetHeight: the visual is taller than its
    // own box whenever a legend or axis title sits outside the plot, and
    // reserving only the box would clip the difference.
    const naturalHeight = Math.max(content.offsetHeight, content.scrollHeight);
    if (!available || !naturalHeight) return;
    const scale = Math.min(1, available / width);
    setFit((previous) =>
      previous && Math.abs(previous.scale - scale) < 0.0005 && previous.height === naturalHeight
        ? previous
        : { scale, height: naturalHeight },
    );
  }, [width]);

  // No dependency array: the content's height is theme-driven, so it changes
  // whenever an edit adds or removes a legend or an axis — a re-render with
  // no remount and no resize.
  useLayoutEffect(() => {
    if (!enabled) return;
    measure();
  }, [enabled, measure]);

  useLayoutEffect(() => {
    if (!enabled) return;
    const frame = frameRef.current;
    if (!frame) return;
    // Only the FRAME is observed. Observing the content would watch an
    // element whose box this effect writes to, which is how these loop.
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [enabled, measure]);

  return (
    <span
      className="authored-visual"
      ref={frameRef}
      // Reserve exactly what the scaled result occupies, so surrounding flow
      // is honest about the visual's footprint.
      style={enabled && fit ? { height: fit.height * fit.scale } : undefined}
    >
      <span
        className="authored-visual__content"
        ref={contentRef}
        style={{
          width,
          transform: presentationScaleTransform(enabled, fit?.scale),
        }}
      >
        {children}
      </span>
    </span>
  );
}
