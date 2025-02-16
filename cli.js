#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Use the current working directory (the project folder where the command is executed)
const targetDirectory = process.cwd();
const metadataDirectory = path.resolve(targetDirectory, 'metadata');

// Ensure the metadata directory exists
if (!fs.existsSync(metadataDirectory)) {
  fs.mkdirSync(metadataDirectory);
}

const sitemapFilePath = path.resolve(metadataDirectory, 'sitemap.md');
const outputFilePath = path.resolve(metadataDirectory, 'filteredContent.json');
const dependencyGraphFilePath = path.resolve(metadataDirectory, 'dependencyGraph.json');

// Folders to exclude from the folder structure mapping
const excludedFolders = new Set([
  'metadata', // Exclude the output folder
  '.git',
  '.next',
  '.contentlayer',
  '.github',
  '.husky',
  '.vscode',
  '.yarn',
  'node_modules',
  'api/studio/.sanity',
  'api/studio/dist',
  'build',
  'dist',
  'out',
  'public',
  'vendor',
  'bower_components'
]);

// Specific relative folder paths to exclude entirely
const excludedRelativePaths = new Set([
  "components/ui"  // Ignore "components/ui" and its contents
]);

/**
 * Recursively builds an object representing the folder structure,
 * excluding folders/files specified in the exclusion sets.
 */
function getFolderStructure(dir, currentPath = '') {
  const result = {};
  const items = fs.readdirSync(dir);

  items.forEach((item) => {
    const itemPath = path.join(dir, item);
    const stats = fs.statSync(itemPath);

    if (stats.isDirectory()) {
      // Build the new relative path
      const newPath = currentPath ? path.join(currentPath, item) : item;

      // Check if this folder's relative path should be excluded
      if (excludedRelativePaths.has(newPath)) {
        return; // Skip this folder and its contents
      }

      // Also check by folder name against excludedFolders
      if (!excludedFolders.has(item)) {
        result[item] = getFolderStructure(itemPath, newPath);
      }
    } else {
      result[item] = currentPath ? path.join(currentPath, item) : item;
    }
  });

  return result;
}

/**
 * Converts the folder structure object into a Markdown formatted string.
 */
function convertToMarkdown(structure, indent = '') {
  let markdown = '';
  for (const key in structure) {
    if (typeof structure[key] === 'object') {
      markdown += `${indent}- ${key}\n`;
      markdown += convertToMarkdown(structure[key], `${indent}  `);
    } else {
      markdown += `${indent}  - ${structure[key]}\n`;
    }
  }
  return markdown;
}

/**
 * Reads the file content as a JSON object if possible.
 */
function readFileAsJson(filePath, relativePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8').trim();
    if (content) {
      return { path: relativePath, content };
    }
  } catch (error) {
    console.error(`Error reading file: ${filePath}`, error);
  }
  return null;
}

/**
 * Processes the generated sitemap.md file and creates a filtered JSON file
 * containing the content of files that are considered part of the project.
 */
function processSitemapToJson(sitemapPath, outputPath) {
  try {
    // Files that are generally not part of the core project logic.
    const excludedFiles = [
      'package-lock.json',
      'yarn.lock',
      'package.json',
      'README.md',
      '.gitignore',
      '.env',
      'getFolderStructure.js',
      'next-env.d.ts',
      'next.config.ts',
      'sitemap.md',
      'src/app/favicon.ico',
      'studio/eslint.config.mjs',
      'studio/package.json',
      'studio/static/.gitkeep',
      'studio/tsconfig.json',
      'studio/sanity.cli.ts',
      'filteredContent.json'
    ];

    // File extensions to exclude
    const excludedExtensions = ['.jpeg', '.jpg', '.png', '.svg', '.gif', '.ico', '.md'];

    // Paths (or path prefixes) to exclude
    const excludedPaths = [
      '.sanity/',
      'studio/.sanity/runtime/',
      'z-utils/',
      'axelrod-nostr/project/out/',
      'node_modules/',
      'build/',
      'dist/',
      'out/',
      'public/',
      'vendor/',
      'bower_components/',
      'components/ui/'  // Exclude "components/ui" folder and its contents
    ];

    const sitemap = fs.readFileSync(sitemapPath, 'utf-8');
    const lines = sitemap.split('\n');
    const combinedContent = [];

    lines.forEach((line) => {
      const match = line.trim().match(/-\s*(.*)/);
      if (match) {
        const relativePath = match[1].trim();
        const fullPath = path.resolve(targetDirectory, relativePath);

        if (
          fs.existsSync(fullPath) &&
          fs.lstatSync(fullPath).isFile() &&
          !excludedFiles.includes(path.basename(relativePath)) &&
          !excludedExtensions.includes(path.extname(relativePath)) &&
          !excludedPaths.some((excludedPath) => relativePath.startsWith(excludedPath))
        ) {
          const fileData = readFileAsJson(fullPath, relativePath);
          if (fileData) {
            combinedContent.push(fileData);
          }
        }
      }
    });

    const timestamp = new Date().toISOString();
    const outputData = { timestamp, files: combinedContent };

    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf-8');
    console.log(`Filtered JSON content has been saved to ${outputPath}`);
  } catch (error) {
    console.error(`Error processing sitemap: ${sitemapPath}`, error);
  }
}

