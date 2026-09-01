import type { ThemeSource } from "./properties";
import { boolProp, colorProp, enumProp, numberProp, propertyThemePath, resolvePropertyValue, textProp } from "./properties";
import { nativeToken } from "./nativeTokens";
import type { ResolvedTheme } from "./theme";

/**
 * Image — a canvas image object, `visual-image` in the schema. Excludes
 * `general.imageUrl` (no schema title at all, unlike every other field —
 * a legacy duplicate of `image.sourceUrl`, the actually format-pane-exposed
 * field), `image.sourceField` (which data column feeds the image — a data
 * binding, not a style, same test as Slicer's `data` group), and
 * `image.sourceFile` ($ref image — a complex nested object, same rule as
 * every other embedded-image exclusion in this app).
 */

const FIT_OPTIONS = [
  { value: "Fit", label: "Fit" },
  { value: "Stretch", label: "Stretch" },
  { value: "Fill", label: "Fill" },
  { value: "Normal", label: "Center" },
] as const;

const SOURCE_TYPE_OPTIONS = [
  { value: "image", label: "Upload image" },
  { value: "imageUrl", label: "Enter URL" },
  { value: "imageData", label: "Select from data" },
] as const;

const STROKE_PATTERN_OPTIONS = [
  { value: "solid", label: "Solid" },
  { value: "dashed", label: "Dashed" },
  { value: "dotted", label: "Dotted" },
] as const;

const IMAGE_SCALING_OPTIONS = [
  { value: "Normal", label: "Fit" },
  { value: "Fit", label: "Stretch" },
  { value: "Fill", label: "Fill" },
] as const;

