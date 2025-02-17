# sitemap-content-generator

## Description

`sitemap-content-generator` is a CLI tool that generates a markdown representation of your project's folder structure and creates a filtered JSON file containing the content from your project's main files. It intelligently excludes files and folders that are typically not part of your application's core logic, such as build outputs, library folders, framework files, and specific UI components.

## Features

- **Folder Structure Mapping:**  
  Scans your project directory and creates a `sitemap.md` file that represents your project's hierarchical folder structure.

- **Content Extraction:**  
  Reads and extracts content from files, filtering out non-essential files to focus on the project's core logic.

- **Customizable Exclusions:**  
  Excludes common build folders (e.g., `node_modules`, `build`, `dist`, etc.), configuration files, and specific folders like `components/ui` by default. These settings can be customized by modifying the corresponding arrays and sets in the `cli.js` file.

## Installation

You can install the package globally via npm:

```bash
npm install -g sitemap-content-generator
```

Alternatively, you can use it with npx without a global installation:

```bash
npx sitemap-content-generator
```

## Usage

1. **Navigate to Your Project Root:**

   Open your terminal and change your directory to the root of your project:

   ```bash
   cd /path/to/your/project
   ```

2. **Run the Command:**

   Execute the CLI tool with the following command:

   ```bash
   sitemapgen
   ```

   When executed, the tool will:
   - Create a `metadata` folder (if it doesn't already exist) in your project root.
   - Generate a `sitemap.md` file that outlines your project's folder structure.
   - Generate a `filteredContent.json` file containing the filtered content extracted from your project's main files.

## Configuration & Customization

By default, the tool excludes the following:

- **Folders:**  
  `.git`, `.next`, `.contentlayer`, `.github`, `.husky`, `.vscode`, `.yarn`, `node_modules`, `api/studio/.sanity`, `api/studio/dist`, `build`, `dist`, `out`, `public`, `vendor`, `bower_components`

- **Specific Relative Folder:**  
  `components/ui` (and all its contents)

- **Files:**  
  `package-lock.json`, `yarn.lock`, `package.json`, `README.md`, `.gitignore`, `.env`, and other configuration or dependency files

- **File Extensions:**  
  `.jpeg`, `.jpg`, `.png`, `.svg`, `.gif`, `.ico`, `.md`

- **Paths (Prefixes):**  
  Any path starting with `.sanity/`, `studio/.sanity/runtime/`, `z-utils/`, `axelrod-nostr/project/out/`, etc.

If you need to customize these exclusion settings, simply edit the respective arrays and sets in the `cli.js` file of the package.

## License

This project is licensed under the [MIT License](LICENSE).

## Author

zvedov