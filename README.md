
# sitemap-content-generator

## Description

`sitemap-content-generator` is a CLI tool that generates a markdown representation of your project's folder structure and creates a filtered JSON file containing the content from your project's main files. It excludes files and folders that are typically not part of your application's core logic (such as build outputs, library folders, and specific UI components).

## Features

- **Folder Structure Mapping:** Scans your project directory and creates a `sitemap.md` file with a hierarchical structure.
- **Content Extraction:** Reads and extracts content from files, filtering out non-essential files.
- **Customizable Exclusions:** Excludes common build folders (e.g., `node_modules`, `build`, `dist`, etc.), configuration files, and specific folders like `components/ui`.

## Installation

You can install the package globally via npm:

```bash
npm install -g sitemap-content-generator
```

```bash
npx sitemap-content-generator
```

## Usage

1. **Navigate to your project root:**

   ```bash
   cd /path/to/your/project
   ```

2. **Run the command:**

   ```bash
   sitemapgen
   ```

   This command will:
   - Create a `metadata` folder (if it doesn't already exist) in your project root.
   - Generate `sitemap.md` with your project's folder structure.
   - Generate `filteredContent.json` containing the filtered content from your project's main files.

## Configuration & Customization

By default, the tool excludes the following:

- **Folders:** `.git`, `.next`, `.contentlayer`, `.github`, `.husky`, `.vscode`, `.yarn`, `node_modules`, `api/studio/.sanity`, `api/studio/dist`, `build`, `dist`, `out`, `public`, `vendor`, `bower_components`
- **Relative Folder:** `components/ui` (and all its contents)
- **Files:** `package-lock.json`, `yarn.lock`, `package.json`, `README.md`, `.gitignore`, `.env`, etc.
- **File Extensions:** `.jpeg`, `.jpg`, `.png`, `.svg`, `.gif`, `.ico`, `.md`
- **Paths:** Any path starting with `.sanity/`, `studio/.sanity/runtime/`, `z-utils/`, `axelrod-nostr/project/out/`, etc.

If you need to customize the exclusion settings, you can edit the corresponding arrays and sets in the `cli.js` file.

## License

This project is licensed under the MIT License.

## Author

zvedov