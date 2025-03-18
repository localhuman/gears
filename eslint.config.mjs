import globals from "globals";
import pluginJs from "@eslint/js";


/** @type {import('eslint').Linter.Config[]} */
export default [
  {files: ["**/*.js"], languageOptions: {sourceType: "module"}},
  {languageOptions: { globals: globals.browser }},
  {ignores: [
    "js/*.min.js",        
    "js/box2d",
    "js/util",
    "node_modules",
    "dist"
  ]},


  pluginJs.configs.recommended,
  
];