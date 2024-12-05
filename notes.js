// notes.js
const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const notesArea = document.getElementById('notes-area');

let activeProject = 'Default';

// Paths
function getDataPath() {
  return path.join(__dirname, 'data', activeProject, 'notes.txt');
}

// Load notes from file
function loadNotes() {
  const dataPath = getDataPath();
  if (fs.existsSync(dataPath)) {
    const notes = fs.readFileSync(dataPath, 'utf8');
    notesArea.value = notes;
  } else {
    notesArea.value = '';
  }
}

// Save notes to file
function saveNotes() {
  const dataPath = getDataPath();
  const dirPath = path.dirname(dataPath);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  fs.writeFileSync(dataPath, notesArea.value);
}

// Handle input
notesArea.addEventListener('input', () => {
  saveNotes();
});

// Handle minimize button
const minimizeButton = document.getElementById('minimize-button');
minimizeButton.addEventListener('click', () => {
  ipcRenderer.send('minimize-window', 'notes');
});

// Handle project changes
ipcRenderer.on('active-project', (event, newProject) => {
  activeProject = newProject;
  loadNotes();
});

// Initial load
ipcRenderer.on('active-project', (event, newProject) => {
  activeProject = newProject;
  loadNotes();
});
