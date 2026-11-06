import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  "stories": [
    {
      directory: "../src/components",
      titlePrefix: "",
      files: "**/*.@(mdx|stories.@(js|jsx|mjs|ts|tsx))"
    }
  ],
  "addons": [
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
    "@storybook/addon-mcp"
  ],
  "framework": "@storybook/react-vite",
  "core": {
    "allowedHosts": ["192.168.1.124", "localhost", "127.0.0.1"],
  },
  async viteFinal(config) {
    config.server = config.server || {};
    config.server.allowedHosts = true;
    return config;
  },
};
export default config;
