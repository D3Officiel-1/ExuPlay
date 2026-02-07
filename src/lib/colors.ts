
/**
 * @fileOverview Oracle de la Palette Sacrée.
 * Définit les harmonies de couleurs primaires pour l'application.
 */

export interface AppColor {
  id: string;
  name: string;
  hex: string;
  light: {
    primary: string;
    foreground: string;
  };
  dark: {
    primary: string;
    foreground: string;
  };
}

export const APP_COLORS: Record<string, AppColor> = {
  "default": {
    id: "default",
    name: "Puriste",
    hex: "#000000",
    light: {
      primary: "0 0% 0%",
      foreground: "0 0% 100%"
    },
    dark: {
      primary: "0 0% 100%",
      foreground: "0 0% 0%"
    }
  },
  "azure": {
    id: "azure",
    name: "Azur",
    hex: "#3b82f6",
    light: {
      primary: "221.2 83.2% 53.3%",
      foreground: "0 0% 100%"
    },
    dark: {
      primary: "217.2 91.2% 59.8%",
      foreground: "222.2 47.4% 11.2%"
    }
  },
  "emerald": {
    id: "emerald",
    name: "Émeraude",
    hex: "#10b981",
    light: {
      primary: "142.1 76.2% 36.3%",
      foreground: "355.7 100% 97.3%"
    },
    dark: {
      primary: "142.1 70.6% 45.3%",
      foreground: "144.9 80.4% 10%"
    }
  },
  "amber": {
    id: "amber",
    name: "Ambre",
    hex: "#f59e0b",
    light: {
      primary: "37.9 92.1% 50.2%",
      foreground: "0 0% 0%"
    },
    dark: {
      primary: "37.9 92.1% 50.2%",
      foreground: "0 0% 0%"
    }
  },
  "ruby": {
    id: "ruby",
    name: "Rubis",
    hex: "#e11d48",
    light: {
      primary: "346.8 77.2% 49.8%",
      foreground: "355.7 100% 97.3%"
    },
    dark: {
      primary: "346.8 77.2% 49.8%",
      foreground: "355.7 100% 97.3%"
    }
  },
  "amethyst": {
    id: "amethyst",
    name: "Améthyste",
    hex: "#8b5cf6",
    light: {
      primary: "262.1 83.3% 57.8%",
      foreground: "210 40% 98%"
    },
    dark: {
      primary: "263.4 70% 50.4%",
      foreground: "210 40% 98%"
    }
  }
};

export function getAppColor(colorId?: string): AppColor {
  return APP_COLORS[colorId || "default"] || APP_COLORS["default"];
}
