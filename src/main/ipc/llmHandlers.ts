import { BrowserWindow, ipcMain, IpcMainEvent } from "electron";
import { fetchCompletions, ModelConfig, ModelMessages } from "../llm/client";



let currentController: AbortController | null = null;




export function registerLlmHandlers(mainWindow: BrowserWindow) {
    ipcMain.on('send-message', (event, args) => {
        handleSendMessage(mainWindow, args)
    });
    ipcMain.on('abort-stream', (event, args) => {
        handleAbortStream(args)
    })
}



async function handleSendMessage(mainWindow: BrowserWindow, args: { conversationId?: string, messages: ModelMessages, modelConfig: ModelConfig }) {
    let { messages, modelConfig } = args;
    if (currentController !== null) {
        currentController.abort();
    }
    currentController = new AbortController();
    const events = fetchCompletions(messages, modelConfig, currentController.signal);
    for await (let event of events) {
        if (!mainWindow.isDestroyed())
            mainWindow.webContents.send('on-streamEvent', event)
    }

    currentController = null;
}

function handleAbortStream(conversationId?: string) {
    currentController?.abort();
}