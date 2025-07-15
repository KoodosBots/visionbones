#!/usr/bin/env node

import { promises as fs } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`[${step}] ${message}`, colors.blue);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.cyan);
}

// Required environment variables
const requiredEnvVars = [
  {
    name: 'VITE_SUPABASE_URL',
    description: 'Supabase project URL',
    example: 'https://your-project-id.supabase.co'
  },
  {
    name: 'VITE_SUPABASE_ANON_KEY',
    description: 'Supabase anon/public key',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  },
  {
    name: 'VITE_STRIPE_PUBLISHABLE_KEY',
    description: 'Stripe publishable key',
    example: 'pk_test_...'
  },
  {
    name: 'TELEGRAM_BOT_TOKEN',
    description: 'Telegram bot token',
    example: '1234567890:ABCdefGHIjklMNOpqrSTUvwxyz'
  }
];

// Optional environment variables
const optionalEnvVars = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'VITE_STRIPE_PRICE_ID',
  'VITE_TELEGRAM_WEBAPP_URL',
  'VITE_ADMIN_TELEGRAM_IDS'
];

async function checkEnvironmentVariables() {
  logStep('1/5', 'Checking environment variables...');
  
  const envPath = path.join(projectRoot, '.env.local');
  let envContent = '';
  
  try {
    envContent = await fs.readFile(envPath, 'utf-8');
  } catch (error) {
    logError('.env.local file not found');
    logInfo('Please copy .env.example to .env.local and fill in your values:');
    logInfo('cp .env.example .env.local');
    process.exit(1);
  }
  
  const envVars = {};
  envContent.split('\\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      envVars[key.trim()] = value.trim();
    }
  });
  
  let allRequired = true;
  
  for (const envVar of requiredEnvVars) {
    if (!envVars[envVar.name] || envVars[envVar.name].includes('your-') || envVars[envVar.name].includes('_here')) {
      logError(`Missing or invalid ${envVar.name}`);
      logInfo(`Description: ${envVar.description}`);
      logInfo(`Example: ${envVar.example}`);
      allRequired = false;
    } else {
      logSuccess(`${envVar.name} is set`);
    }
  }
  
  if (!allRequired) {
    logError('Please set all required environment variables in .env.local');
    process.exit(1);
  }
  
  // Check optional variables
  for (const envVar of optionalEnvVars) {
    if (envVars[envVar]) {
      logSuccess(`${envVar} is set (optional)`);
    } else {
      logWarning(`${envVar} is not set (optional)`);
    }
  }
  
  logSuccess('Environment variables check passed');
  return envVars;
}

async function checkSupabaseCLI() {
  logStep('2/5', 'Checking Supabase CLI...');
  
  try {
    const output = execSync('supabase --version', { encoding: 'utf-8' });
    logSuccess(`Supabase CLI found: ${output.trim()}`);
  } catch (error) {
    logError('Supabase CLI not found');
    logInfo('Install it globally: npm install -g supabase');
    logInfo('Or visit: https://supabase.com/docs/guides/cli');
    process.exit(1);
  }
}

