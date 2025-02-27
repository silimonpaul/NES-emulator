// Initialize audio
let audioHandler = new AudioHandler();
let nes = new Nes();
let renderer;
let loaded = false;
let loopId = 0;
let loadedName = "";
let gamepads = {};
let gamepadPolling;

let c = el("output");
c.width = 256;
c.height = 240;
let ctx = c.getContext("2d");
let imgData = ctx.createImageData(256, 240);

// Initialize WebGL renderer
let useCanvas = false;
try {
  const testCanvas = document.createElement("canvas");
  const testGL =
    testCanvas.getContext("webgl2") ||
    testCanvas.getContext("webgl") ||
    testCanvas.getContext("experimental-webgl");

  if (!testGL) {
    throw new Error("WebGL not supported by your browser");
  }

  // Try different texture formats in order of preference
  const textureFormats = [
    "OES_texture_float",
    "OES_texture_half_float",
    "WEBGL_color_buffer_float",
  ];
  let formatFound = false;

  for (const format of textureFormats) {
    if (testGL.getExtension(format)) {
      formatFound = true;
      log(`Using ${format} for rendering`);
      break;
    }
  }

  if (!formatFound) {
    log("Using standard texture format - performance may vary");
  }

  renderer = new WebGLRenderer(c);
  log("WebGL initialization successful - using hardware acceleration");
} catch (e) {
  console.log("WebGL initialization failed:", e.message);
  log("Using software rendering - for better performance, try:");
  log("1. Enable hardware acceleration in browser settings");
  log("2. Update your graphics drivers");
  log("3. Try using Chrome or Firefox");
  useCanvas = true;
}

// Update the runFrame function for better canvas performance
function runFrame() {
  try {
    nes.runFrame();
    nes.getSamples(audioHandler.sampleBuffer, audioHandler.samplesPerFrame);
    audioHandler.nextBuffer();

    nes.getPixels(imgData.data);
    if (useCanvas) {
      // Optimize canvas rendering
      ctx.imageSmoothingEnabled = false;
      ctx.mozImageSmoothingEnabled = false;
      ctx.webkitImageSmoothingEnabled = false;
      ctx.msImageSmoothingEnabled = false;
      ctx.putImageData(imgData, 0, 0);
    } else {
      renderer.render(imgData.data);
    }
  } catch (error) {
    log("Error running frame: " + error.message);
  }
}

// Control mappings
let controlsP1 = {
  arrowright: nes.INPUT.RIGHT,
  arrowleft: nes.INPUT.LEFT,
  arrowdown: nes.INPUT.DOWN,
  arrowup: nes.INPUT.UP,
  enter: nes.INPUT.START,
  shift: nes.INPUT.SELECT,
  z: nes.INPUT.B,
  x: nes.INPUT.A,
};

let controlsP2 = {
  l: nes.INPUT.RIGHT,
  j: nes.INPUT.LEFT,
  k: nes.INPUT.DOWN,
  i: nes.INPUT.UP,
  p: nes.INPUT.START,
  o: nes.INPUT.SELECT,
  t: nes.INPUT.B,
  g: nes.INPUT.A,
};

function saveKeyBindings() {
  localStorage.setItem("controlsP1", JSON.stringify(controlsP1));
  localStorage.setItem("controlsP2", JSON.stringify(controlsP2));
}

function loadKeyBindings() {
  const savedP1 = localStorage.getItem("controlsP1");
  const savedP2 = localStorage.getItem("controlsP2");
  if (savedP1) controlsP1 = JSON.parse(savedP1);
  if (savedP2) controlsP2 = JSON.parse(savedP2);
  updateBindingButtons();
}

function initGamepadSupport() {
  window.addEventListener("gamepadconnected", (e) => {
    gamepads[e.gamepad.index] = e.gamepad;
    log("Gamepad connected: " + e.gamepad.id);
  });

  window.addEventListener("gamepaddisconnected", (e) => {
    delete gamepads[e.gamepad.index];
    log("Gamepad disconnected");
  });

  gamepadPolling = setInterval(pollGamepads, 16);
}

