const { app, BrowserWindow } = require('electron')
const path = require('path')

/**
 * Adjunta los atajos de teclado de recarga a una ventana.
 * F5 y Ctrl+R recargan la ventana sin necesidad de menú visible.
 *
 * @param {BrowserWindow} win
 */
function attachReload(win) {
  win.webContents.on('before-input-event', (event, input) => {
    const isReload =
      input.type === 'keyDown' &&
      (input.key === 'F5' || (input.control && input.key === 'r'))
    if (isReload) {
      win.webContents.reload()
      event.preventDefault()
    }
  })
}

/**
 * Crea la ventana principal del Editor.
 * La ventana del Proyector se abre desde el renderer via window.open()
 * y es interceptada por setWindowOpenHandler para configurarla correctamente.
 */
function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    autoHideMenuBar: true,   // oculta la barra de menú (Alt para mostrar)
    title: 'Proyector MQV — Editor',
    webPreferences: {
      nodeIntegration: false,  // no exponer Node.js al renderer (seguridad)
      contextIsolation: true,  // aísla el contexto del renderer
    },
  })

  // Cargar el build de Vite (dist/index.html con rutas relativas por base: './')
  win.loadFile(path.join(__dirname, '../dist/index.html'))

  // F5 o Ctrl+R recargan la ventana del editor
  attachReload(win)

  /**
   * Permitir que el renderer abra la ventana del Proyector con window.open().
   * Sin esto, Electron bloquea todas las ventanas abiertas desde el renderer.
   * La URL que llega es: file:///...dist/index.html#/projector/ID?bare=1
   */
  win.webContents.setWindowOpenHandler(() => {
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        width: 1280,
        height: 720,
        autoHideMenuBar: true,
        title: 'Proyector MQV',
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      },
    }
  })

  // F5 o Ctrl+R también recargan la ventana del proyector cuando se crea
  win.webContents.on('did-create-window', (childWin) => {
    attachReload(childWin)
  })
}

app.whenReady().then(createWindow)

// En Windows/Linux cerrar todas las ventanas termina la app
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
