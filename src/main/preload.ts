// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
// console.log('Preload script loaded');
import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";
import { StreamEvent } from "@/shared/streamEvents";
import { CallConfig, ModelMessages } from "@/shared/types";
contextBridge.exposeInMainWorld('electronAPI', {
    sendMessage: (modelConfig: CallConfig, messages: ModelMessages, conversationId?: string) => {
        ipcRenderer.send('send-message', {
            modelConfig,
            messages,
            conversationId
        })
    },
    onStreamEvent: (callback: (event: StreamEvent) => void) => {
        const listener = (ipcEvent: IpcRendererEvent, data: StreamEvent) => {
            callback(data)
        }
        ipcRenderer.on('on-streamEvent', listener)

        return () => { ipcRenderer.removeListener('on-streamEvent', listener) }
    },
    abortStream: () => {
        ipcRenderer.send('abort-stream')
    }
})