function pollGamepads() {
  if (!loaded) return;

  const pads = navigator.getGamepads();
  for (const pad of pads) {
    if (!pad) continue;

    // Player 1 - First connected gamepad
    if (pad.index === 0) {
      // D-pad
      nes.setButtonPressed(1, nes.INPUT.UP, pad.buttons[12].pressed);
      nes.setButtonPressed(1, nes.INPUT.DOWN, pad.buttons[13].pressed);
      nes.setButtonPressed(1, nes.INPUT.LEFT, pad.buttons[14].pressed);
      nes.setButtonPressed(1, nes.INPUT.RIGHT, pad.buttons[15].pressed);

      // Face buttons
      nes.setButtonPressed(1, nes.INPUT.B, pad.buttons[0].pressed);
      nes.setButtonPressed(1, nes.INPUT.A, pad.buttons[1].pressed);
      nes.setButtonPressed(1, nes.INPUT.SELECT, pad.buttons[8].pressed);
      nes.setButtonPressed(1, nes.INPUT.START, pad.buttons[9].pressed);

      // Release buttons when not pressed
      if (!pad.buttons[12].pressed) nes.setButtonReleased(1, nes.INPUT.UP);
      if (!pad.buttons[13].pressed) nes.setButtonReleased(1, nes.INPUT.DOWN);
      if (!pad.buttons[14].pressed) nes.setButtonReleased(1, nes.INPUT.LEFT);
      if (!pad.buttons[15].pressed) nes.setButtonReleased(1, nes.INPUT.RIGHT);
      if (!pad.buttons[0].pressed) nes.setButtonReleased(1, nes.INPUT.B);
      if (!pad.buttons[1].pressed) nes.setButtonReleased(1, nes.INPUT.A);
      if (!pad.buttons[8].pressed) nes.setButtonReleased(1, nes.INPUT.SELECT);
      if (!pad.buttons[9].pressed) nes.setButtonReleased(1, nes.INPUT.START);
    }

    // Player 2 - Second connected gamepad
    if (pad.index === 1) {
      nes.setButtonPressed(2, nes.INPUT.UP, pad.buttons[12].pressed);
      nes.setButtonPressed(2, nes.INPUT.DOWN, pad.buttons[13].pressed);
      nes.setButtonPressed(2, nes.INPUT.LEFT, pad.buttons[14].pressed);
      nes.setButtonPressed(2, nes.INPUT.RIGHT, pad.buttons[15].pressed);

      nes.setButtonPressed(2, nes.INPUT.B, pad.buttons[0].pressed);
      nes.setButtonPressed(2, nes.INPUT.A, pad.buttons[1].pressed);
      nes.setButtonPressed(2, nes.INPUT.SELECT, pad.buttons[8].pressed);
      nes.setButtonPressed(2, nes.INPUT.START, pad.buttons[9].pressed);

      // Release buttons when not pressed
      if (!pad.buttons[12].pressed) nes.setButtonReleased(2, nes.INPUT.UP);
      if (!pad.buttons[13].pressed) nes.setButtonReleased(2, nes.INPUT.DOWN);
      if (!pad.buttons[14].pressed) nes.setButtonReleased(2, nes.INPUT.LEFT);
      if (!pad.buttons[15].pressed) nes.setButtonReleased(2, nes.INPUT.RIGHT);
      if (!pad.buttons[0].pressed) nes.setButtonReleased(2, nes.INPUT.B);
      if (!pad.buttons[1].pressed) nes.setButtonReleased(2, nes.INPUT.A);
      if (!pad.buttons[8].pressed) nes.setButtonReleased(2, nes.INPUT.SELECT);
      if (!pad.buttons[9].pressed) nes.setButtonReleased(2, nes.INPUT.START);
    }
  }
}

zip.workerScriptsPath = "lib/";
zip.useWebWorkers = true;

function showSaveIndicator(message) {
  const indicator = el("saveIndicator");
  indicator.textContent = message;
  indicator.style.opacity = "0";
  indicator.style.display = "block";

  setTimeout(() => {
    indicator.style.opacity = "1";
    indicator.style.transition = "opacity 0.3s ease-in";
  }, 50);

  setTimeout(() => {
    indicator.style.opacity = "0";
    indicator.style.transition = "opacity 0.3s ease-out";
  }, 1700);

  setTimeout(() => {
    indicator.style.display = "none";
  }, 2000);
}

