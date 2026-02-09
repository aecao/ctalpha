const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get the latest commit message
function getLatestCommit() {
  try {
    const commit = execSync('git log -1 --pretty=format:"%s"', { encoding: 'utf-8' });
    return commit.trim();
  } catch (error) {
    console.warn('Could not get git commit message:', error.message);
    return 'No commit message available';
  }
}

// Replace placeholder in body.html
function injectCommitMessage() {
  const bodyHtmlPath = path.join(__dirname, '../src/body.html');
  let content = fs.readFileSync(bodyHtmlPath, 'utf-8');
  
  const latestCommit = getLatestCommit();
  
  // Replace the placeholder with actual commit message
  const regex = /Latest update:.*?(?=<\/p>)/;
  content = content.replace(regex, `Latest update: ${latestCommit}`);
  
  fs.writeFileSync(bodyHtmlPath, content, 'utf-8');
  console.log(`Injected commit message: "${latestCommit}"`);
}

injectCommitMessage();
