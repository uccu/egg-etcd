export default class Server {

    public ip: string
    public weight: number

    constructor(ip: string, weight: number) {
        this.ip = ip
        this.weight = weight
    }
}