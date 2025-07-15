#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
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
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.cyan);
}

async function loadEnvVars() {
  const envPath = path.join(projectRoot, '.env.local');
  
  try {
    const envContent = await fs.readFile(envPath, 'utf-8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        envVars[key.trim()] = value.trim();
      }
    });
    
    return envVars;
  } catch (error) {
    logError('.env.local file not found');
    logInfo('Please create .env.local from .env.example');
    process.exit(1);
  }
}

async function testSupabaseConnection(envVars) {
  log('🔍 Testing Supabase Connection...', colors.bold);
  
  const supabaseUrl = envVars.VITE_SUPABASE_URL;
  const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    logError('Missing Supabase credentials');
    logInfo('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local');
    return false;
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test basic connection
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      logError(`Supabase connection failed: ${error.message}`);
      return false;
    }
    
    logSuccess('Supabase connection successful');
    
    // Test database access
    try {
      const { data: tables, error: tablesError } = await supabase
        .from('users')
        .select('count')
        .limit(1);
      
      if (tablesError) {
        logError(`Database access failed: ${tablesError.message}`);
        logInfo('Make sure your database schema is set up correctly');
        return false;
      }
      
      logSuccess('Database access successful');
    } catch (dbError) {
      logError(`Database test failed: ${dbError.message}`);
      return false;
    }
    
    return true;
  } catch (error) {
    logError(`Connection test failed: ${error.message}`);
    return false;
  }
}

async function testStripeConfig(envVars) {
  log('\n💳 Testing Stripe Configuration...', colors.bold);
  
  const stripePublishableKey = envVars.VITE_STRIPE_PUBLISHABLE_KEY;
  
  if (!stripePublishableKey) {
    logError('Missing Stripe publishable key');
    logInfo('Set VITE_STRIPE_PUBLISHABLE_KEY in .env.local');
    return false;
  }
  
  // Basic validation of key format
  if (!stripePublishableKey.startsWith('pk_')) {
    logError('Invalid Stripe publishable key format');
    logInfo('Stripe publishable keys should start with pk_');
    return false;
  }
  
  logSuccess('Stripe publishable key format is valid');
  
  // Check if it's a test key
  if (stripePublishableKey.startsWith('pk_test_')) {
    logInfo('Using Stripe test key (development mode)');
  } else if (stripePublishableKey.startsWith('pk_live_')) {
    logInfo('Using Stripe live key (production mode)');
  }
  
  return true;
}

async function testTelegramConfig(envVars) {
  log('\n🤖 Testing Telegram Configuration...', colors.bold);
  
  const botToken = envVars.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    logError('Missing Telegram bot token');
    logInfo('Set TELEGRAM_BOT_TOKEN in .env.local');
    return false;
  }
  
  // Basic validation of token format
  if (!botToken.includes(':')) {
    logError('Invalid Telegram bot token format');
    logInfo('Telegram bot tokens should contain a colon (:)');
    return false;
  }
  
  try {
    // Test if bot token is valid by calling getMe
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const data = await response.json();
    
    if (data.ok) {
      logSuccess(`Telegram bot connection successful`);
      logInfo(`Bot name: ${data.result.username}`);
      return true;
    } else {
      logError(`Telegram bot token invalid: ${data.description}`);
      return false;
    }
  } catch (error) {
    logError(`Telegram bot test failed: ${error.message}`);
    return false;
  }
}

async function testEdgeFunctions(envVars) {
  log('\n⚡ Testing Edge Functions...', colors.bold);
  
  const supabaseUrl = envVars.VITE_SUPABASE_URL;
  const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    logError('Missing Supabase credentials for Edge Functions test');
    return false;
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test a simple Edge Function (adjust function name as needed)
    const { data, error } = await supabase.functions.invoke('user-management', {
      body: { action: 'ping' }
    });
    
    if (error) {
      logError(`Edge Functions not accessible: ${error.message}`);
      logInfo('Make sure your Edge Functions are deployed:');
      logInfo('supabase functions deploy');
      return false;
    }
    
    logSuccess('Edge Functions are accessible');
    return true;
  } catch (error) {
    logError(`Edge Functions test failed: ${error.message}`);
    logInfo('This is optional - Edge Functions might not be deployed yet');
    return false;
  }
}

async function generateSummary(results) {
  log('\n' + '='.repeat(60), colors.bold);
  log('📋 Connection Test Summary', colors.bold);
  log('='.repeat(60), colors.bold);
  
  const allTests = [
    { name: 'Supabase Connection', passed: results.supabase },
    { name: 'Stripe Configuration', passed: results.stripe },
    { name: 'Telegram Configuration', passed: results.telegram },
    { name: 'Edge Functions', passed: results.edgeFunctions }
  ];
  
  const passedTests = allTests.filter(test => test.passed);
  const failedTests = allTests.filter(test => !test.passed);
  
  log(`\n✅ Passed: ${passedTests.length}/${allTests.length}`);
  passedTests.forEach(test => {
    log(`   - ${test.name}`, colors.green);
  });
  
  if (failedTests.length > 0) {
    log(`\n❌ Failed: ${failedTests.length}/${allTests.length}`);
    failedTests.forEach(test => {
      log(`   - ${test.name}`, colors.red);
    });
    
    log('\n🔧 Next Steps:', colors.yellow);
    log('1. Fix the failed tests above');
    log('2. Check your .env.local file');
    log('3. Refer to README.md for setup instructions');
    log('4. Run this test again: npm run test:connection');
  } else {
    log('\n🎉 All tests passed! Your setup is ready.', colors.green);
  }
}

async function main() {
  log('🧪 VisionBones Connection Test', colors.bold + colors.cyan);
  log('Testing all external service connections...\n');
  
  const envVars = await loadEnvVars();
  
  const results = {
    supabase: await testSupabaseConnection(envVars),
    stripe: await testStripeConfig(envVars),
    telegram: await testTelegramConfig(envVars),
    edgeFunctions: await testEdgeFunctions(envVars)
  };
  
  await generateSummary(results);
  
  // Exit with error code if any critical tests failed
  const criticalTests = [results.supabase, results.stripe, results.telegram];
  if (criticalTests.some(test => !test)) {
    process.exit(1);
  }
}

main().catch(error => {
  logError(`Test failed: ${error.message}`);
  process.exit(1);
});