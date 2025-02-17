#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const targetDirectory = process.cwd();
const metadataDirectory = path.resolve(targetDirectory, 'metadata');

// Ensure the metadata directory exists
if (!fs.existsSync(metadataDirectory)) {
  fs.mkdirSync(metadataDirectory);
}

const selectionFilePath = path.resolve(metadataDirectory, 'selection.json');
const sitemapFilePath = path.resolve(metadataDirectory, 'sitemap.md');
const outputFilePath = path.resolve(metadataDirectory, 'filteredContent.json');

/**
 * Prompts the user with a question and returns the answer.
 * Default is "yes" if the user just hits enter.
 */
function askQuestion(query) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question(query, (answer) => {
      rl.close();
      if (!answer.trim()) {
        resolve('yes');
      } else {
        resolve(answer.trim().toLowerCase());
      }
    });
  });
}

/**
 * Recursively interactively prompts the user for each folder and file.
 * For folders, if the user answers "no", the entire folder is skipped.
 * The function builds an object representing the user’s selection.
 *
 * @param {string} dir - The current directory to scan.
 * @param {string} currentPath - The relative path from the project root.
 * @returns {object} - The selection object.
 */
async function interactiveSelection(dir, currentPath = '') {
  let selection = {};
  const items = fs.readdirSync(dir);
  
  // Sort items for consistent ordering
  items.sort();
  
  for (const item of items) {
    // Skip the metadata folder (so we don't prompt for output files)
    if (item === 'metadata') continue;

    const fullPath = path.join(dir, item);
    const stats = fs.statSync(fullPath);
    const relPath = currentPath ? path.join(currentPath, item) : item;
    const normalizedRelPath = relPath.split(path.sep).join('/');

    if (stats.isDirectory()) {
      const answer = await askQuestion(`Include folder "${normalizedRelPath}"? (YES/no): `);
      if (answer === 'no' || answer === 'n') {
        // Mark folder as not included and skip its contents
        selection[item] = false;
        continue;
      } else {
        // Process folder contents recursively
        selection[item] = await interactiveSelection(fullPath, relPath);
      }
    } else {
      const answer = await askQuestion(`Include file "${normalizedRelPath}"? (YES/no): `);
      selection[item] = (answer === 'yes' || answer === 'y' || answer === '');
    }
  }
  return selection;
}

/**
 * Flattens the nested selection object into an array of relative file paths.
 *
 * @param {object} selection - The nested selection object.
 * @param {string} currentPath - The current path during traversal.
 * @returns {string[]} - Array of file paths selected by the user.
 */
function flattenSelection(selection, currentPath = '') {
  let files = [];
  for (const key in selection) {
    const value = selection[key];
    const relPath = currentPath ? path.join(currentPath, key) : key;
    if (typeof value === 'object') {
      files = files.concat(flattenSelection(value, relPath));
    } else {
      if (value === true) {
        files.push(relPath.split(path.sep).join('/'));
      }
    }
  }
  return files;
}

/**
 * Converts the selection object into a Markdown formatted sitemap.
 *
 * @param {object} selection - The nested selection object.
 * @param {string} currentPath - The current path during traversal.
 * @param {string} indent - The indentation string for Markdown formatting.
 * @returns {string} - Markdown string representing the sitemap.
 */
function convertSelectionToMarkdown(selection, currentPath = '', indent = '') {
  let markdown = '';
  for (const key in selection) {
    const value = selection[key];
    const relPath = currentPath ? path.join(currentPath, key) : key;
    const normalizedRelPath = relPath.split(path.sep).join('/');
    if (typeof value === 'object') {
      markdown += `${indent}- ${normalizedRelPath}\n`;
      markdown += convertSelectionToMarkdown(value, relPath, indent + '  ');
    } else {
      if (value === true) {
        markdown += `${indent}  - ${normalizedRelPath}\n`;
      }
    }
  }
  return markdown;
}

/**
 * Reads a file’s content and returns an object with its relative path and content.
 *
 * @param {string} filePath - The full path of the file.
 * @param {string} relativePath - The relative path to the file.
 * @returns {object|null} - The file data object or null if error.
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
 * Processes the user selection to generate a filteredContent.json file.
 * It reads each selected file’s content and packages them along with a timestamp.
 *
 * @param {object} selection - The nested selection object.
 * @param {string} outputPath - The output JSON file path.
 */
function processSelectionToJson(selection, outputPath) {
  const includedFiles = flattenSelection(selection);
  const combinedContent = [];
  for (const relativePath of includedFiles) {
    const fullPath = path.resolve(targetDirectory, relativePath);
    if (fs.existsSync(fullPath) && fs.lstatSync(fullPath).isFile()) {
      const fileData = readFileAsJson(fullPath, relativePath);
      if (fileData) {
        combinedContent.push(fileData);
      }
    }
  }
  const timestamp = new Date().toISOString();
  const outputData = { timestamp, files: combinedContent };
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf-8');
  console.log(`Filtered JSON content has been saved to ${outputPath}`);
}

/**
 * Main entry point.
 * Checks if a previous selection exists. If so, prompts the user to reuse it (default YES).
 * Otherwise, or if the user declines, runs interactive selection and saves the choices.
 * Finally, generates sitemap.md and filteredContent.json based on the selection.
 */
async function main() {
  let selection;
  
  if (fs.existsSync(selectionFilePath)) {
    const answer = await askQuestion(`Use existing selection file "${selectionFilePath}"? (YES/no): `);
    if (answer === 'yes' || answer === 'y' || answer === '') {
      try {
        const data = fs.readFileSync(selectionFilePath, 'utf-8');
        selection = JSON.parse(data);
      } catch (error) {
        console.error('Error reading existing selection file. Creating a new selection.');
        selection = await interactiveSelection(targetDirectory);
        fs.writeFileSync(selectionFilePath, JSON.stringify(selection, null, 2), 'utf-8');
      }
    } else {
      selection = await interactiveSelection(targetDirectory);
      fs.writeFileSync(selectionFilePath, JSON.stringify(selection, null, 2), 'utf-8');
    }
  } else {
    selection = await interactiveSelection(targetDirectory);
    fs.writeFileSync(selectionFilePath, JSON.stringify(selection, null, 2), 'utf-8');
  }
  
  // Generate sitemap.md from the selection
  const markdownOutput = convertSelectionToMarkdown(selection);
  fs.writeFileSync(sitemapFilePath, markdownOutput, 'utf-8');
  console.log('Sitemap has been saved to sitemap.md');
  
  // Generate filteredContent.json based on the selected files
  processSelectionToJson(selection, outputFilePath);
}

main();
