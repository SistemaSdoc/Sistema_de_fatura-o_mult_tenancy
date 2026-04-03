declare module "qz-tray" {
  const qz: QZ;
  export default qz;
}

declare namespace QZ {
  // =========================
  // SECURITY
  // =========================
  namespace security {
    function setCertificatePromise(callback: () => Promise<string>): void;

    function setSignaturePromise(
      callback: (toSign: string) => Promise<string>
    ): void;
  }

  // =========================
  // WEBSOCKET
  // =========================
  namespace websocket {
    function connect(options?: {
      retries?: number;
      delay?: number;
    }): Promise<void>;

    function disconnect(): void;
  }

  // =========================
  // PRINTERS
  // =========================
  namespace printers {
    function find(): Promise<string[]>;
  }

  // =========================
  // CONFIGS
  // =========================
  namespace configs {
    function create(printer: string, options?: any): any;
  }

  // =========================
  // PRINT
  // =========================
  function print(config: any, data: any[]): Promise<void>;
}