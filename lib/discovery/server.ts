export default class Server {

  public name: string;
  public ip: string;
  public weight: number;
  public protocol: string;

  constructor(name: string, ip: string, weight: number, protocol:string) {
    this.name = name;
    this.ip = ip;
    this.protocol = protocol;
    if (!this.name) this.name = this.ip;
    this.weight = weight;
  }
}
