import { EggApplication } from "egg";
import Server from "./server"


export const groups: { [key: string]: Group } = {}

export function getGroup(app: EggApplication, name: string) {
    if (groups[name]) {
        return groups[name];
    }
    return new Group(app, name);
}

export default class Group {

    public name: string
    public app: EggApplication
    private p = 0;
    private queue: number[] = [];

    private serverList: Server[] = []

    constructor(app: EggApplication, name: string) {
        this.app = app
        this.name = name
        groups[this.name] = this
    }

    setQueue() {
        const queue: number[] = []
        for (let i = 0; i < this.serverList.length; i++) {
            for (let j = 0; j < this.serverList[i].weight; j++) {
                queue.push(i)
            }
        }
        this.queue = queue.sort(() => Math.random() - 0.5)
    }

    add(server: Server) {
        for (const i in this.serverList) {
            if (this.serverList[i].ip === server.ip) {
                this.serverList[i] = server
                this.setQueue()
                this.sendToApp('add', server)
                return
            }
        }
        this.serverList.push(server)
        this.setQueue()
        this.sendToApp('add', server)
    }

    remove(server: string | Server) {

        let ip: string
        if (server instanceof Server) {
            ip = server.ip
        } else {
            ip = server
        }

        for (let i = 0; i < this.serverList.length; i++) {
            if (this.serverList[i].ip === ip) {
                const server = this.serverList[i]
                this.serverList = this
                    .serverList.slice(0, i)
                    .concat(...this.serverList.slice(i + 1))
                this.setQueue()
                this.sendToApp('remove', server)
                return true
            }
        }
        return false
    }

    _movePoint() {
        this.p++
        if (this.queue.length <= this.p) {
            this.p = 0
        }
    }

    next() {
        if (this.queue.length == 0) return null
        return this._movePoint(), this.serverList[this.queue[this.p]] || this.next()
    }

    sendToApp(type: string, server: Server) {

        if (this.app.options.type === 'agent') {
            this.app.messenger.sendToApp('discovery', { name: this.name, type, server })
        }
    }

}