el("rom").onchange = async function (e) {
  try {
    await audioHandler.resume();
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function () {
      const buf = reader.result;
      const name = file.name;

      if (name.toLowerCase().endsWith(".zip")) {
        handleZipFile(buf);
      } else if (name.toLowerCase().endsWith(".nes")) {
        loadRom(new Uint8Array(buf), name);
      } else {
        throw new Error("Unsupported file format");
      }
    };
    reader.readAsArrayBuffer(file);
  } catch (error) {
    log("Error loading ROM: " + error.message);
  }
};

el("fullscreen").onclick = function () {
  const canvas = el("output");
  if (!document.fullscreenElement) {
    canvas
      .requestFullscreen()
      .then(() => {
        canvas.style.width = "100vw";
        canvas.style.height = "100vh";
        canvas.style.objectFit = "fill";
        canvas.style.margin = "0";
        canvas.style.padding = "0";
        canvas.style.backgroundColor = "black";
        document.body.style.margin = "0";
        document.body.style.overflow = "hidden";
      })
      .catch((err) => {
        log("Error attempting to enable fullscreen: " + err.message);
      });
  }
};

// Handle fullscreen exit
document.addEventListener("fullscreenchange", function () {
  const canvas = el("output");
  if (!document.fullscreenElement) {
    canvas.style.width = "800px";
    canvas.style.height = "640px";
    canvas.style.objectFit = "contain";
    canvas.style.margin = "";
    canvas.style.backgroundColor = "";
    document.body.style.margin = "";
    document.body.style.overflow = "";
    if (renderer) {
      renderer.resize();
    }
  }
});

el("toggleLog").onclick = function () {
  const log = el("log");
  log.style.display = log.style.display === "none" ? "block" : "none";
};

el("configControls").onclick = function () {
  el("controlsModal").style.display = "block";
  updateBindingButtons();
};

el("closeModal").onclick = function () {
  el("controlsModal").style.display = "none";
};

el("saveState").onclick = function () {
  if (loaded) {
    let saveState = nes.getState();
    try {
      localStorage.setItem(
        loadedName + "_savestate",
        JSON.stringify(saveState)
      );
      showSaveIndicator("Game State Saved!");
    } catch (e) {
      log("Failed to save state: " + e);
    }
  }
};

el("loadState").onclick = function () {
  if (loaded) {
    let data = localStorage.getItem(loadedName + "_savestate");
    if (data) {
      let obj = JSON.parse(data);
      if (nes.setState(obj)) {
        showSaveIndicator("Game State Loaded!");
      } else {
        log("Failed to load state");
      }
    } else {
      log("No saved state found");
    }
  }
};

window.onpagehide = function (e) {
  saveBatteryForRom();
};

function loadRom(rom, name) {
  try {
    saveBatteryForRom();
    if (!nes.loadRom(rom)) {
      throw new Error("Failed to load ROM");
    }

    const batteryData = localStorage.getItem(name + "_battery");
    if (batteryData) {
      try {
        const obj = JSON.parse(batteryData);
        nes.setBattery(obj);
        log("Loaded battery data");
      } catch (e) {
        log("Error loading battery data: " + e.message);
      }
    }

    nes.reset(true);
    if (!loaded) {
      lastFrameTime = performance.now();
      loopId = requestAnimationFrame(update);
      audioHandler
        .resume()
        .then(() => audioHandler.setVolume(0.5))
        .catch((e) => log("Audio resume error: " + e.message));
    }

    loaded = true;
    loadedName = name;
    log("ROM loaded successfully: " + name);
  } catch (error) {
    log("Error in loadRom: " + error.message);
  }
}

function saveBatteryForRom() {
  if (loaded) {
    let data = nes.getBattery();
    if (data) {
      try {
        localStorage.setItem(loadedName + "_battery", JSON.stringify(data));
        log("Saved battery");
      } catch (e) {
        log("Failed to save battery: " + e);
      }
    }
  }
}

