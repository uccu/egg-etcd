export class Server {

  public name: string;
  public ip: string;
  public weight: number;
  public protocol: string;

  constructor(opts: { name?: string; ip: string; weight?: number; protocol?: string }) {
    this.ip = opts.ip;
    this.weight = opts.weight ?? 1;
    this.name = opts.name ?? opts.ip;
    this.protocol = opts.protocol ?? 'no';
  }
}


export function newServer(opts: Server | { name?: string; ip: string; weight?: number; protocol?: string }): Server {
  if (opts instanceof Server) {
    return opts;
  }
  return new Server(opts);
}
