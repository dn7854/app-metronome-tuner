import { useWindowDimensions } from "react-native";

/** Shortest side of a tablet in portrait. Phones stay under this. */
export const TABLET_MIN = 600;

export function useLayout() {
  const { width, height } = useWindowDimensions();
  const shortest = Math.min(width, height);
  const tablet = shortest >= TABLET_MIN;
  return {
    width,
    height,
    tablet,
    /** Horizontal page inset. Wider on tablet so content is not stuck to the edges. */
    pad: tablet ? 32 : 20,
    /** Readable column for type and controls. The piano still uses the full width. */
    content: tablet ? Math.min(width - 64, 720) : width,
  };
}
