/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        oat: "#f8f4ec",
        spinach: "#28624a",
        carrot: "#d56a2c",
        blueberry: "#4657a7",
        salmon: "#e47164"
      }
    }
  },
  plugins: []
};