function handleZipFile(buf) {
  let blob = new Blob([buf]);
  zip.createReader(
    new zip.BlobReader(blob),
    function (reader) {
      reader.getEntries(function (entries) {
        if (entries.length) {
          let found = false;
          for (let i = 0; i < entries.length; i++) {
            let name = entries[i].filename;
            if (!name.toLowerCase().endsWith(".nes")) continue;
            found = true;
            log('Loading "' + name + '" from zip');
            entries[i].getData(
              new zip.BlobWriter(),
              function (blob) {
                let breader = new FileReader();
                breader.onload = function () {
                  let rbuf = breader.result;
                  let arr = new Uint8Array(rbuf);
                  loadRom(arr, name);
                  reader.close(function () {});
                };
                breader.readAsArrayBuffer(blob);
              },
              function (curr, total) {
                log("Loading ROM: " + Math.round((curr / total) * 100) + "%");
              }
            );
            break;
          }
          if (!found) log("No .nes file found in zip");
        } else {
          log("Zip file was empty");
        }
      });
    },
    function (err) {
      log("Failed to read zip: " + err);
    }
  );
}

function update(currentTime) {
  const elapsed = currentTime - lastFrameTime;
  if (elapsed > fpsInterval) {
    lastFrameTime = currentTime - (elapsed % fpsInterval);
    runFrame();
    updateFPS();
  }
  loopId = requestAnimationFrame(update);
}

function updateFPS() {
  const now = performance.now();
  const delta = now - lastFpsUpdate;

  if (delta >= 1000) {
    const currentFps = Math.round((frameCount * 1000) / delta);
    frameCount = 0;
    lastFpsUpdate = now;

    if (currentFps < 58) {
      fpsInterval = Math.max(1000 / 65, fpsInterval - 0.1);
    } else if (currentFps > 62) {
      fpsInterval = Math.min(1000 / 55, fpsInterval + 0.1);
    }
  }
  frameCount++;
}

function updateBindingButtons() {
  document.querySelectorAll(".bind-key").forEach((button) => {
    const player = button.dataset.player;
    const control = button.dataset.control;
    const controls = player === "1" ? controlsP1 : controlsP2;
    const key = Object.keys(controls).find(
      (k) => controls[k] === nes.INPUT[control]
    );
    button.textContent = key ? key.toUpperCase() : "NONE";
  });
}

document.querySelectorAll(".bind-key").forEach((button) => {
  button.addEventListener("click", function () {
    const btn = this;
    btn.textContent = "Press a key...";

    const keyHandler = function (e) {
      e.preventDefault();
      const key = e.key.toLowerCase();
      const player = btn.dataset.player;
      const control = btn.dataset.control;
      const controls = player === "1" ? controlsP1 : controlsP2;

      Object.keys(controls).forEach((k) => {
        if (controls[k] === nes.INPUT[control]) {
          delete controls[k];
        }
      });

      controls[key] = nes.INPUT[control];
      btn.textContent = key.toUpperCase();
      saveKeyBindings();

      document.removeEventListener("keydown", keyHandler);
    };

    document.addEventListener("keydown", keyHandler, { once: true });
  });
});

window.onkeydown = function (e) {
  if (controlsP1[e.key.toLowerCase()] !== undefined) {
    nes.setButtonPressed(1, controlsP1[e.key.toLowerCase()]);
    e.preventDefault();
  }
  if (controlsP2[e.key.toLowerCase()] !== undefined) {
    nes.setButtonPressed(2, controlsP2[e.key.toLowerCase()]);
    e.preventDefault();
  }
};

window.onkeyup = function (e) {
  if (controlsP1[e.key.toLowerCase()] !== undefined) {
    nes.setButtonReleased(1, controlsP1[e.key.toLowerCase()]);
    e.preventDefault();
  }
  if (controlsP2[e.key.toLowerCase()] !== undefined) {
    nes.setButtonReleased(2, controlsP2[e.key.toLowerCase()]);
    e.preventDefault();
  }
};

function log(text) {
  el("log").innerHTML += text + "<br>";
  el("log").scrollTop = el("log").scrollHeight;
}

function el(id) {
  return document.getElementById(id);
}

let fps = 60;
let fpsInterval = 1000 / fps;
let lastFrameTime = performance.now();
let frameCount = 0;
let lastFpsUpdate = performance.now();

loadKeyBindings();
initGamepadSupport();