/**
 * Flattens the nested folder structure object into an array of relative file paths.
 */
function flattenStructure(structure) {
  let files = [];
  for (const key in structure) {
    if (typeof structure[key] === 'object') {
      files = files.concat(flattenStructure(structure[key]));
    } else {
      files.push(structure[key]);
    }
  }
  return files;
}

/**
 * Scans JavaScript/TypeScript files to generate a dependency graph.
 * The graph contains nodes (file paths) and edges (dependency relationships).
 */
function generateDependencyGraph() {
  try {
    // Get the folder structure and flatten it to a list of file paths.
    const folderStructure = getFolderStructure(targetDirectory);
    const allFiles = flattenStructure(folderStructure);
    // Filter for JavaScript/TypeScript files.
    const codeFiles = allFiles.filter(file => {
      const ext = path.extname(file);
      return ['.js', '.jsx', '.ts', '.tsx'].includes(ext);
    });

    const graph = {
      nodes: [],
      edges: []
    };

    // Create nodes for each code file.
    codeFiles.forEach(file => {
      graph.nodes.push(file);
    });

    // For each code file, read content and extract dependency import statements.
    codeFiles.forEach(file => {
      const fullPath = path.resolve(targetDirectory, file);
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        // Regex for ES6 import and CommonJS require statements.
        const importRegex = /import\s+(?:[\w*\s{},]+from\s+)?["']([^"']+)["']/g;
        const requireRegex = /require\(\s*["']([^"']+)["']\s*\)/g;
        let match;

        // Process ES6 import statements.
        while ((match = importRegex.exec(content)) !== null) {
          const dep = match[1];
          // Only consider relative dependencies (skip external modules and non-code imports like CSS).
          if (dep.startsWith('.') && !dep.endsWith('.css')) {
            // Resolve dependency path relative to the current file.
            let depPath = path.join(path.dirname(file), dep);
            // If no file extension is provided, try common code file extensions.
            if (!path.extname(depPath)) {
              const possibleExts = ['.js', '.jsx', '.ts', '.tsx'];
              for (const ext of possibleExts) {
                if (fs.existsSync(path.resolve(targetDirectory, depPath + ext))) {
                  depPath = depPath + ext;
                  break;
                }
              }
            }
            depPath = path.normalize(depPath);
            // Only add an edge if the dependency file is among our code files.
            if (codeFiles.includes(depPath)) {
              graph.edges.push({
                from: file,
                to: depPath
              });
            }
          }
        }
        // Process CommonJS require statements.
        while ((match = requireRegex.exec(content)) !== null) {
          const dep = match[1];
          if (dep.startsWith('.') && !dep.endsWith('.css')) {
            let depPath = path.join(path.dirname(file), dep);
            if (!path.extname(depPath)) {
              const possibleExts = ['.js', '.jsx', '.ts', '.tsx'];
              for (const ext of possibleExts) {
                if (fs.existsSync(path.resolve(targetDirectory, depPath + ext))) {
                  depPath = depPath + ext;
                  break;
                }
              }
            }
            depPath = path.normalize(depPath);
            if (codeFiles.includes(depPath)) {
              graph.edges.push({
                from: file,
                to: depPath
              });
            }
          }
        }
      } catch (err) {
        console.error(`Error reading file for dependency analysis: ${fullPath}`, err);
      }
    });

    fs.writeFileSync(dependencyGraphFilePath, JSON.stringify(graph, null, 2), 'utf-8');
    console.log(`Dependency graph has been saved to ${dependencyGraphFilePath}`);
  } catch (error) {
    console.error('Error generating dependency graph:', error);
  }
}

// Generate the folder structure and save it as a sitemap.
const folderStructure = getFolderStructure(targetDirectory);
const markdownOutput = convertToMarkdown(folderStructure);
fs.writeFileSync(sitemapFilePath, markdownOutput, 'utf-8');
console.log('Sitemap has been saved to sitemap.md');

// Process the sitemap to generate the filtered JSON.
processSitemapToJson(sitemapFilePath, outputFilePath);

// Generate the dependency graph.
generateDependencyGraph();
