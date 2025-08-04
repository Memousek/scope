/**
 * Automaticky generuje build informace pro aplikaci
 * Zachovává existující proměnné prostředí a pouze přidává/aktualizuje build informace
 */
const fs = require('fs');
const path = require('path');

// Získání informací o GIT commitu
const getGitInfo = () => {
  try {
    const commitHash = require('child_process').execSync('git rev-parse --short HEAD').toString().trim();
    const commitDate = require('child_process').execSync('git log -1 --format=%cd --date=short').toString().trim();
    const commitMessage = require('child_process').execSync('git log -1 --format=%s').toString().trim();
    return { commitHash, commitDate, commitMessage };
  } catch (error) {
    return { 
      commitHash: 'unknown', 
      commitDate: new Date().toISOString().split('T')[0],
      commitMessage: 'No commit message'
    };
  }
};

// Získání verze z package.json
const getPackageInfo = () => {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  return {
    name: packageJson.name,
    version: packageJson.version || '1.0.0'
  };
};

// Parsování existujícího .env.local souboru
const parseEnvFile = (filePath) => {
  const envVars = {};
  
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      // Přeskočit komentáře a prázdné řádky
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const equalIndex = trimmedLine.indexOf('=');
        if (equalIndex > 0) {
          const key = trimmedLine.substring(0, equalIndex);
          const value = trimmedLine.substring(equalIndex + 1);
          envVars[key] = value;
        }
      }
    }
  }
  
  return envVars;
};

// Generování build informací
const generateBuildInfo = () => {
  const { commitHash, commitDate, commitMessage } = getGitInfo();
  const { name, version } = getPackageInfo();
  const buildDate = new Date().toISOString();
  const buildNumber = Date.now();

  // Načíst existující proměnné prostředí
  const existingEnv = parseEnvFile('.env.local');
  
  // Definovat build informace (tyto se budou aktualizovat při každém buildu)
  const buildInfo = {
    NEXT_PUBLIC_APP_NAME: `"${name}"`,
    NEXT_PUBLIC_APP_VERSION: `"${version}"`,
    NEXT_PUBLIC_BUILD_DATE: `"${buildDate}"`,
    NEXT_PUBLIC_BUILD_NUMBER: `"${buildNumber}"`,
    NEXT_PUBLIC_COMMIT_HASH: `"${commitHash}"`,
    NEXT_PUBLIC_COMMIT_DATE: `"${commitDate}"`,
    NEXT_PUBLIC_COMMIT_MESSAGE: `"${commitMessage}"`,
  };

  // Statické informace (tyto se nebudou přepisovat, pokud už existují)
  const staticInfo = {
    NEXT_PUBLIC_AUTHOR: existingEnv.NEXT_PUBLIC_AUTHOR || '"Vojtěch Kalný"',
    NEXT_PUBLIC_GITHUB_LINK: existingEnv.NEXT_PUBLIC_GITHUB_LINK || '"https://github.com/Memousek/scope"',
    NEXT_PUBLIC_LICENSE: existingEnv.NEXT_PUBLIC_LICENSE || '"-"',
    NEXT_PUBLIC_COPYRIGHT: existingEnv.NEXT_PUBLIC_COPYRIGHT || '"Scope Burndown Team | Vojtěch Kalný"',
  };

  // Spojit všechny proměnné
  const allEnvVars = { ...existingEnv, ...buildInfo, ...staticInfo };

  // Generovat obsah .env.local souboru
  let envContent = '# Automaticky generované build informace\n';
  envContent += '# Existující proměnné prostředí jsou zachovány\n\n';

  // Přidat build informace
  envContent += '# Build informace (automaticky aktualizovány)\n';
  Object.entries(buildInfo).forEach(([key, value]) => {
    envContent += `${key}=${value}\n`;
  });

  envContent += '\n# Statické informace (upravte podle potřeby)\n';
  Object.entries(staticInfo).forEach(([key, value]) => {
    envContent += `${key}=${value}\n`;
  });

  // Přidat ostatní existující proměnné (kromě těch, které jsme už zpracovali)
  const processedKeys = new Set([...Object.keys(buildInfo), ...Object.keys(staticInfo)]);
  const otherEnvVars = Object.entries(allEnvVars).filter(([key]) => !processedKeys.has(key));
  
  if (otherEnvVars.length > 0) {
    envContent += '\n# Ostatní proměnné prostředí\n';
    otherEnvVars.forEach(([key, value]) => {
      envContent += `${key}=${value}\n`;
    });
  }

  fs.writeFileSync('.env.local', envContent);
  console.log('✅ Build informace byly aktualizovány v .env.local');
  console.log(`📦 Verze: ${version}`);
  console.log(`🔗 Commit: ${commitHash}`);
  console.log(`📅 Build: ${new Date(buildDate).toLocaleString('cs-CZ')}`);
};

generateBuildInfo(); 