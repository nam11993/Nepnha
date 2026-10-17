import React from "react";
import { type ColorValue } from "react-native";
import Svg, { Path } from "react-native-svg";

// Inline vectors keep icons available when browsers cannot load icon fonts.
const paths = {
  mic: "M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0ZM5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8",
  speaker: "M3 9h4l5-5v16l-5-5H3ZM16 8a6 6 0 0 1 0 8M19 5a10 10 0 0 1 0 14",
  stop: "M6 6h12v12H6Z",
  plus: "M12 5v14M5 12h14",
  users:
    "M15 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM5 21v-2a7 7 0 0 1 14 0v2M18 5a3 3 0 0 1 0 6",
  search: "M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Zm-2 5 6 6",
  food: "M4 3v5a3 3 0 0 0 6 0V3M7 3v18M18 3v18m0-18c-5 4-5 9 0 9",
  home: "m3 11 9-8 9 8M5 10v11h14V10M10 21v-7h4v7",
  bag: "M5 7h14l2 14H3ZM8 7V5a4 4 0 0 1 8 0v2",
  car: "m4 9 2-5h12l2 5M3 10h18v8H3ZM5 18v3m14-3v3M6 13h2m8 0h2",
  gift: "M3 8h18v5H3Zm2 5v8h14v-8M12 8v13M12 8C4 8 5 0 9 3l3 5Zm0 0c8 0 7-8 3-5l-3 5Z",
  cash: "M3 5h18v14H3ZM8 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0Z",
  "calendar-outline":
    "M4 5h16v16H4ZM4 10h16M8 3v4M16 3v4M8 14h1m3 0h1m3 0h1M8 17h1m3 0h1",
  "chevron-back": "M15 5 8 12l7 7",
  "chevron-forward": "m9 5 7 7-7 7",
  "arrow-down-outline": "M12 4v16m-6-6 6 6 6-6",
  "arrow-up-outline": "M12 20V4m-6 6 6-6 6 6",
  "grid-outline": "M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z",
  "swap-horizontal-outline": "M3 7h18m-5-5 5 5-5 5M21 17H3m5-5-5 5 5 5",
  "pie-chart-outline": "M12 3v9h9A9 9 0 0 0 12 3ZM8 4a9 9 0 1 0 12 12H8Z",
  "wallet-outline":
    "M20 8V5H5a2 2 0 0 0 0 4h16v12H5a2 2 0 0 1-2-2V7m18 6h-6v4h6",
  "settings-outline":
    "m9 3-1 3-3 1-2 3 2 2-1 3 2 3 3-1 3 2 3-2 3 1 2-3-1-3 2-2-2-3-3-1-1-3ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  "leaf-outline":
    "M20 3C9 2 3 6 4 13c1 7 9 9 16 7-3-4 2-10 0-17ZM5 9c3 5 7 8 13 10",
} as const;

export type IconName = keyof typeof paths;

export function Icon({
  name,
  size = 24,
  color = "#183B35",
}: {
  name: IconName;
  size?: number;
  color?: ColorValue;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessible={false}
      testID={`icon-${name}`}
    >
      <Path d={paths[name]} />
    </Svg>
  );
}
