import { defineConfig } from "vitepress";

export default defineConfig({
  base: "/guide/",
  title: "Power BI theme JSON guide",
  description: "A plain-English guide to creating Power BI JSON themes.",
  lang: "en-GB",
  cleanUrls: true,
  lastUpdated: true,
  markdown: {
    lineNumbers: true,
  },
  themeConfig: {
    logo: "/guide-mark.svg",
    siteTitle: "Theme JSON guide",
    search: {
      provider: "local",
      options: {
        translations: {
          button: { buttonText: "Search the guide", buttonAriaLabel: "Search the guide" },
        },
      },
    },
    nav: [
      { text: "Start here", link: "/start-here" },
      { text: "How themes work", link: "/theme-anatomy" },
      { text: "Recipes", link: "/recipes/colours" },
      { text: "Settings catalogue", link: "/reference/settings-catalogue" },
      { text: "Reference", link: "/reference/visual-names" },
    ],
    sidebar: [
      {
        text: "Create your first theme",
        items: [
          { text: "Start here", link: "/start-here" },
          { text: "The shape of a theme", link: "/theme-anatomy" },
          { text: "Format individual visuals", link: "/visual-styles" },
          { text: "Values you can use", link: "/property-values" },
        ],
      },
      {
        text: "Common recipes",
        items: [
          { text: "Colours and fonts", link: "/recipes/colours" },
          { text: "Titles and visual backgrounds", link: "/recipes/titles" },
          { text: "Charts, axes and legends", link: "/recipes/charts" },
          { text: "Slicers", link: "/recipes/slicers" },
          { text: "Tables and matrices", link: "/recipes/tables" },
        ],
      },
      {
        text: "Look things up",
        items: [
          { text: "Complete settings catalogue", link: "/reference/settings-catalogue" },
          { text: "Visual names used in JSON", link: "/reference/visual-names" },
          { text: "Frequently used settings", link: "/reference/common-settings" },
          { text: "Fix common problems", link: "/troubleshooting" },
        ],
      },
    ],
    outline: { label: "On this page", level: [2, 3] },
    socialLinks: [
      { icon: "github", link: "https://github.com/whippet-dev/power-bi-theme-studio" },
    ],
    editLink: {
      pattern: "https://github.com/whippet-dev/power-bi-theme-studio/edit/main/docs/:path",
      text: "Suggest a change to this page",
    },
    footer: {
      message: "An unofficial community guide. Not affiliated with or supported by Microsoft.",
      copyright: "Power BI is a trademark of Microsoft Corporation.",
    },
    docFooter: { prev: "Previous", next: "Next" },
  },
  head: [
    ["meta", { name: "theme-color", content: "#005ea5" }],
  ],
});