export const IMAGE_PROPERTIES = {
  image: {
    sourceType: enumProp(
      "image",
      "image.image.sourceType",
      "Image source",
      "Where the image comes from — an uploaded file, a URL, or a data-bound field.",
      ["image", 0, "sourceType"],
      SOURCE_TYPE_OPTIONS,
    ),
    sourceUrl: textProp(
      "image",
      "image.image.sourceUrl",
      "Image URL",
      "The URL of the image, when the source is a URL.",
      ["image", 0, "sourceUrl"],
    ),
    fit: enumProp(
      "image",
      "image.image.fit",
      "Image fit",
      "How the image is scaled to fill its frame.",
      ["image", 0, "fit"],
      FIT_OPTIONS,
    ),
    altText: textProp(
      "image",
      "image.image.altText",
      "Alt text",
      "Alternative text describing the image for screen readers.",
      ["image", 0, "altText"],
    ),
    height: numberProp(
      "image",
      "image.image.height",
      "Image height",
      "The image's rendered height, in pixels.",
      ["image", 0, "height"],
      0,
      2000,
    ),
    backgroundEnabled: boolProp(
      "image",
      "image.image.backgroundEnabled",
      "Show background",
      "Whether a fill colour is shown behind the image (visible around its edges when not stretched to fill).",
      ["image", 0, "backgroundEnabled"],
      undefined,
      "Background",
    ),
    backgroundColor: colorProp(
      "image",
      "image.image.backgroundColor",
      "Background color",
      "The fill colour behind the image.",
      ["image", 0, "backgroundColor"],
      undefined,
      "Background",
    ),
    backgroundTransparency: numberProp(
      "image",
      "image.image.backgroundTransparency",
      "Transparency",
      "How see-through the background fill colour appears — 0 is solid, 100 is invisible.",
      ["image", 0, "backgroundTransparency"],
      0,
      100,
      undefined,
      "Background",
    ),
    transparency: numberProp(
      "image",
      "image.image.transparency",
      "Transparency",
      "How see-through the image itself appears — 0 is solid, 100 is invisible.",
      ["image", 0, "transparency"],
      0,
      100,
      undefined,
      "Background",
    ),
    strokeShow: boolProp(
      "image",
      "image.image.strokeShow",
      "Show",
      "Whether a border is drawn around the image.",
      ["image", 0, "strokeShow"],
      undefined,
      "Border",
    ),
    strokeColor: colorProp(
      "image",
      "image.image.strokeColor",
      "Color",
      "The colour of the image's border.",
      ["image", 0, "strokeColor"],
      undefined,
      "Border",
    ),
    strokeWidth: numberProp(
      "image",
      "image.image.strokeWidth",
      "Width",
      "The thickness of the image's border, in pixels.",
      ["image", 0, "strokeWidth"],
      0,
      20,
      undefined,
      "Border",
    ),
    strokePattern: enumProp(
      "image",
      "image.image.strokePattern",
      "Line style",
      "Whether the border is solid, dashed, or dotted.",
      ["image", 0, "strokePattern"],
      STROKE_PATTERN_OPTIONS,
      undefined,
      "Border",
    ),
    strokeTransparency: numberProp(
      "image",
      "image.image.strokeTransparency",
      "Transparency",
      "How see-through the border appears — 0 is solid, 100 is invisible.",
      ["image", 0, "strokeTransparency"],
      0,
      100,
      undefined,
      "Border",
    ),
    cornerRadiusAdvanced: boolProp(
      "image",
      "image.image.cornerRadiusAdvanced",
      "Individual corners",
      "Whether each corner's roundedness is set individually, instead of all four together.",
      ["image", 0, "cornerRadiusAdvanced"],
      undefined,
      "Corners",
    ),
    cornerRadius: numberProp(
      "image",
      "image.image.cornerRadius",
      "Rounded corners",
      "How rounded all four corners are, in pixels.",
      ["image", 0, "cornerRadius"],
      0,
      200,
      undefined,
      "Corners",
    ),
    cornerRadiusLeftTop: numberProp(
      "image",
      "image.image.cornerRadiusLeftTop",
      "Top left corner",
      "How rounded the top-left corner is, in pixels.",
      ["image", 0, "cornerRadiusLeftTop"],
      0,
      200,
      undefined,
      "Corners",
    ),
    cornerRadiusRightTop: numberProp(
      "image",
      "image.image.cornerRadiusRightTop",
      "Top right corner",
      "How rounded the top-right corner is, in pixels.",
      ["image", 0, "cornerRadiusRightTop"],
      0,
      200,
      undefined,
      "Corners",
    ),
    cornerRadiusLeftBottom: numberProp(
      "image",
      "image.image.cornerRadiusLeftBottom",
      "Bottom left corner",
      "How rounded the bottom-left corner is, in pixels.",
      ["image", 0, "cornerRadiusLeftBottom"],
      0,
      200,
      undefined,
      "Corners",
    ),
    cornerRadiusRightBottom: numberProp(
      "image",
      "image.image.cornerRadiusRightBottom",
      "Bottom right corner",
      "How rounded the bottom-right corner is, in pixels.",
      ["image", 0, "cornerRadiusRightBottom"],
      0,
      200,
      undefined,
      "Corners",
    ),
    effects: boolProp(
      "image",
      "image.image.effects",
      "Image effects",
      "Whether the blur/exposure/contrast/saturation adjustments below are applied.",
      ["image", 0, "effects"],
      undefined,
      "Effects",
    ),
    blur: numberProp(
      "image",
      "image.image.blur",
      "Blur",
      "How blurred the image appears.",
      ["image", 0, "blur"],
      0,
      100,
      undefined,
      "Effects",
    ),
    exposure: numberProp(
      "image",
      "image.image.exposure",
      "Exposure",
      "The image's exposure adjustment.",
      ["image", 0, "exposure"],
      -100,
      100,
      undefined,
      "Effects",
    ),
    contrast: numberProp(
      "image",
      "image.image.contrast",
      "Contrast",
      "The image's contrast adjustment.",
      ["image", 0, "contrast"],
      -100,
      100,
      undefined,
      "Effects",
    ),
    saturation: numberProp(
      "image",
      "image.image.saturation",
      "Saturation",
      "The image's colour saturation adjustment.",
      ["image", 0, "saturation"],
      -100,
      100,
      undefined,
      "Effects",
    ),
  },
  imageScaling: {
    imageScalingType: enumProp(
      "image",
      "image.imageScaling.imageScalingType",
      "Scaling",
      "How the image is scaled within its frame.",
      ["imageScaling", 0, "imageScalingType"],
      IMAGE_SCALING_OPTIONS,
    ),
  },
} as const;

