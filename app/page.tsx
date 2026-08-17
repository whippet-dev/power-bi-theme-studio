import type { Metadata } from "next";
import { ThemeStudio } from "./components/ThemeStudio";

export const metadata: Metadata = {
  title: "Power BI Theme Studio",
  description: "Load, preview, edit, and export Power BI JSON themes locally.",
};

export default function Home() {
  return <ThemeStudio />;
}
