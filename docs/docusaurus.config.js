// docusaurus.config.js
// v2/v3 funciona igual para estes campos
import {themes as prismThemes} from 'prism-react-renderer';

export default {
  title: 'Clima.Seguro',
  url: 'https://example.com',
  baseUrl: '/',
  favicon: 'img/clima-seguro.svg',

  // opcional, mas bom pra URLs consistentes
  trailingSlash: false,

  themeConfig: {
    navbar: {
      logo: {alt: 'Logo', src: 'img/clima-seguro.svg'},
      items: [] // remove links padrão (Doc/Blog/GitHub)
    },
    footer: {style: 'dark', links: []},
    prism: {theme: prismThemes.github, darkTheme: prismThemes.dracula},
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          // Isto faz a doc ficar na raiz do site: https://site.com/
          routeBasePath: '/',
          // Se não quiser sidebar, deixe false; se quiser, aponte para o arquivo.
          sidebarPath: require.resolve('./sidebars.js'),
          // Se usar v3 e quiser MDX moderno:
          // mdxRuntime: 'automatic',
        },
        blog: false,      // desativa blog
        pages: false,     // desativa src/pages (requer Docusaurus v3). Em v2, deixe de existir a pasta src/pages
        // theme: {customCss: require.resolve('./src/css/custom.css')},
      }),
    ],
  ],
};
