import type { StorybookConfig } from '@storybook/react-vite';

const extraAllowedHosts = (process.env.STORYBOOK_ALLOWED_HOSTS ?? '')
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean);

const allowedHosts = Array.from(new Set(['localhost', '127.0.0.1', ...extraAllowedHosts]));

const config: StorybookConfig = {
  "stories": [
    {
      directory: "../src/components",
      titlePrefix: "",
      files: "**/*.@(mdx|stories.@(js|jsx|mjs|ts|tsx))"
    },
    "../src/prototypes/**/*.stories.@(js|jsx|mjs|ts|tsx)"
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
    allowedHosts,
  },
  async viteFinal(config) {
    config.server = config.server || {};
    config.server.allowedHosts = allowedHosts;
    return config;
  },
};
export default config;
