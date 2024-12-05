// clipboard.js
const { ipcRenderer, clipboard, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');
const clipboardList = document.getElementById('clipboard-list');

let clipboardHistory = [];
let deletedItems = new Set();
let activeProject = 'Default';
let nextId = 0; // Initialize the nextId for unique IDs

// Paths
function getDataPath() {
  return path.join(__dirname, 'data', activeProject, 'clipboard.json');
}

// Load clipboard history from file
function loadClipboardHistory() {
  const dataPath = getDataPath();
  if (fs.existsSync(dataPath)) {
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    clipboardHistory = data.map((item) => {
      if (item.type === 'image') {
        const imagePath = path.join(path.dirname(dataPath), item.data);
        if (fs.existsSync(imagePath)) {
          const image = nativeImage.createFromPath(imagePath);
          item.data = image.toDataURL();
          return item;
        } else {
          return null;
        }
      } else {
        return item;
      }
    }).filter(Boolean);

    // Update nextId to avoid ID collisions
    nextId = clipboardHistory.reduce((maxId, item) => Math.max(maxId, item.id), 0) + 1;

    clipboardHistory.forEach((item) => addClipboardItem(item, false));
  } else {
    clipboardHistory = [];
  }
}

// Save clipboard history to file
function saveClipboardHistory() {
  const dataPath = getDataPath();
  const dirPath = path.dirname(dataPath);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  // Save images as separate files
  const dataToSave = clipboardHistory.map((item, index) => {
    if (item.type === 'image') {
      const imageFileName = `image_${item.id}.png`;
      const imagePath = path.join(dirPath, imageFileName);
      const image = nativeImage.createFromDataURL(item.data);
      fs.writeFileSync(imagePath, image.toPNG());
      return { id: item.id, type: 'image', data: imageFileName };
    } else {
      return { id: item.id, type: item.type, data: item.data };
    }
  });

  fs.writeFileSync(dataPath, JSON.stringify(dataToSave));
}

// Monitor clipboard changes
setInterval(() => {
  const currentText = clipboard.readText();
  const currentImage = clipboard.readImage();

  if (!currentImage.isEmpty()) {
    // Handle image clipboard data
    const imageDataUrl = currentImage.toDataURL();
    if (
      clipboardHistory.length === 0 ||
      clipboardHistory[0].data !== imageDataUrl
    ) {
      const item = { id: nextId++, type: 'image', data: imageDataUrl };
      clipboardHistory.unshift(item);
      addClipboardItem(item, true);
      deletedItems.clear();
      saveClipboardHistory();
    }
  } else if (currentText) {
    // Handle text clipboard data
    if (
      clipboardHistory.length === 0 ||
      clipboardHistory[0].data !== currentText
    ) {
      const item = { id: nextId++, type: 'text', data: currentText };
      clipboardHistory.unshift(item);
      addClipboardItem(item, true);
      deletedItems.clear();
      saveClipboardHistory();
    }
  }
}, 1000);

function addClipboardItem(item, save = true) {
  const { id, type, data } = item;
  const listItem = document.createElement('li');
  listItem.dataset.id = id; // Store the id in the DOM element

  // Create a container for the content
  const contentDiv = document.createElement('div');
  contentDiv.className = 'clipboard-content';

  if (type === 'text') {
    // Display text data
    const textSpan = document.createElement('span');
    textSpan.textContent = data;
    contentDiv.appendChild(textSpan);
  } else if (type === 'image') {
    // Display image data
    const img = document.createElement('img');
    img.src = data;
    img.alt = 'Clipboard Image';
    contentDiv.appendChild(img);
  }

  // Create a copy button
  const copyButton = document.createElement('button');
  copyButton.className = 'copy-button';
  copyButton.innerHTML = '<i class="fas fa-copy"></i>';

  copyButton.addEventListener('click', () => {
    if (type === 'text') {
      clipboard.writeText(data);
    } else if (type === 'image') {
      const image = nativeImage.createFromDataURL(data);
      clipboard.writeImage(image);
    }
    // Provide visual feedback (optional)
    copyButton.innerHTML = '<i class="fas fa-check"></i>';
    setTimeout(() => {
      copyButton.innerHTML = '<i class="fas fa-copy"></i>';
    }, 1000);
  });

  // Create a delete button
  const deleteButton = document.createElement('button');
  deleteButton.className = 'delete-clipboard';
  deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';

  deleteButton.addEventListener('click', () => {
    // Remove from clipboardHistory array using the id
    const index = clipboardHistory.findIndex((entry) => entry.id === id);
    if (index !== -1) {
      // If it's an image, delete the image file
      if (clipboardHistory[index].type === 'image') {
        const imageFileName = clipboardHistory[index].data;
        const imagePath = path.join(path.dirname(getDataPath()), imageFileName);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }
      clipboardHistory.splice(index, 1);
    }
    // Remove from the DOM
    listItem.remove();
    saveClipboardHistory();
  });

  // Append elements to the list item
  listItem.appendChild(contentDiv);
  listItem.appendChild(copyButton);
  listItem.appendChild(deleteButton);

  // Add the list item to the clipboard list
  clipboardList.insertBefore(listItem, clipboardList.firstChild);

  if (save) {
    saveClipboardHistory();
  }
}

// Handle minimize button
const minimizeButton = document.getElementById('minimize-button');
minimizeButton.addEventListener('click', () => {
  ipcRenderer.send('minimize-window', 'clipboard');
});

// Handle project changes
ipcRenderer.on('active-project', (event, newProject) => {
  activeProject = newProject;
  // Clear current data
  clipboardHistory = [];
  deletedItems = new Set();
  clipboardList.innerHTML = '';
  // Load data for the new project
  loadClipboardHistory();
});

// Initial load
ipcRenderer.on('active-project', (event, newProject) => {
  activeProject = newProject;
  loadClipboardHistory();
});
