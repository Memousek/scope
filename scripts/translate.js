#!/usr/bin/env node

/**
 * Translation script for generating JSON files from cs.json using DeepL API.
 * Reads enabled languages from translation.ts and generates translations for each.
 * Usage: npm run translate
 */

const fs = require('fs');
const path = require('path');

// Load .env.local file
function loadEnvFile() {
  const envPath = path.join(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=');
          process.env[key] = value;
        }
      }
    }
  }
}

// Load environment variables
loadEnvFile();

// DeepL API configuration
const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const DEEPL_API_URL = 'https://api-free.deepl.com/v2/translate';

// Source language (Czech)
const SOURCE_LANG = 'CS';

// Get enabled languages from translation.ts
function getEnabledLanguages() {
  const translationPath = path.join(__dirname, '../lib/translation.ts');
  const translationContent = fs.readFileSync(translationPath, 'utf8');
  
  // Find the getLanguages function and extract the array
  const functionStart = translationContent.indexOf('export function getLanguages()');
  if (functionStart === -1) {
    throw new Error('Could not find getLanguages function in translation.ts');
  }
  
  // Find the return statement
  const returnStart = translationContent.indexOf('return [', functionStart);
  if (returnStart === -1) {
    throw new Error('Could not find return statement in getLanguages function');
  }
  
  // Find the closing bracket
  const arrayEnd = translationContent.indexOf(']', returnStart + 8);
  
  const languagesArray = translationContent.substring(returnStart + 8, arrayEnd);
  const languages = [];
  
  // Parse each language object - each object is on one line
  const lines = languagesArray.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine.startsWith('{') && (trimmedLine.endsWith('},') || trimmedLine.endsWith('}'))) {
      const langObj = trimmedLine.endsWith(',') ? trimmedLine.slice(0, -1) : trimmedLine; // Remove trailing comma if present
      const codeMatch = langObj.match(/code:\s*['"`]([^'"`]+)['"`]/);
      const disabledMatch = langObj.match(/disabled:\s*true/);
      
      if (codeMatch && !disabledMatch) {
        languages.push({
          code: codeMatch[1],
          label: extractProperty(langObj, 'label'),
          flag: extractProperty(langObj, 'flag')
        });
      }
    }
  }
  
  return languages;
}

function extractProperty(obj, prop) {
  const match = obj.match(new RegExp(`${prop}:\\s*['"\`]([^'"\`]+)['"\`]`));
  return match ? match[1] : null;
}

// DeepL language mapping
const DEEPL_LANG_MAP = {
  'en': 'EN',
  'ru': 'RU',
  'sk': 'SK',
  'jp': 'JA',
  'ar': 'AR',
  'pl': 'PL',
  'tr': 'TR',
  'ua': 'UK',
  'de': 'DE',
  'fr': 'FR',
  'es': 'ES',
  'pt': 'PT',
  'it': 'IT',
  'hu': 'HU',
  'kr': 'KO',
  'ch': 'ZH'
};

// Load source translations
function loadSourceTranslations() {
  const sourcePath = path.join(__dirname, '../locales/cs.json');
  const sourceContent = fs.readFileSync(sourcePath, 'utf8');
  return JSON.parse(sourceContent);
}

// Translate multiple texts using DeepL API with retry logic
async function translateTexts(texts, targetLang, retryCount = 0) {
  if (!DEEPL_API_KEY) {
    throw new Error('DEEPL_API_KEY environment variable is required');
  }
  
  const deeplLang = DEEPL_LANG_MAP[targetLang];
  if (!deeplLang) {
    console.warn(`Warning: No DeepL mapping for language ${targetLang}, skipping...`);
    return null;
  }
  
  try {
    const response = await fetch(DEEPL_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        text: Array.isArray(texts) ? texts.join('\n') : texts,
        source_lang: SOURCE_LANG,
        target_lang: deeplLang,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      
      // Handle rate limiting with retry
      if (response.status === 429 && retryCount < 3) {
        const waitTime = Math.pow(2, retryCount) * 5000; // 5s, 10s, 20s
        console.log(`Rate limited, waiting ${waitTime/1000}s before retry ${retryCount + 1}/3...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return translateTexts(texts, targetLang, retryCount + 1);
      }
      
      throw new Error(`DeepL API error: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    const translatedText = data.translations[0].text;
    
    // Split the translated text back into individual texts
    if (Array.isArray(texts)) {
      return translatedText.split('\n');
    } else {
      return [translatedText];
    }
  } catch (error) {
    console.error(`Error translating texts to ${targetLang}:`, error.message);
    return null;
  }
}

// Translate all keys in the source translations using batch translation
async function translateAllKeys(sourceTranslations, targetLang, startFromKey = null) {
  const translated = {};
  const keys = Object.keys(sourceTranslations);
  
  console.log(`Translating ${keys.length} keys to ${targetLang}...`);
  
  let startIndex = 0;
  if (startFromKey) {
    startIndex = keys.indexOf(startFromKey);
    if (startIndex === -1) startIndex = 0;
    console.log(`Starting from key: ${startFromKey} (index: ${startIndex})`);
  }
  
  // Filter out empty texts and prepare for batch translation
  const textsToTranslate = [];
  const keysToTranslate = [];
  
  for (let i = startIndex; i < keys.length; i++) {
    const key = keys[i];
    const text = sourceTranslations[key];
    
    // Skip if text is empty or contains only placeholders
    if (!text || text.trim() === '') {
      translated[key] = text;
      continue;
    }
    
    textsToTranslate.push(text);
    keysToTranslate.push(key);
  }
  
  console.log(`Batch translating ${textsToTranslate.length} texts...`);
  
  // Translate all texts in one request
  const translatedTexts = await translateTexts(textsToTranslate, targetLang);
  
  if (translatedTexts !== null) {
    // Map translated texts back to keys
    for (let i = 0; i < keysToTranslate.length; i++) {
      translated[keysToTranslate[i]] = translatedTexts[i];
    }
    console.log(`Successfully translated ${translatedTexts.length} texts`);
  } else {
    // If batch translation fails, keep original texts
    console.log('Batch translation failed, keeping original texts');
    for (const key of keysToTranslate) {
      translated[key] = sourceTranslations[key];
    }
  }
  
  // Add any skipped keys (empty texts)
  for (const key of keys) {
    if (!translated[key]) {
      translated[key] = sourceTranslations[key];
    }
  }
  
  console.log('\n');
  return translated;
}

// Save translations to file
function saveTranslations(translations, langCode) {
  const outputPath = path.join(__dirname, `../locales/${langCode}.json`);
  const jsonContent = JSON.stringify(translations, null, 2);
  fs.writeFileSync(outputPath, jsonContent, 'utf8');
  console.log(`Saved translations to ${outputPath}`);
}

// Main function
async function main() {
  try {
    console.log('Starting translation process...');
    
    // Check if DeepL API key is provided
    if (!DEEPL_API_KEY) {
      console.error('Error: DEEPL_API_KEY environment variable is required');
      console.error('Please set your DeepL API key:');
      console.error('export DEEPL_API_KEY=your-api-key-here');
      process.exit(1);
    }
    
    // Get command line arguments
    const args = process.argv.slice(2);
    let startFromKey = null;
    let targetLang = null;
    
    if (args.length > 0) {
      // Check if first argument is a language code
      const enabledLanguages = getEnabledLanguages();
      const isLanguage = enabledLanguages.some(lang => lang.code === args[0]);
      
      if (isLanguage) {
        targetLang = args[0];
        startFromKey = args[1] || null;
      } else {
        startFromKey = args[0];
        targetLang = args[1] || null;
      }
    }
    
    if (startFromKey) {
      console.log(`Resuming from key: ${startFromKey}`);
    }
    
    // Get enabled languages
    const enabledLanguages = getEnabledLanguages();
    console.log(`Found ${enabledLanguages.length} enabled languages:`, enabledLanguages.map(l => l.code).join(', '));
    
    // Load source translations
    const sourceTranslations = loadSourceTranslations();
    console.log(`Loaded ${Object.keys(sourceTranslations).length} source translations`);
    
    // Skip Czech (source language)
    const targetLanguages = enabledLanguages.filter(lang => lang.code !== 'cs');
    
    // If specific language is provided, translate only that one
    if (targetLang) {
      const lang = targetLanguages.find(l => l.code === targetLang);
      if (!lang) {
        console.error(`Language ${targetLang} not found in enabled languages`);
        process.exit(1);
      }
      
      console.log(`\nProcessing language: ${lang.code} (${lang.label})`);
      const translated = await translateAllKeys(sourceTranslations, lang.code, startFromKey);
      saveTranslations(translated, lang.code);
    } else {
      // Translate for each target language
      for (const lang of targetLanguages) {
        console.log(`\nProcessing language: ${lang.code} (${lang.label})`);
        
        try {
          const translated = await translateAllKeys(sourceTranslations, lang.code, startFromKey);
          saveTranslations(translated, lang.code);
          // Reset startFromKey after first language
          startFromKey = null;
        } catch (error) {
          console.error(`Error processing language ${lang.code}:`, error.message);
        }
      }
    }
    
    console.log('\nTranslation process completed!');
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main, getEnabledLanguages, translateTexts }; 