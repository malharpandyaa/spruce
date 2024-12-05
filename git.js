// git.js
const { ipcRenderer } = require('electron');
const simpleGit = require('simple-git');
const path = require('path');
const fs = require('fs');

let activeProject = 'Default';
let projectPath = path.join(__dirname, 'data', activeProject);

const gitOutput = document.getElementById('git-output');
const commitMessageInput = document.getElementById('commit-message');

function logOutput(message) {
  gitOutput.textContent += message + '\n';
  gitOutput.scrollTop = gitOutput.scrollHeight;
}

let git;

ipcRenderer.on('active-project', (event, newProject) => {
  activeProject = newProject;
  projectPath = path.join(__dirname, 'data', activeProject);
  git = simpleGit(projectPath);
  logOutput(`Switched to project: ${activeProject}`);

  // Load remote URL from projects.json
  const projectsPath = path.join(__dirname, 'projects.json');
  if (fs.existsSync(projectsPath)) {
    const projects = JSON.parse(fs.readFileSync(projectsPath, 'utf8'));
    const project = projects.find((p) => p.name === activeProject);
    if (project && project.remote) {
      git.addRemote('origin', project.remote).catch(() => {
        // Ignore error if remote already exists
      });
    }
  }
});

// Initialize Repository
document.getElementById('git-init').addEventListener('click', () => {
  git.init()
    .then(() => logOutput('Initialized empty Git repository'))
    .catch((err) => logOutput('Error initializing repository: ' + err.message));
});

// Git Status
document.getElementById('git-status').addEventListener('click', () => {
  git.status()
    .then((status) => logOutput('Status:\n' + JSON.stringify(status, null, 2)))
    .catch((err) => logOutput('Error getting status: ' + err.message));
});

// Add All Changes
document.getElementById('git-add').addEventListener('click', () => {
  git.add('.')
    .then(() => logOutput('Added all changes'))
    .catch((err) => logOutput('Error adding changes: ' + err.message));
});

// Commit Changes
document.getElementById('git-commit').addEventListener('click', () => {
  const message = commitMessageInput.value.trim();
  if (!message) {
    alert('Please enter a commit message.');
    return;
  }
  git.commit(message)
    .then(() => {
      logOutput('Committed changes with message: ' + message);
      commitMessageInput.value = '';
    })
    .catch((err) => logOutput('Error committing changes: ' + err.message));
});

// Push Changes
document.getElementById('git-push').addEventListener('click', async () => {
  try {
    await git.push('origin', 'master');
    logOutput('Pushed changes to remote repository');
  } catch (err) {
    logOutput('Error pushing changes: ' + err.message);
  }
});

// Pull Changes
document.getElementById('git-pull').addEventListener('click', async () => {
  try {
    const update = await git.pull('origin', 'master');
    logOutput('Pulled changes:\n' + JSON.stringify(update, null, 2));
  } catch (err) {
    logOutput('Error pulling changes: ' + err.message);
  }
});

// Request active project when window loads
ipcRenderer.send('request-active-project');
