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
  "components/ui" // Ignore "components/ui" and its contents
]);

/**
 * Checks if a path should be excluded based on relative or folder exclusion lists.
 */
function isExcludedPath(relativePath) {
  // Normalize all paths to forward slashes (compatible across OS)
  const normalizedPath = path.normalize(relativePath).replace(/\\/g, '/');

  // Check excluded folders (by exact match or by folder prefix)
  if ([...excludedFolders].has(path.basename(normalizedPath))) {
    return true;
  }

  // Check excluded relative paths (e.g., components/ui and subdirectories)
  if ([...excludedRelativePaths].some(prefix => 
      normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`)
  )) {
    return true;
  }

  return false;
}

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
    const newPath = path.normalize(
      currentPath ? path.join(currentPath, item) : item
    ).replace(/\\/g, '/');

    // Apply exclusion rule
    if (isExcludedPath(newPath)) {
      return; // Skip excluded paths entirely
    }

    if (stats.isDirectory()) {
      result[item] = getFolderStructure(itemPath, newPath);
    } else {
      result[item] = newPath;
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
      'filteredContent.json'
    ];

    const excludedExtensions = ['.jpeg', '.jpg', '.png', '.svg', '.gif', '.ico', '.md'];

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
      'components/ui/' // Exclude "components/ui" folder and its contents
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
          !isExcludedPath(relativePath) &&
          fs.existsSync(fullPath) &&
          fs.lstatSync(fullPath).isFile() &&
          !excludedFiles.includes(path.basename(relativePath)) &&
          !excludedExtensions.includes(path.extname(relativePath)) &&
          !excludedPaths.some(excludedPath => relativePath.startsWith(excludedPath))
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
    } else if (!isExcludedPath(structure[key])) {
      files.push(structure[key]);
    }
  }
  return files;
}

// Generate the folder structure and save it as a sitemap.
const folderStructure = getFolderStructure(targetDirectory);
const markdownOutput = convertToMarkdown(folderStructure);
fs.writeFileSync(sitemapFilePath, markdownOutput, 'utf-8');
console.log('Sitemap has been saved to sitemap.md');

// Process the sitemap to generate the filtered JSON.
processSitemapToJson(sitemapFilePath, outputFilePath);
