export default class Server {

  public name: string;
  public ip: string;
  public weight: number;

  constructor(name: string, ip: string, weight: number) {
    this.name = name;
    this.ip = ip;
    if (!this.name) this.name = this.ip;
    this.weight = weight;
  }
}
