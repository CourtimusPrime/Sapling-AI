import { fresh } from "@fresh/plugin-vite";
import { presetWind } from "unocss";
import UnoCSS from "unocss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    UnoCSS({
      presets: [presetWind()],
      content: {
        filesystem: [
          "components/**/*.{ts,tsx}",
          "islands/**/*.{ts,tsx}",
          "routes/**/*.{ts,tsx}",
        ],
      },
    }),
    fresh(),
  ],
});