export type ResolvedImageStyle = {
  image: {
    sourceType: string | number;
    sourceUrl: string;
    fit: string | number;
    altText: string;
    height: number;
    backgroundEnabled: boolean;
    backgroundColor: string;
    backgroundTransparency: number;
    transparency: number;
    strokeShow: boolean;
    strokeColor: string;
    strokeWidth: number;
    strokePattern: string | number;
    strokeTransparency: number;
    cornerRadiusAdvanced: boolean;
    cornerRadius: number;
    cornerRadiusLeftTop: number;
    cornerRadiusRightTop: number;
    cornerRadiusLeftBottom: number;
    cornerRadiusRightBottom: number;
    effects: boolean;
    blur: number;
    exposure: number;
    contrast: number;
    saturation: number;
  };
  imageScaling: { imageScalingType: string | number };
};

/**
 * Measured natively on an Image with no source set, across all four of its
 * interaction states — which are byte-identical, so the visual is stateful in
 * structure only and is resolved without a state here.
 *
 * Two values were wrong: the source type started on "Enter URL" where Power
 * BI starts on "Upload image", and the border resolved a hard `#E3E3E3` where
 * it is the `foreground` token. Everything else already matched, including
 * every effect slider and all four advanced corner radii.
 */
export function resolveImageStyle(theme: ThemeSource, base: ResolvedTheme): ResolvedImageStyle {
  const p = IMAGE_PROPERTIES;
  return {
    image: {
      sourceType: resolvePropertyValue(theme, p.image.sourceType, "image"),
      sourceUrl: resolvePropertyValue(theme, p.image.sourceUrl, ""),
      fit: resolvePropertyValue(theme, p.image.fit, "Fit"),
      altText: resolvePropertyValue(theme, p.image.altText, ""),
      height: resolvePropertyValue(theme, p.image.height, 200),
      backgroundEnabled: resolvePropertyValue(theme, p.image.backgroundEnabled, false),
      backgroundColor: resolvePropertyValue(theme, p.image.backgroundColor, base.background),
      backgroundTransparency: resolvePropertyValue(theme, p.image.backgroundTransparency, 0),
      transparency: resolvePropertyValue(theme, p.image.transparency, 0),
      strokeShow: resolvePropertyValue(theme, p.image.strokeShow, false),
      strokeColor: resolvePropertyValue(theme, p.image.strokeColor, nativeToken(theme, "foreground")),
      strokeWidth: resolvePropertyValue(theme, p.image.strokeWidth, 1),
      strokePattern: resolvePropertyValue(theme, p.image.strokePattern, "solid"),
      strokeTransparency: resolvePropertyValue(theme, p.image.strokeTransparency, 0),
      cornerRadiusAdvanced: resolvePropertyValue(theme, p.image.cornerRadiusAdvanced, false),
      cornerRadius: resolvePropertyValue(theme, p.image.cornerRadius, 0),
      cornerRadiusLeftTop: resolvePropertyValue(theme, p.image.cornerRadiusLeftTop, 0),
      cornerRadiusRightTop: resolvePropertyValue(theme, p.image.cornerRadiusRightTop, 0),
      cornerRadiusLeftBottom: resolvePropertyValue(theme, p.image.cornerRadiusLeftBottom, 0),
      cornerRadiusRightBottom: resolvePropertyValue(theme, p.image.cornerRadiusRightBottom, 0),
      effects: resolvePropertyValue(theme, p.image.effects, false),
      blur: resolvePropertyValue(theme, p.image.blur, 0),
      exposure: resolvePropertyValue(theme, p.image.exposure, 0),
      contrast: resolvePropertyValue(theme, p.image.contrast, 0),
      saturation: resolvePropertyValue(theme, p.image.saturation, 0),
    },
    imageScaling: {
      imageScalingType: resolvePropertyValue(theme, p.imageScaling.imageScalingType, "Normal"),
    },
  };
}

export { propertyThemePath };
