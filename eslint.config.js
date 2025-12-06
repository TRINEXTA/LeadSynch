import globals from "globals";
import pluginJs from "@eslint/js";

export default [
  {
    files: ["**/*.js", "**/*.jsx"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2022
      }
    },
    rules: {
      // Ignorer les variables préfixées par _ et les imports log/error/warn du logger
      "no-unused-vars": ["warn", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^(log|error|warn|_)"
      }],
      // Désactivé car on utilise un logger centralisé
      "no-console": "off",
      // Permettre les blocs catch vides
      "no-empty": ["error", { "allowEmptyCatch": true }]
    }
  },
  pluginJs.configs.recommended
];
