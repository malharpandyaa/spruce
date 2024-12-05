// tasks.js
const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const taskList = document.getElementById('task-list');
const newTaskInput = document.getElementById('new-task');

let tasks = [];
let activeProject = 'Default';

// Paths
function getDataPath() {
  return path.join(__dirname, 'data', activeProject, 'tasks.json');
}

// Load tasks from file
function loadTasks() {
  const dataPath = getDataPath();
  if (fs.existsSync(dataPath)) {
    tasks = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    tasks.forEach((task) => addTaskToList(task, false));
  } else {
    tasks = [];
  }
}

// Save tasks to file
function saveTasks() {
  const dataPath = getDataPath();
  const dirPath = path.dirname(dataPath);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  fs.writeFileSync(dataPath, JSON.stringify(tasks));
}

// Add new task
newTaskInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && newTaskInput.value.trim() !== '') {
    const taskText = newTaskInput.value.trim();
    tasks.push(taskText);
    saveTasks();
    addTaskToList(taskText, true);
    newTaskInput.value = '';
  }
});

function addTaskToList(taskText, save = true) {
  const listItem = document.createElement('li');

  const taskSpan = document.createElement('span');
  taskSpan.textContent = taskText;

  const deleteButton = document.createElement('button');
  deleteButton.className = 'delete-task';
  deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>'; // Using a trash can icon

  deleteButton.addEventListener('click', () => {
    tasks = tasks.filter((task) => task !== taskText);
    saveTasks();
    listItem.remove();
  });

  listItem.appendChild(taskSpan);
  listItem.appendChild(deleteButton);

  taskList.appendChild(listItem);

  if (save) {
    saveTasks();
  }
}

// Handle minimize button
const minimizeButton = document.getElementById('minimize-button');
minimizeButton.addEventListener('click', () => {
  ipcRenderer.send('minimize-window', 'tasks');
});

// Handle project changes
ipcRenderer.on('active-project', (event, newProject) => {
  activeProject = newProject;
  // Clear current data
  tasks = [];
  taskList.innerHTML = '';
  // Load data for the new project
  loadTasks();
});

// Initial load
ipcRenderer.on('active-project', (event, newProject) => {
  activeProject = newProject;
  loadTasks();
});