async function checkSupabaseConnection(envVars) {
  logStep('3/5', 'Testing Supabase connection...');
  
  try {
    // Simple test to check if Supabase URL is accessible
    const response = await fetch(`${envVars.VITE_SUPABASE_URL}/rest/v1/`, {
      headers: {
        'Authorization': `Bearer ${envVars.VITE_SUPABASE_ANON_KEY}`,
        'apikey': envVars.VITE_SUPABASE_ANON_KEY
      }
    });
    
    if (response.ok) {
      logSuccess('Supabase connection successful');
    } else {
      logError(`Supabase connection failed: ${response.status} ${response.statusText}`);
      logInfo('Check your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    }
  } catch (error) {
    logError(`Supabase connection error: ${error.message}`);
    logInfo('Check your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  }
}

async function generateTypes() {
  logStep('4/5', 'Generating TypeScript types...');
  
  try {
    // Check if we can generate types
    const output = execSync('supabase gen types typescript --local', { 
      encoding: 'utf-8',
      cwd: path.join(projectRoot, '../..') // Go to project root where supabase is initialized
    });
    
    // Save types to a file
    const typesPath = path.join(projectRoot, 'src/types/database.ts');
    await fs.mkdir(path.dirname(typesPath), { recursive: true });
    await fs.writeFile(typesPath, `export type Database = ${output}`);
    
    logSuccess('TypeScript types generated successfully');
    logInfo(`Types saved to: ${typesPath}`);
  } catch (error) {
    logWarning('Could not generate types - this is optional');
    logInfo('Make sure you have linked your Supabase project:');
    logInfo('supabase link --project-ref your-project-id');
    logInfo('Or run: supabase gen types typescript --project-id your-project-id');
  }
}

async function checkDependencies() {
  logStep('5/5', 'Checking dependencies...');
  
  try {
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    
    const requiredDeps = [
      '@supabase/supabase-js',
      '@tanstack/react-query',
      '@stripe/stripe-js',
      '@stripe/react-stripe-js',
      'react',
      'react-dom'
    ];
    
    let allDepsInstalled = true;
    
    for (const dep of requiredDeps) {
      if (packageJson.dependencies && packageJson.dependencies[dep]) {
        logSuccess(`${dep} is installed`);
      } else {
        logError(`${dep} is not installed`);
        allDepsInstalled = false;
      }
    }
    
    if (!allDepsInstalled) {
      logError('Some required dependencies are missing');
      logInfo('Run: npm install');
      process.exit(1);
    }
    
    logSuccess('All dependencies are installed');
  } catch (error) {
    logError(`Could not check dependencies: ${error.message}`);
  }
}

async function createGitignore() {
  const gitignorePath = path.join(projectRoot, '.gitignore');
  
  try {
    await fs.access(gitignorePath);
  } catch {
    // .gitignore doesn't exist, create it
    const gitignoreContent = `# Dependencies
node_modules/
.pnpm-debug.log*

# Environment variables
.env.local
.env.*.local

# Build output
dist/
build/

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# Dependency directories
node_modules/
jspm_packages/

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# Supabase
.supabase/
`;
    
    await fs.writeFile(gitignorePath, gitignoreContent);
    logSuccess('Created .gitignore file');
  }
}

async function showNextSteps() {
  log('\\n' + '='.repeat(60), colors.bold);
  log('🎉 Setup completed successfully!', colors.green + colors.bold);
  log('='.repeat(60), colors.bold);
  
  log('\\nNext steps:', colors.bold);
  log('1. Start the development server:');
  log('   npm run dev', colors.cyan);
  
  log('\\n2. If using local Supabase, start it:');
  log('   supabase start', colors.cyan);
  
  log('\\n3. Deploy Edge Functions (if not done already):');
  log('   supabase functions deploy', colors.cyan);
  
  log('\\n4. Test your Telegram bot:');
  log('   - Open Telegram and find your bot');
  log('   - Use the menu button to open the web app');
  
  log('\\n5. Test Stripe webhooks (development):');
  log('   stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook', colors.cyan);
  
  log('\\nUseful commands:', colors.bold);
  log('- npm run dev          Start development server');
  log('- npm run build        Build for production');
  log('- npm run types:generate Generate Supabase types');
  log('- npm run db:reset     Reset local database');
  log('- npm run db:seed      Seed database with test data');
  
  log('\\nDocumentation:', colors.bold);
  log('- README.md           Complete setup guide');
  log('- .env.example        All environment variables');
  log('- /src/lib/supabase.ts Supabase client setup');
  
  log('\\nNeed help? Check the troubleshooting section in README.md', colors.yellow);
}

async function main() {
  log('🚀 VisionBones Setup Script', colors.bold + colors.magenta);
  log('This script will validate your environment and setup the project.\\n');
  
  try {
    const envVars = await checkEnvironmentVariables();
    await checkSupabaseCLI();
    await checkSupabaseConnection(envVars);
    await generateTypes();
    await checkDependencies();
    await createGitignore();
    await showNextSteps();
  } catch (error) {
    logError(`Setup failed: ${error.message}`);
    process.exit(1);
  }
}

main();