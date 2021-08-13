module.exports = {
    "env": {
        "browser": true,
        "es2021": true,
        "node": true,
    },
    "extends": [
        "google",
    ],
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "ecmaVersion": 12,
        "sourceType": "module",
    },
    "ignorePatterns": [
        "/lib/**/*", // Ignore built files.
    ],
    "plugins": [
        "@typescript-eslint",
    ],
    "rules": {
        "no-tabs": "off",
        "operator-linebreak": "off",
        "comma-dangle": "off",
        "quotes": ["error", "double"],
        "indent": ["error", 4],
        "object-curly-spacing": ["error", "always"],
        "space-before-function-paren": ["error", {
            "anonymous": "always",
            "named": "never",
            "asyncArrow": "always",
        }],
    },
};
